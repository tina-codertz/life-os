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
