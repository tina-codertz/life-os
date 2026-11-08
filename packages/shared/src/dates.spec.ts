import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, localToday } from './dates.ts';

describe('shared calendar days', () => {
  it('today depends on the zone: 21:30 UTC on 8 Nov is already 9 Nov in Dar es Salaam', () => {
    const late = new Date('2026-11-08T21:30:00Z');
    expect(localToday('Africa/Dar_es_Salaam', late)).toBe('2026-11-09');
    expect(localToday('Europe/London', late)).toBe('2026-11-08');
  });

  it('adds and counts days across month, year and daylight-saving changes', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
    expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7);
  });
});
