import {
  CATEGORY_COLORS,
  type CategoryColor,
  HabitSchedule as PublicSchedule,
  PublicHabit,
  PublicHabitCompletion,
} from '@life-os/shared';
import { fromDbDate } from '../../common/dates.js';
import type { Habit, HabitCompletion, HabitSchedule } from '../../generated/prisma/client.js';

// The column holds a palette name; anything else (hand-edited data) shows as grey.
function paletteColor(value: string): CategoryColor {
  return CATEGORY_COLORS.find((c) => c === value) ?? 'gray';
}

export type HabitWithSchedules = Habit & { schedules: HabitSchedule[] };

// The version in force on `day`: the latest that started on or before it. (A habit that starts
// in the future is shown with its first schedule.)
export function scheduleOn(habit: HabitWithSchedules, day: string): HabitSchedule {
  const ordered = habit.schedules.toSorted(
    (a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime(),
  );
  const chosen = ordered.filter((s) => fromDbDate(s.effectiveFrom) <= day).at(-1) ?? ordered[0];
  if (!chosen) throw new Error(`Habit ${habit.id} has no schedule.`);
  return chosen;
}

export function toPublicSchedule(schedule: HabitSchedule): PublicSchedule {
  switch (schedule.frequency) {
    case 'WEEKLY_DAYS':
      return { frequency: 'WEEKLY_DAYS', weekdays: schedule.weekdays };
    case 'TIMES_PER_WEEK':
      return { frequency: 'TIMES_PER_WEEK', timesPerWeek: schedule.timesPerWeek ?? 1 };
    default:
      return { frequency: 'DAILY' };
  }
}

// Is `day` one of the schedule's days? (Any day counts for daily and N-times-a-week habits.)
export function isDueOn(schedule: HabitSchedule, day: string): boolean {
  if (schedule.frequency !== 'WEEKLY_DAYS') return true;
  return schedule.weekdays.includes(new Date(`${day}T00:00:00.000Z`).getUTCDay());
}

export function toPublicCompletion(c: HabitCompletion): PublicHabitCompletion {
  return {
    localDate: fromDbDate(c.localDate),
    count: c.count,
    completedAt: c.completedAt.toISOString(),
  };
}

// Allow-listed fields only: userId and deletedAt never leave the API.
export function toPublicHabit(
  habit: HabitWithSchedules,
  today: string,
  todays: HabitCompletion | undefined,
): PublicHabit {
  const schedule = scheduleOn(habit, today);
  return {
    id: habit.id,
    name: habit.name,
    icon: habit.icon,
    color: paletteColor(habit.color),
    targetCount: habit.targetCount,
    unit: habit.unit,
    startDate: fromDbDate(habit.startDate),
    archivedAt: habit.archivedAt?.toISOString() ?? null,
    sortOrder: habit.sortOrder,
    schedule: toPublicSchedule(schedule),
    dueToday: today >= fromDbDate(habit.startDate) && isDueOn(schedule, today),
    today: todays ? toPublicCompletion(todays) : null,
    createdAt: habit.createdAt.toISOString(),
    updatedAt: habit.updatedAt.toISOString(),
  };
}
