import { describe, expect, it } from 'vitest';
import { activityStreak } from './activity-streak.ts';

describe('activityStreak (the 🔥 chip)', () => {
  it('counts days in a row up to today; today empty still keeps yesterday’s run', () => {
    const days = ['2026-11-05', '2026-11-06', '2026-11-07'];
    expect(activityStreak(days, '2026-11-08')).toEqual({ current: 3, best: 3 });
    expect(activityStreak([...days, '2026-11-08'], '2026-11-08')).toEqual({ current: 4, best: 4 });
  });

  it('a missed day breaks the current run; best remembers the longest', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-08'];
    expect(activityStreak(days, '2026-11-08')).toEqual({ current: 1, best: 3 });
    expect(activityStreak(['2026-11-05'], '2026-11-08')).toEqual({ current: 0, best: 1 });
  });

  it('nothing yet, and duplicates or future days, are handled', () => {
    expect(activityStreak([], '2026-11-08')).toEqual({ current: 0, best: 0 });
    expect(activityStreak(['2026-11-08', '2026-11-08', '2026-11-09'], '2026-11-08')).toEqual({
      current: 1,
      best: 1,
    });
  });
});
