import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, localToday, zonedInstant } from './dates.ts';

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

describe('zonedInstant (when a reminder fires)', () => {
  it('21:00 in Dar es Salaam is 18:00 UTC', () => {
    expect(zonedInstant('2026-11-09', 21 * 60, 'Africa/Dar_es_Salaam').toISOString()).toBe(
      '2026-11-09T18:00:00.000Z',
    );
  });

  it('follows daylight saving: 08:00 in London is 08:00 UTC in winter, 07:00 in summer', () => {
    expect(zonedInstant('2026-01-15', 8 * 60, 'Europe/London').toISOString()).toBe(
      '2026-01-15T08:00:00.000Z',
    );
    expect(zonedInstant('2026-07-15', 8 * 60, 'Europe/London').toISOString()).toBe(
      '2026-07-15T07:00:00.000Z',
    );
  });

  it('on the change days themselves (London, 29 Mar and 25 Oct 2026)', () => {
    // After the 01:00 jump to BST: 09:00 BST = 08:00 UTC.
    expect(zonedInstant('2026-03-29', 9 * 60, 'Europe/London').toISOString()).toBe(
      '2026-03-29T08:00:00.000Z',
    );
    // After falling back to GMT at 02:00: 09:00 GMT = 09:00 UTC.
    expect(zonedInstant('2026-10-25', 9 * 60, 'Europe/London').toISOString()).toBe(
      '2026-10-25T09:00:00.000Z',
    );
  });

  it('west of UTC, and midnight', () => {
    expect(zonedInstant('2026-11-09', 0, 'America/New_York').toISOString()).toBe(
      '2026-11-09T05:00:00.000Z',
    );
  });
});
