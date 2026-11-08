// Due dates are calendar days ("2026-12-01") in the user's time zone (ADR-006). These helpers
// never use the phone's clock zone for "today": they ask for it in the user's saved zone.

// Today's date in `timeZone`, e.g. "2026-11-08".
export function localToday(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Calendar arithmetic on "YYYY-MM-DD", done in UTC so daylight saving can't shift the day.
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000,
  );
}

export interface DueLabel {
  text: string;
  overdue: boolean;
}

// "Today", "Tomorrow", "Yesterday", "Wed 3 Dec", "3 Dec 2027", with "Overdue" in words (never
// colour alone, docs/07 §7). Times come from minutes after midnight.
export function formatDue(
  dueDate: string,
  today: string,
  dueTime: number | null = null,
  done = false,
): DueLabel {
  const diff = daysBetween(today, dueDate);
  const date = new Date(`${dueDate}T00:00:00.000Z`);
  const sameYear = dueDate.slice(0, 4) === today.slice(0, 4);
  let text =
    diff === 0
      ? 'Today'
      : diff === 1
        ? 'Tomorrow'
        : diff === -1
          ? 'Yesterday'
          : new Intl.DateTimeFormat('en-GB', {
              timeZone: 'UTC',
              ...(Math.abs(diff) < 7 ? { weekday: 'short' } : {}),
              day: 'numeric',
              month: 'short',
              ...(sameYear ? {} : { year: 'numeric' }),
            }).format(date);
  if (dueTime !== null) text += ` · ${formatTime(dueTime)}`;
  const overdue = !done && diff < 0;
  return { text: overdue ? `Overdue · ${text}` : text, overdue };
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// --- Month calendar (the date picker in the task form) ---

// "2026-11-08" → "2026-11".
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function addMonths(month: string, months: number): string {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 7);
}

// The month as weeks of 7 days, starting on `weekStartsOn` (0 = Sunday … 6 = Saturday, the
// API's numbering). Days outside the month are null, so the grid lines up under the weekdays.
export function monthGrid(month: string, weekStartsOn: number): (string | null)[][] {
  const first = `${month}-01`;
  const lead = (new Date(`${first}T00:00:00.000Z`).getUTCDay() - weekStartsOn + 7) % 7;
  const length = daysBetween(first, `${addMonths(month, 1)}-01`);
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length }, (_, i) => addDays(first, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

// Narrow weekday names in grid order, e.g. M T W T F S S for a Monday start.
export function weekdayLetters(weekStartsOn: number): string[] {
  // 2026-11-01 is a Sunday.
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'narrow' }).format(
      new Date(`${addDays('2026-11-01', (weekStartsOn + i) % 7)}T00:00:00.000Z`),
    ),
  );
}

// "November 2026".
export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${month}-01T00:00:00.000Z`));
}

// "Friday 20 November 2026": what a screen reader says for a day in the calendar.
export function formatDayLong(day: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date(`${day}T00:00:00.000Z`))
    .replace(',', '');
}
