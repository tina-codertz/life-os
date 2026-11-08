// Calendar days ("2026-12-01") ↔ Postgres `date` columns. Prisma returns a `date` as a JS Date at
// UTC midnight; reading it back with getUTC*/toISOString keeps the day exact in any server zone.
export function toDbDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Today's calendar day in an IANA time zone ("today" is the user's, not the server's: ADR-006).
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
