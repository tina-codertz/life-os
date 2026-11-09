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

// How far `timeZone`'s clock is ahead of UTC at `at`, in ms (Dar es Salaam: +3 h).
function zoneOffset(timeZone: string, at: number): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(at));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wall = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return wall - Math.floor(at / 1000) * 1000;
}

// The moment it's `minutes` past midnight on `day` in `timeZone` (a reminder at 21:00 there).
// Checked twice so a daylight-saving change between the guess and the answer is caught. A time
// skipped by a spring-forward lands just after the jump.
export function zonedInstant(day: string, minutes: number, timeZone: string): Date {
  const wall = utcMidnight(day).getTime() + minutes * 60_000;
  const first = wall - zoneOffset(timeZone, wall);
  return new Date(wall - zoneOffset(timeZone, first));
}
