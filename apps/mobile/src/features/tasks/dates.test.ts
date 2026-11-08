import {
  addDays,
  addMonths,
  formatDayLong,
  formatDue,
  formatMonth,
  formatTime,
  localToday,
  monthGrid,
  monthOf,
  weekdayLetters,
} from './dates';

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

describe('month calendar', () => {
  it('adds months across a year end', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthOf('2026-11-08')).toBe('2026-11');
  });

  it('lays out November 2026 from Monday: the 1st is a Sunday, so six blanks first', () => {
    const weeks = monthGrid('2026-11', 1);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks[1]?.[0]).toBe('2026-11-02');
    expect(weeks.at(-1)).toEqual(['2026-11-30', null, null, null, null, null, null]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it('lays out the same month from Sunday with no blanks before the 1st', () => {
    const weeks = monthGrid('2026-11', 0);
    expect(weeks[0]?.[0]).toBe('2026-11-01');
    expect(weeks).toHaveLength(5);
  });

  it('handles a leap February', () => {
    expect(monthGrid('2028-02', 1).flat().filter(Boolean).at(-1)).toBe('2028-02-29');
  });

  it('names weekdays and days in words', () => {
    expect(weekdayLetters(1)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(weekdayLetters(0)[0]).toBe('S');
    expect(formatMonth('2026-11')).toBe('November 2026');
    expect(formatDayLong('2026-11-20')).toBe('Friday 20 November 2026');
  });
});
