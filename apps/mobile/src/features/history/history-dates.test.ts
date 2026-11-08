import {
  formatChange,
  formatDayHeading,
  formatWeekRange,
  heatLevel,
  longestStreak,
  monthWeeks,
  startOfWeek,
} from './history-dates';

describe('history dates', () => {
  it('weeks start on the user’s day', () => {
    expect(startOfWeek('2026-11-08', 1)).toBe('2026-11-02'); // Sunday → Monday before
    expect(startOfWeek('2026-11-08', 0)).toBe('2026-11-08'); // Sunday start
    expect(startOfWeek('2026-11-02', 1)).toBe('2026-11-02');
  });

  it('labels weeks and days like the design', () => {
    expect(formatWeekRange('2026-11-02')).toBe('Nov 2–8');
    expect(formatWeekRange('2026-09-28')).toBe('Sep 28 – Oct 4');
    expect(formatDayHeading('2026-11-08', '2026-11-08')).toBe('Today · Sun 8');
    expect(formatDayHeading('2026-11-07', '2026-11-08')).toBe('Saturday 7');
  });

  it('a month view covers whole weeks', () => {
    const weeks = monthWeeks('2026-10', 1);
    expect(weeks[0]?.[0]).toBe('2026-09-28');
    expect(weeks.at(-1)?.[6]).toBe('2026-11-01');
    expect(weeks).toHaveLength(5);
  });

  it('heat levels: none, then quarters of the busiest day', () => {
    expect([0, 1, 3, 5, 6, 8].map((n) => heatLevel(n, 8))).toEqual([0, 1, 2, 3, 3, 4]);
    expect(heatLevel(3, 0)).toBe(0);
  });

  it('longest streak counts days in a row, across a month end', () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-03'])).toBe(3);
    expect(longestStreak(['2026-11-05', '2026-11-05'])).toBe(1);
  });

  it('says the change from the last period', () => {
    expect(formatChange(34, 25, 'week')).toBe('+9 vs last week');
    expect(formatChange(2, 5, 'week')).toBe('−3 vs last week');
    expect(formatChange(4, 4, 'week')).toBe('Same as last week');
  });
});
