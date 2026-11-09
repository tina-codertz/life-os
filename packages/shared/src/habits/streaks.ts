import { addDays } from '../dates.ts';
import type { HabitFrequency } from '../schemas/habits.ts';

// The streak engine (FR-HAB-003, the edge-case rules in docs/02). A pure function: give it a
// habit's schedule versions, its check-ins and "today", get back each day's state and the
// current and best streaks. The API and the app both use it, so they can't disagree.

export interface ScheduleVersion {
  effectiveFrom: string; // "YYYY-MM-DD"
  frequency: HabitFrequency;
  weekdays: number[]; // WEEKLY_DAYS: 0 = Sunday … 6 = Saturday
  timesPerWeek: number | null; // TIMES_PER_WEEK
}

export interface StreakInput {
  startDate: string;
  schedules: ScheduleVersion[];
  // Check-in count per local day.
  completions: ReadonlyMap<string, number>;
  targetCount: number;
  today: string;
  // For TIMES_PER_WEEK (0 = Sunday … 6 = Saturday; the user's setting).
  weekStartsOn: number;
}

// done: checked in (count reached). missed: a due day that passed without it.
// open: a day of an N-times-a-week habit that wasn't used (never "missed" on its own).
// off: not one of its days. today: due today, not done yet. upcoming: after today.
// before-start: before the habit began (rule 8: never missed).
export type DayState = 'done' | 'missed' | 'open' | 'off' | 'today' | 'upcoming' | 'before-start';

export interface Streaks {
  current: number;
  best: number;
  // What a streak counts: days, or weeks for an N-times-a-week habit (rule 6).
  unit: 'days' | 'weeks';
}

const weekday = (day: string) => new Date(`${day}T00:00:00.000Z`).getUTCDay();
const weekOf = (day: string, weekStartsOn: number) =>
  addDays(day, -((weekday(day) - weekStartsOn + 7) % 7));

// The version in force on `day` (rule 7: a change applies from its day on).
export function ruleOn(schedules: ScheduleVersion[], day: string): ScheduleVersion | undefined {
  let found: ScheduleVersion | undefined;
  for (const s of schedules) {
    if (s.effectiveFrom <= day && (!found || s.effectiveFrom >= found.effectiveFrom)) found = s;
  }
  return found ?? schedules[0];
}

function isDone(input: StreakInput, day: string): boolean {
  return (input.completions.get(day) ?? 0) >= input.targetCount;
}

export function dayState(input: StreakInput, day: string): DayState {
  if (day < input.startDate) return 'before-start';
  if (isDone(input, day)) return 'done';
  if (day > input.today) return 'upcoming';
  const rule = ruleOn(input.schedules, day);
  if (!rule) return 'off';
  if (rule.frequency === 'WEEKLY_DAYS' && !rule.weekdays.includes(weekday(day))) return 'off';
  if (day === input.today) return 'today';
  return rule.frequency === 'TIMES_PER_WEEK' ? 'open' : 'missed';
}

// Each "period" a streak is made of: a due day, or a week for N-times-a-week (rule 6), in
// order. `pending` is the current one if it isn't finished yet: it doesn't break a streak
// until it's over (rule 4).
interface Period {
  ok: boolean;
  pending: boolean;
}

function periods(input: StreakInput): Period[] {
  const out: Period[] = [];
  let week: { key: string; done: number; target: number; days: number } | null = null;
  const closeWeek = (pending: boolean) => {
    if (week)
      out.push({ ok: week.done >= week.target, pending: pending && week.done < week.target });
    week = null;
  };

  for (let day = input.startDate; day <= input.today; day = addDays(day, 1)) {
    const rule = ruleOn(input.schedules, day);
    if (!rule) continue;
    if (rule.frequency === 'TIMES_PER_WEEK') {
      const key = weekOf(day, input.weekStartsOn);
      if (week && week.key !== key) closeWeek(false);
      week ??= { key, done: 0, target: rule.timesPerWeek ?? 1, days: 0 };
      week.days += 1;
      if (isDone(input, day)) week.done += 1;
      continue;
    }
    closeWeek(false);
    if (rule.frequency === 'WEEKLY_DAYS' && !rule.weekdays.includes(weekday(day))) continue;
    const ok = isDone(input, day);
    out.push({ ok, pending: day === input.today && !ok });
  }
  // A week that includes today is still running.
  closeWeek(true);
  return out;
}

export function computeStreaks(input: StreakInput): Streaks {
  const list = periods(input).filter((p) => !p.pending);
  let best = 0;
  let run = 0;
  for (const p of list) {
    run = p.ok ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const rule = ruleOn(input.schedules, input.today);
  return {
    current: run,
    best,
    unit: rule?.frequency === 'TIMES_PER_WEEK' ? 'weeks' : 'days',
  };
}

export interface HabitStats {
  // Share of finished periods (due days, or weeks) that were done, 0–100; null before any has
  // finished. Today counts once it's done, like the streak.
  consistency: number | null;
  // Days the habit was done (count reached), ever.
  totalDays: number;
}

// The habit detail's Consistency and Total days (the design's tiles; FR-HAB-005).
export function computeStats(input: StreakInput): HabitStats {
  const list = periods(input).filter((p) => !p.pending);
  const ok = list.filter((p) => p.ok).length;
  let totalDays = 0;
  for (const [day, count] of input.completions) {
    if (day <= input.today && count >= input.targetCount) totalDays += 1;
  }
  return {
    consistency: list.length === 0 ? null : Math.round((ok / list.length) * 100),
    totalDays,
  };
}

// A milestone is every 7th day of a streak, and the challenge's last day: a 🎁 on the path,
// and a chest to open the day it's reached. (Streaks counted in weeks have none.)
export const isMilestone = (day: number, goal: number): boolean =>
  day > 0 && (day % 7 === 0 || day === goal);
