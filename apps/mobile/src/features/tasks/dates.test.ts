import { addDays, formatDue, formatTime, localToday } from './dates';

describe('localToday', () => {
  // 21:30 UTC on 8 Nov is already 9 Nov in Dar es Salaam (UTC+3) but still 8 Nov in London.
  const late = new Date('2026-11-08T21:30:00Z');

  it.each([
    ['Africa/Dar_es_Salaam', '2026-11-09'],
    ['Europe/London', '2026-11-08'],
    ['America/Los_Angeles', '2026-11-08'],
  ])('in %s it is %s', (zone, day) => {
    expect(localToday(zone, late)).toBe(day);
  });
});

describe('addDays', () => {
  it.each([
    ['2026-11-08', 1, '2026-11-09'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'], // leap year
    ['2026-03-28', 2, '2026-03-30'], // across a daylight-saving change in Europe
    ['2026-11-08', -8, '2026-10-31'],
  ])('%s + %i = %s', (day, n, result) => {
    expect(addDays(day, n)).toBe(result);
  });
});

describe('formatDue', () => {
  const today = '2026-11-08'; // a Sunday
  it.each([
    ['2026-11-08', 'Today', false],
    ['2026-11-09', 'Tomorrow', false],
    ['2026-11-11', 'Wed 11 Nov', false],
    ['2026-12-25', '25 Dec', false],
    ['2027-01-04', '4 Jan 2027', false],
    ['2026-11-07', 'Overdue · Yesterday', true],
    ['2026-11-03', 'Overdue · Tue 3 Nov', true],
  ])('%s → %s', (due, text, overdue) => {
    expect(formatDue(due, today)).toEqual({ text, overdue });
  });

  it('adds the time, and a done task is never overdue', () => {
    expect(formatDue('2026-11-08', today, 540).text).toBe('Today · 09:00');
    expect(formatDue('2026-11-01', today, null, true)).toEqual({ text: '1 Nov', overdue: false });
  });

  it('formats times', () => {
    expect([0, 540, 1439].map(formatTime)).toEqual(['00:00', '09:00', '23:59']);
  });
});
