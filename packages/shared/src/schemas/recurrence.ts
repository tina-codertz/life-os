import { z } from 'zod';
import { addDays, daysBetween } from '../dates.ts';

// FR-TASK-006: repeating tasks. Stored and sent as a small, strict subset of the calendar
// standard RRULE (RFC 5545), so the same text can serve calendar events later (docs/05):
//   FREQ=DAILY                     every day
//   FREQ=DAILY;INTERVAL=3          every 3 days
//   FREQ=WEEKLY;BYDAY=MO,WE        weekly on the chosen weekdays
//   FREQ=MONTHLY;BYMONTHDAY=31     monthly on a day (the last day in shorter months)
// Anything else is refused. Dates are calendar days "YYYY-MM-DD" (ADR-006).

export const RRULE_WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export type RRuleWeekday = (typeof RRULE_WEEKDAYS)[number];
export const MAX_REPEAT_INTERVAL = 365;

export type Recurrence =
  | { freq: 'DAILY'; interval: number }
  | { freq: 'WEEKLY'; days: RRuleWeekday[] }
  | { freq: 'MONTHLY'; day: number };

const WEEKDAY_NAMES: Record<RRuleWeekday, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
};

const isWeekday = (code: string): code is RRuleWeekday =>
  (RRULE_WEEKDAYS as readonly string[]).includes(code);

function wholeNumber(text: string | undefined, min: number, max: number): number | null {
  if (text === undefined || !/^\d+$/.test(text)) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}

// True when the rule has exactly these keys (FREQ plus the ones its shape needs).
const hasExactly = (parts: Map<string, string>, keys: string[]) =>
  parts.size === keys.length && keys.every((k) => parts.has(k));

// The rule as data, or null if it isn't one of the four shapes above.
export function parseRule(rule: string): Recurrence | null {
  const parts = new Map<string, string>();
  for (const part of rule.split(';')) {
    const [key, value, extra] = part.split('=');
    if (!key || value === undefined || extra !== undefined || parts.has(key)) return null;
    parts.set(key, value);
  }
  switch (parts.get('FREQ')) {
    case 'DAILY': {
      if (hasExactly(parts, ['FREQ'])) return { freq: 'DAILY', interval: 1 };
      if (!hasExactly(parts, ['FREQ', 'INTERVAL'])) return null;
      const interval = wholeNumber(parts.get('INTERVAL'), 1, MAX_REPEAT_INTERVAL);
      return interval === null ? null : { freq: 'DAILY', interval };
    }
    case 'WEEKLY': {
      if (!hasExactly(parts, ['FREQ', 'BYDAY'])) return null;
      const days = (parts.get('BYDAY') ?? '').split(',');
      if (days.length === 0 || !days.every(isWeekday) || new Set(days).size !== days.length) {
        return null;
      }
      return { freq: 'WEEKLY', days: RRULE_WEEKDAYS.filter((d) => days.includes(d)) };
    }
    case 'MONTHLY': {
      if (!hasExactly(parts, ['FREQ', 'BYMONTHDAY'])) return null;
      const day = wholeNumber(parts.get('BYMONTHDAY'), 1, 31);
      return day === null ? null : { freq: 'MONTHLY', day };
    }
    default:
      return null;
  }
}

// The one way each rule is written (weekdays in week order), so equal rules compare equal.
export function formatRule(rule: Recurrence): string {
  if (rule.freq === 'DAILY') {
    return rule.interval === 1 ? 'FREQ=DAILY' : `FREQ=DAILY;INTERVAL=${rule.interval}`;
  }
  if (rule.freq === 'WEEKLY') {
    return `FREQ=WEEKLY;BYDAY=${RRULE_WEEKDAYS.filter((d) => rule.days.includes(d)).join(',')}`;
  }
  return `FREQ=MONTHLY;BYMONTHDAY=${rule.day}`;
}

