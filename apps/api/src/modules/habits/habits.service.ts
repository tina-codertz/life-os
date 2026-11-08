import { Injectable } from '@nestjs/common';
import {
  addDays,
  computeStreaks,
  type CreateHabitInput,
  dayState,
  type HabitCheckInResult,
  type HabitDay,
  type HabitDaysQuery,
  type HabitStreak,
  HABIT_BACKFILL_DAYS,
  type HabitCheckInInput,
  type HabitSchedule as ScheduleInput,
  localToday,
  MAX_HABITS,
  type PublicHabit,
  type UpdateHabitInput,
} from '@life-os/shared';
import { fromDbDate, toDbDate } from '../../common/dates.js';
import type { HabitCompletion, Prisma } from '../../generated/prisma/client.js';
import { isUniqueViolation } from '../../prisma/prisma-errors.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { XpService } from '../progress/xp.service.js';
import {
  CheckInOutOfRangeError,
  type CheckInProblem,
  HabitLimitError,
  HabitNotFoundError,
} from './habit.errors.js';
import {
  type HabitWithSchedules,
  toPublicCompletion,
  toPublicHabit,
  toScheduleVersions,
} from './public-habit.js';

interface UserDay {
  today: string;
  weekStartsOn: number;
}

const withSchedules = { schedules: true } as const;

function scheduleData(schedule: ScheduleInput) {
  return {
    frequency: schedule.frequency,
    weekdays: schedule.frequency === 'WEEKLY_DAYS' ? schedule.weekdays : [],
    timesPerWeek: schedule.frequency === 'TIMES_PER_WEEK' ? schedule.timesPerWeek : null,
  };
}

