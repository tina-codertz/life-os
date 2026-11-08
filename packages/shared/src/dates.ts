// Calendar days ("2026-12-01") in the user's own time zone (ADR-006). One copy for the API and
// the app, which must agree on what "today" is and how days add up. The arithmetic runs in UTC
// so daylight saving can't move a day.

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

const utcMidnight = (day: string) => new Date(`${day}T00:00:00.000Z`);

export function addDays(day: string, days: number): string {
  const date = utcMidnight(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Whole days from `from` to `to` (negative if `to` is earlier).
export function daysBetween(from: string, to: string): number {
  return Math.round((utcMidnight(to).getTime() - utcMidnight(from).getTime()) / 86_400_000);
}
