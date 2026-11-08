import type { HistoryDay } from '@life-os/shared';
import { addDays, addMonths, monthGrid } from '@/features/tasks/dates';

// Calendar-day helpers for History. Days are "YYYY-MM-DD" in the user's zone; maths in UTC.

const utc = (day: string) => new Date(`${day}T00:00:00.000Z`);
const format = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(utc(day));
// Short month names as in the design ("Sep", not British "Sept").
const shortMonth = (day: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' }).format(utc(day));

// The first day of the week containing `day` (weekStartsOn: 0 = Sunday … 6 = Saturday).
export function startOfWeek(day: string, weekStartsOn: number): string {
  return addDays(day, -((utc(day).getUTCDay() - weekStartsOn + 7) % 7));
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const dayNumber = (d: string) => Number(d.slice(8));

// "Nov 2–8", or "Oct 26 – Nov 1" across months.
export function formatWeekRange(start: string): string {
  const end = addDays(start, 6);
  const month = shortMonth;
  return month(start) === month(end)
    ? `${month(start)} ${dayNumber(start)}–${dayNumber(end)}`
    : `${month(start)} ${dayNumber(start)} – ${month(end)} ${dayNumber(end)}`;
}

// "Today · Sun 8" for today, otherwise "Saturday 7" (the design's day headings).
export function formatDayHeading(day: string, today: string): string {
  if (day === today) return `Today · ${format(day, { weekday: 'short' })} ${Number(day.slice(8))}`;
  return `${format(day, { weekday: 'long' })} ${Number(day.slice(8))}`;
}

export const weekdayLetter = (day: string) => format(day, { weekday: 'narrow' });
export const weekdayShort = (day: string) => format(day, { weekday: 'short' });
export const monthName = (month: string) => format(`${month}-01`, { month: 'long' });
export const monthShort = (month: string) => shortMonth(`${month}-01`);
export const monthLetter = (month: string) => format(`${month}-01`, { month: 'narrow' });

// The days a month view shows: its whole weeks (so "By week" can show Sep 28 – Oct 4).
export function monthWeeks(month: string, weekStartsOn: number): string[][] {
  return monthGrid(month, weekStartsOn).map((week) => {
    const first = week.find((d): d is string => d !== null) ?? `${month}-01`;
    return weekDays(startOfWeek(first, weekStartsOn));
  });
}

export const yearMonths = (year: number) =>
  Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

export const shiftMonth = addMonths;

// Count per day, from the API's list (which leaves out empty days).
export function countsByDay(days: HistoryDay[]): Map<string, number> {
  return new Map(days.map((d) => [d.date, d.count]));
}

// 0 for nothing, then 1–4 in quarters of the busiest day (the heatmap's five steps).
const LEVELS = [1, 2, 3, 4] as const;
export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  return LEVELS[Math.min(3, Math.ceil((count / max) * 4) - 1)] ?? 4;
}

// The most days in a row with something completed.
export function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].toSorted();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

// "+9 vs last week", "−3 vs last week" or "Same as last week".
export function formatChange(now: number, before: number, period: string): string {
  const diff = now - before;
  if (diff === 0) return `Same as last ${period}`;
  return `${diff > 0 ? '+' : '−'}${Math.abs(diff)} vs last ${period}`;
}
