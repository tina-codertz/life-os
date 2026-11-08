import { Injectable } from '@nestjs/common';
import {
  addDays,
  type CreateHabitInput,
  HABIT_BACKFILL_DAYS,
  type HabitCheckInInput,
  type HabitSchedule as ScheduleInput,
  localToday,
  MAX_HABITS,
  type PublicHabit,
  type PublicHabitCompletion,
  type UpdateHabitInput,
} from '@life-os/shared';
import { fromDbDate, toDbDate } from '../../common/dates.js';
import type { HabitCompletion, Prisma } from '../../generated/prisma/client.js';
import { isUniqueViolation } from '../../prisma/prisma-errors.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CheckInOutOfRangeError,
  type CheckInProblem,
  HabitLimitError,
  HabitNotFoundError,
} from './habit.errors.js';
import { type HabitWithSchedules, toPublicCompletion, toPublicHabit } from './public-habit.js';

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
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, archived: boolean): Promise<PublicHabit[]> {
    const today = await this.today(userId);
    const habits = await this.prisma.habit.findMany({
      where: { userId, deletedAt: null, archivedAt: archived ? { not: null } : null },
      include: withSchedules,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const todays = await this.prisma.habitCompletion.findMany({
      where: { userId, localDate: toDbDate(today), habitId: { in: habits.map((h) => h.id) } },
    });
    const byHabit = new Map(todays.map((c) => [c.habitId, c]));
    return habits.map((h) => toPublicHabit(h, today, byHabit.get(h.id)));
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
  async checkIn(
    userId: string,
    id: string,
    input: HabitCheckInInput,
  ): Promise<PublicHabitCompletion> {
    const habit = await this.findActive(userId, id);
    await this.assertCanChange(userId, habit, input.localDate);
    const key = { habitId: habit.id, localDate: toDbDate(input.localDate) };
    const count = input.count ?? habit.targetCount;
    const upsert = () =>
      this.prisma.habitCompletion.upsert({
        where: { habitId_localDate: key },
        create: { ...key, userId, count },
        update: { count },
      });
    let completion: HabitCompletion;
    try {
      completion = await upsert();
    } catch (err) {
      // Two check-ins for the same new day at once: the second insert hits the unique index;
      // by now the row exists, so doing it again updates it.
      if (!isUniqueViolation(err, 'HabitCompletion', 'localDate')) throw err;
      completion = await upsert();
    }
    return toPublicCompletion(completion);
  }

  // Undo a check-in (same day range as checking in). Undoing a day with none is fine.
  async undoCheckIn(userId: string, id: string, localDate: string): Promise<void> {
    const habit = await this.findActive(userId, id);
    await this.assertCanChange(userId, habit, localDate);
    await this.prisma.habitCompletion.deleteMany({
      where: { habitId: habit.id, localDate: toDbDate(localDate) },
    });
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
    const today = await this.today(userId);
    const todays = await this.prisma.habitCompletion.findUnique({
      where: { habitId_localDate: { habitId: habit.id, localDate: toDbDate(today) } },
    });
    return toPublicHabit(habit, today, todays ?? undefined);
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
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    return localToday(settings?.timezone ?? 'UTC');
  }
}
