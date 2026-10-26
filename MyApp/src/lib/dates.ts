import { format } from "date-fns";

// Local-time day key, e.g. "2026-10-25". Never use toISOString().slice(0, 10):
// that is the UTC day, which is wrong for the first 3 hours of each day at UTC+3.
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayKey(): string {
  return toDateKey(new Date());
}
