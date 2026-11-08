// Calendar days ("2026-12-01") ↔ Postgres `date` columns. Prisma returns a `date` as a JS Date at
// UTC midnight; reading it back with getUTC*/toISOString keeps the day exact in any server zone.
export function toDbDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
