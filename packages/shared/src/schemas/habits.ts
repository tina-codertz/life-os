import { z } from 'zod';
import { daysBetween } from '../dates.ts';
import { CATEGORY_COLORS, type CategoryColor } from './categories.ts';
import { localDateSchema } from './tasks.ts';

// FR-HAB-001: how often a habit is due. Weekdays use 0 = Sunday … 6 = Saturday (like the
// user's weekStartsOn setting).
export const HABIT_FREQUENCIES = ['DAILY', 'WEEKLY_DAYS', 'TIMES_PER_WEEK'] as const;
export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];

export const HABIT_NAME_MAX_LENGTH = 80;
export const MAX_HABITS = 50;
export const MAX_HABIT_TARGET = 100;
// FR-HAB-002: a missed check-in can be added for up to this many days back.
export const HABIT_BACKFILL_DAYS = 7;
// The quest path's challenge length ("Day 12 of 21"); the sheet offers these.
export const HABIT_GOAL_DAYS = [7, 21, 30, 66] as const;
const goalDays = z.number().int().min(1).max(365);

const name = z
  .string()
  .trim()
  .min(1, { error: 'Give the habit a name.' })
  .max(HABIT_NAME_MAX_LENGTH, { error: `Use at most ${HABIT_NAME_MAX_LENGTH} characters.` });

// The same palette names as categories (each has a contrast-tested value per theme).
const color = z.enum(CATEGORY_COLORS, { error: 'Choose a colour from the list.' });
const icon = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: 'Unknown icon.' })
  .max(40);

export const habitScheduleSchema = z.discriminatedUnion(
  'frequency',
  [
    z.strictObject({ frequency: z.literal('DAILY') }),
    z.strictObject({
      frequency: z.literal('WEEKLY_DAYS'),
      // At least one day; stored sorted and without repeats.
      weekdays: z
        .array(z.number().int().min(0).max(6))
        .min(1, { error: 'Choose at least one day.' })
        .max(7)
        .refine((days) => new Set(days).size === days.length, { error: 'Each day once.' })
        .transform((days) => [...days].sort((a, b) => a - b)),
    }),
    z.strictObject({
      frequency: z.literal('TIMES_PER_WEEK'),
      timesPerWeek: z
        .number()
        .int()
        .min(1, { error: 'At least once a week.' })
        .max(7, { error: 'At most 7 times a week.' }),
    }),
  ],
  { error: 'Choose daily, some weekdays, or a number of times a week.' },
);
export type HabitSchedule = z.infer<typeof habitScheduleSchema>;

// POST /habits. startDate defaults to today (the user's); before it, nothing is ever "missed".
export const createHabitSchema = z.object({
  name,
  icon: icon.nullable().optional(),
  color,
  // FR-HAB-009: e.g. 8 glasses of water; a day counts once `count` reaches it.
  targetCount: z.number().int().min(1).max(MAX_HABIT_TARGET).optional(),
  unit: z.string().trim().max(20).nullable().optional(),
  goalDays: goalDays.optional(),
  startDate: localDateSchema.optional(),
  schedule: habitScheduleSchema,
});
export type CreateHabitInput = z.infer<typeof createHabitSchema>;

// PATCH /habits/:id: strict, partial. A new schedule applies from today on (FR-HAB rule 7).
export const updateHabitSchema = z.strictObject({
  name: name.optional(),
  icon: icon.nullable().optional(),
  color: color.optional(),
  targetCount: z.number().int().min(1).max(MAX_HABIT_TARGET).optional(),
  unit: z.string().trim().max(20).nullable().optional(),
  goalDays: goalDays.optional(),
  schedule: habitScheduleSchema.optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;

// GET /habits?archived=true to see archived habits instead of the active ones.
export const listHabitsQuerySchema = z.object({
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
export type ListHabitsQuery = z.infer<typeof listHabitsQuerySchema>;

// POST /habits/:id/completions. Safe to repeat for a day: it sets that day's count.
export const habitCheckInSchema = z.object({
  localDate: localDateSchema,
  count: z.number().int().min(1).max(MAX_HABIT_TARGET).optional(),
});
export type HabitCheckInInput = z.infer<typeof habitCheckInSchema>;

// GET /habits/:id/days?from&to: each day's state, for the quest path and the calendar.
export const HABIT_DAYS_MAX = 93;
export const habitDaysQuerySchema = z
  .object({ from: localDateSchema, to: localDateSchema })
  .refine((q) => q.from <= q.to, { path: ['to'], error: 'End on or after the start.' })
  .refine((q) => daysBetween(q.from, q.to) + 1 <= HABIT_DAYS_MAX, {
    path: ['to'],
    error: `Ask for at most ${HABIT_DAYS_MAX} days.`,
  });
export type HabitDaysQuery = z.infer<typeof habitDaysQuerySchema>;

export interface HabitStreak {
  current: number;
  best: number;
  unit: 'days' | 'weeks';
}

export interface HabitDay {
  date: string;
  state: 'done' | 'missed' | 'open' | 'off' | 'today' | 'upcoming' | 'before-start';
  count: number;
}

export interface PublicHabitCompletion {
  localDate: string;
  count: number;
  completedAt: string;
}

export interface PublicHabit {
  id: string;
  name: string;
  icon: string | null;
  color: CategoryColor;
  targetCount: number;
  unit: string | null;
  goalDays: number;
  startDate: string;
  archivedAt: string | null;
  sortOrder: number;
  // The schedule in force today.
  schedule: HabitSchedule;
  // Is today one of its days (always true for DAILY and TIMES_PER_WEEK)?
  dueToday: boolean;
  // Today's check-in, if any (in the user's time zone).
  today: PublicHabitCompletion | null;
  // FR-HAB-003, worked out on the server with the shared streak engine.
  streak: HabitStreak;
  createdAt: string;
  updatedAt: string;
}

// POST /habits/:id/completions and DELETE …/completions/:localDate answer with the new streak.
export interface HabitCheckInResult {
  completion: PublicHabitCompletion | null;
  streak: HabitStreak;
}

export const HABIT_ERROR_CODES = [
  'HABIT_NOT_FOUND',
  'HABIT_LIMIT_REACHED',
  'CHECK_IN_OUT_OF_RANGE',
] as const;