// Habits I (FR-HAB-001/002/007/009). Every query is scoped by the token's userId and skips
// soft-deleted habits. "Today" is the user's own day (their saved time zone, ADR-006).
@Injectable()
export class HabitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xp: XpService,
  ) {}

  async list(userId: string, archived: boolean): Promise<PublicHabit[]> {
    const day = await this.userDay(userId);
    const habits = await this.prisma.habit.findMany({
      where: { userId, deletedAt: null, archivedAt: archived ? { not: null } : null },
      include: withSchedules,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    // Every check-in of these habits, once, for their streaks and today's state.
    const completions = await this.prisma.habitCompletion.findMany({
      where: { userId, habitId: { in: habits.map((h) => h.id) } },
    });
    const byHabit = new Map<string, HabitCompletion[]>();
    for (const c of completions) {
      const list = byHabit.get(c.habitId);
      if (list) list.push(c);
      else byHabit.set(c.habitId, [c]);
    }
    return habits.map((h) => this.toPublic(h, byHabit.get(h.id) ?? [], day));
  }

  async get(userId: string, id: string): Promise<PublicHabit> {
    return this.present(userId, await this.findActive(userId, id));
  }

  async create(userId: string, input: CreateHabitInput): Promise<PublicHabit> {
    const existing = await this.prisma.habit.count({ where: { userId, deletedAt: null } });
    if (existing >= MAX_HABITS) throw new HabitLimitError();
    const startDate = input.startDate ?? (await this.today(userId));
    const habit = await this.prisma.habit.create({
      data: {
        userId,
        name: input.name,
        icon: input.icon ?? null,
        color: input.color,
        targetCount: input.targetCount ?? 1,
        unit: input.unit || null,
        startDate: toDbDate(startDate),
        sortOrder: existing,
        schedules: {
          create: { ...scheduleData(input.schedule), effectiveFrom: toDbDate(startDate) },
        },
      },
      include: withSchedules,
    });
    return this.present(userId, habit);
  }

  // A new schedule applies from today (or the start date, if that's later): earlier days keep
  // the rule they had (FR-HAB rule 7). Two changes on one day: the later one wins.
  async update(userId: string, id: string, input: UpdateHabitInput): Promise<PublicHabit> {
    const habit = await this.findActive(userId, id);
    const data: Prisma.HabitUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.icon !== undefined) data.icon = input.icon;
    if (input.color !== undefined) data.color = input.color;
    if (input.targetCount !== undefined) data.targetCount = input.targetCount;
    if (input.unit !== undefined) data.unit = input.unit || null;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

    if (input.schedule) {
      const today = await this.today(userId);
      const start = fromDbDate(habit.startDate);
      const from = toDbDate(today > start ? today : start);
      const values = scheduleData(input.schedule);
      await this.prisma.habitSchedule.upsert({
        where: { habitId_effectiveFrom: { habitId: habit.id, effectiveFrom: from } },
        create: { habitId: habit.id, effectiveFrom: from, ...values },
        update: values,
      });
    }
    const updated = await this.prisma.habit.update({
      where: { id: habit.id },
      data,
      include: withSchedules,
    });
    return this.present(userId, updated);
  }

  // FR-HAB-007: archived habits keep their history and leave the main list.
  async setArchived(userId: string, id: string, archived: boolean): Promise<PublicHabit> {
    const habit = await this.findActive(userId, id);
    const updated = await this.prisma.habit.update({
      where: { id: habit.id },
      data: { archivedAt: archived ? (habit.archivedAt ?? new Date()) : null },
      include: withSchedules,
    });
    return this.present(userId, updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const habit = await this.findActive(userId, id);
    await this.prisma.habit.update({ where: { id: habit.id }, data: { deletedAt: new Date() } });
  }

  // FR-HAB-002: check in for today or up to 7 days back. Safe to repeat: a day has one
  // check-in, and sending it again sets its count. No count means "done" (the full target).
  async checkIn(userId: string, id: string, input: HabitCheckInInput): Promise<HabitCheckInResult> {
    const habit = await this.findActive(userId, id);
    await this.assertCanChange(userId, habit, input.localDate);
    const key = { habitId: habit.id, localDate: toDbDate(input.localDate) };
    const count = input.count ?? habit.targetCount;
    const xpKey = `${habit.id}:${input.localDate}`;
    // The check-in and its XP together: +5 once the day's count reaches the target, taken back
    // if a later check-in lowers it below.
    const save = () =>
      this.prisma.$transaction(async (tx) => {
        const saved = await tx.habitCompletion.upsert({
          where: { habitId_localDate: key },
          create: { ...key, userId, count },
          update: { count },
        });
        if (count >= habit.targetCount) await this.xp.award(tx, userId, 'HABIT', xpKey);
        else await this.xp.revoke(tx, userId, 'HABIT', xpKey);
        return saved;
      });
    let completion: HabitCompletion;
    try {
      completion = await save();
    } catch (err) {
      // Two check-ins for the same new day at once: the second insert hits the unique index
      // (and its transaction is rolled back); by now the row exists, so again updates it.
      if (!isUniqueViolation(err, 'HabitCompletion', 'localDate')) throw err;
      completion = await save();
    }
    return {
      completion: toPublicCompletion(completion),
      streak: await this.streakOf(userId, habit),
    };
  }

  // Undo a check-in (same day range as checking in). Undoing a day with none is fine.
  async undoCheckIn(userId: string, id: string, localDate: string): Promise<HabitCheckInResult> {
    const habit = await this.findActive(userId, id);
    await this.assertCanChange(userId, habit, localDate);
    await this.prisma.$transaction(async (tx) => {
      await tx.habitCompletion.deleteMany({
        where: { habitId: habit.id, localDate: toDbDate(localDate) },
      });
      await this.xp.revoke(tx, userId, 'HABIT', `${habit.id}:${localDate}`);
    });
    return { completion: null, streak: await this.streakOf(userId, habit) };
  }

  // Each day's state from `from` to `to` (the quest path, the calendar).
  async days(userId: string, id: string, query: HabitDaysQuery): Promise<HabitDay[]> {
    const habit = await this.findActive(userId, id);
    const day = await this.userDay(userId);
    const completions = await this.prisma.habitCompletion.findMany({
      where: {
        habitId: habit.id,
        localDate: { gte: toDbDate(query.from), lte: toDbDate(query.to) },
      },
    });
    const input = this.streakInput(habit, completions, day);
    const out: HabitDay[] = [];
    for (let d = query.from; d <= query.to; d = addDays(d, 1)) {
      out.push({ date: d, state: dayState(input, d), count: input.completions.get(d) ?? 0 });
    }
    return out;
  }

  private async assertCanChange(
    userId: string,
    habit: { archivedAt: Date | null; startDate: Date },
    day: string,
  ): Promise<void> {
    const today = await this.today(userId);
    let problem: CheckInProblem | null = null;
    if (habit.archivedAt) problem = 'archived';
    else if (day > today) problem = 'future';
    else if (day < addDays(today, -HABIT_BACKFILL_DAYS)) problem = 'too-old';
    else if (day < fromDbDate(habit.startDate)) problem = 'before-start';
    if (problem) throw new CheckInOutOfRangeError(problem);
  }

  private async present(userId: string, habit: HabitWithSchedules): Promise<PublicHabit> {
    const completions = await this.prisma.habitCompletion.findMany({
      where: { habitId: habit.id },
    });
    return this.toPublic(habit, completions, await this.userDay(userId));
  }

  private toPublic(habit: HabitWithSchedules, completions: HabitCompletion[], day: UserDay) {
    const input = this.streakInput(habit, completions, day);
    const todays = completions.find((c) => fromDbDate(c.localDate) === day.today);
    return toPublicHabit(habit, day.today, todays, computeStreaks(input));
  }

  private async streakOf(userId: string, habit: HabitWithSchedules): Promise<HabitStreak> {
    const completions = await this.prisma.habitCompletion.findMany({
      where: { habitId: habit.id },
    });
    return computeStreaks(this.streakInput(habit, completions, await this.userDay(userId)));
  }

  private streakInput(habit: HabitWithSchedules, completions: HabitCompletion[], day: UserDay) {
    return {
      startDate: fromDbDate(habit.startDate),
      schedules: toScheduleVersions(habit),
      completions: new Map(completions.map((c) => [fromDbDate(c.localDate), c.count])),
      targetCount: habit.targetCount,
      today: day.today,
      weekStartsOn: day.weekStartsOn,
    };
  }

  private async findActive(userId: string, id: string): Promise<HabitWithSchedules> {
    const habit = await this.prisma.habit.findFirst({
      where: { id, userId, deletedAt: null },
      include: withSchedules,
    });
    if (!habit) throw new HabitNotFoundError();
    return habit;
  }

  private async today(userId: string): Promise<string> {
    return (await this.userDay(userId)).today;
  }

  // "Today" and the week start are the user's own (their saved zone and setting).
  private async userDay(userId: string): Promise<UserDay> {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    return {
      today: localToday(settings?.timezone ?? 'UTC'),
      weekStartsOn: settings?.weekStartsOn ?? 1,
    };
  }
}