// Validates a rule and stores it in its standard spelling.
export const recurrenceRuleSchema = z
  .string()
  .max(200)
  .refine((rule) => parseRule(rule) !== null, {
    error: 'Choose daily, every few days, weekly on some days, or monthly.',
  })
  .transform((rule) => {
    const parsed = parseRule(rule);
    return parsed ? formatRule(parsed) : rule;
  });

// --- Calendar-day arithmetic, in UTC so daylight saving can't move a day ---

const toDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const toDay = (date: Date) => date.toISOString().slice(0, 10);

// The RRULE code for a day ("2026-11-09" is a Monday → "MO").
export function weekdayOf(day: string): RRuleWeekday {
  return RRULE_WEEKDAYS[(toDate(day).getUTCDay() + 6) % 7] ?? 'MO';
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// `day` in the given month, or the month's last day if it's shorter (31 → 30 Nov, 28/29 Feb).
function monthDay(year: number, month: number, day: number): string {
  return toDay(new Date(Date.UTC(year, month, Math.min(day, daysInMonth(year, month)))));
}

// The first occurrence strictly after `after`.
export function nextOccurrence(rule: Recurrence, after: string): string {
  if (rule.freq === 'DAILY') return addDays(after, rule.interval);
  if (rule.freq === 'WEEKLY') {
    for (let i = 1; i <= 7; i += 1) {
      const day = addDays(after, i);
      if (rule.days.includes(weekdayOf(day))) return day;
    }
    throw new Error('A weekly rule needs at least one day.');
  }
  const date = toDate(after);
  const [year, month] = [date.getUTCFullYear(), date.getUTCMonth()];
  const sameMonth = monthDay(year, month, rule.day);
  return sameMonth > after ? sameMonth : monthDay(year, month + 1, rule.day);
}

// Does a series that starts on `first` fall on `day`? The first day always counts (as in the
// calendar standard), then every day the rule names. Used to spread repeating events over the
// calendar (Calendar I).
export function occursOn(rule: Recurrence, first: string, day: string): boolean {
  if (day < first) return false;
  if (day === first) return true;
  if (rule.freq === 'DAILY') return daysBetween(first, day) % rule.interval === 0;
  if (rule.freq === 'WEEKLY') return rule.days.includes(weekdayOf(day));
  const date = toDate(day);
  return day === monthDay(date.getUTCFullYear(), date.getUTCMonth(), rule.day);
}

// The date for the next task when one is completed: the occurrence after its due date, moved
// on to today or later if that's already past (a chore missed for weeks doesn't leave a pile
// of overdue copies; it simply comes back next time).
export function nextDueDate(rule: Recurrence, dueDate: string, today: string): string {
  let next = nextOccurrence(rule, dueDate);
  while (next < today) next = nextOccurrence(rule, next);
  return next;
}

// "Weekly on Mon, Wed", for the Repeat row and screen readers.
export function describeRule(rule: Recurrence): string {
  if (rule.freq === 'DAILY') return rule.interval === 1 ? 'Daily' : `Every ${rule.interval} days`;
  if (rule.freq === 'WEEKLY') {
    if (rule.days.join() === 'MO,TU,WE,TH,FR') return 'Weekdays';
    if (rule.days.length === 7) return 'Daily';
    return `Weekly on ${rule.days.map((d) => WEEKDAY_NAMES[d]).join(', ')}`;
  }
  return `Monthly on day ${rule.day}`;
}

// "Weekly", for small places (a task row, the highlighted card).
export function shortRule(rule: Recurrence): string {
  if (rule.freq === 'DAILY') return rule.interval === 1 ? 'Daily' : `Every ${rule.interval} days`;
  if (rule.freq === 'WEEKLY') {
    if (rule.days.join() === 'MO,TU,WE,TH,FR') return 'Weekdays';
    return rule.days.length === 7 ? 'Daily' : 'Weekly';
  }
  return 'Monthly';
}
