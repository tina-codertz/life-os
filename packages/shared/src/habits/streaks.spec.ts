import { describe, expect, it } from 'vitest';
import { addDays } from '../dates.ts';
import {
  computeStats,
  computeStreaks,
  dayState,
  type ScheduleVersion,
  type StreakInput,
} from './streaks.ts';

// The streak test matrix (docs/02 "Habit edge-case rules", docs/08 Habits II).
// 2026-11-02 is a Monday; weeks start on Monday unless a test says otherwise.

const DAILY: ScheduleVersion = {
  effectiveFrom: '2026-11-01',
  frequency: 'DAILY',
  weekdays: [],
  timesPerWeek: null,
};
const MON_WED_FRI: ScheduleVersion = {
  effectiveFrom: '2026-11-01',
  frequency: 'WEEKLY_DAYS',
  weekdays: [1, 3, 5],
  timesPerWeek: null,
};
const THREE_A_WEEK: ScheduleVersion = {
  effectiveFrom: '2026-11-01',
  frequency: 'TIMES_PER_WEEK',
  weekdays: [],
  timesPerWeek: 3,
};

function input(o: Partial<StreakInput> & { done?: string[] }): StreakInput {
  return {
    startDate: '2026-11-01',
    schedules: [DAILY],
    completions: new Map((o.done ?? []).map((d) => [d, 1])),
    targetCount: 1,
    today: '2026-11-08',
    weekStartsOn: 1,
    ...o,
  };
}
const days = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));

describe('DAILY (rule 4)', () => {
  it('counts days in a row; today not done yet does not break it', () => {
    const s = computeStreaks(input({ done: days('2026-11-01', 7) })); // 1–7, today the 8th open
    expect(s).toEqual({ current: 7, best: 7, unit: 'days' });
  });

  it('today done counts too', () => {
    expect(computeStreaks(input({ done: days('2026-11-01', 8) })).current).toBe(8);
  });

  it('a missed day breaks it; best keeps the longer run', () => {
    const done = [...days('2026-11-01', 4), '2026-11-06', '2026-11-07', '2026-11-08'];
    expect(computeStreaks(input({ done }))).toMatchObject({ current: 3, best: 4 });
  });

  it('yesterday missed: the current streak is 0 even before today ends', () => {
    const done = days('2026-11-01', 6); // up to the 6th; the 7th missed
    expect(computeStreaks(input({ done })).current).toBe(0);
  });
});

describe('WEEKLY_DAYS (rule 5)', () => {
  it('days that aren’t scheduled neither break nor extend it', () => {
    // Mon 2, Wed 4, Fri 6 done; Sun 1, Tue 3, Thu 5, Sat 7, Sun 8 are off.
    const s = computeStreaks(
      input({ schedules: [MON_WED_FRI], done: ['2026-11-02', '2026-11-04', '2026-11-06'] }),
    );
    expect(s).toEqual({ current: 3, best: 3, unit: 'days' });
  });

  it('a missed scheduled day breaks it', () => {
    const s = computeStreaks(
      input({ schedules: [MON_WED_FRI], done: ['2026-11-02', '2026-11-06'] }),
    );
    expect(s).toMatchObject({ current: 1, best: 1 });
  });
});

describe('TIMES_PER_WEEK (rule 6)', () => {
  it('counts weeks that reached the target; this week still running doesn’t break it', () => {
    // Week of 26 Oct (only Sun 1 Nov is in range, so 1 of 3: missed), 2–8 Nov: 3 done.
    // Today is Mon 9 Nov: the new week has just started.
    const s = computeStreaks(
      input({
        schedules: [THREE_A_WEEK],
        today: '2026-11-09',
        done: ['2026-11-03', '2026-11-05', '2026-11-07'],
      }),
    );
    expect(s).toEqual({ current: 1, best: 1, unit: 'weeks' });
  });

  it('a week short of the target breaks it', () => {
    const s = computeStreaks(
      input({
        schedules: [THREE_A_WEEK],
        startDate: '2026-11-02',
        today: '2026-11-16',
        done: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-10'],
      }),
    );
    expect(s).toMatchObject({ current: 0, best: 1 });
  });

  it('the week start follows the user’s setting', () => {
    // From Sunday: Sun 1 – Sat 7 is one week with 3 done.
    const done = ['2026-11-01', '2026-11-04', '2026-11-07'];
    const fromSunday = computeStreaks(input({ schedules: [THREE_A_WEEK], weekStartsOn: 0, done }));
    expect(fromSunday.current).toBe(1);
    // From Monday the same days split across two weeks (1 + 2): neither reaches 3.
    const fromMonday = computeStreaks(input({ schedules: [THREE_A_WEEK], weekStartsOn: 1, done }));
    expect(fromMonday.best).toBe(0);
  });
});

describe('schedule changes, start date, targets', () => {
  it('rule 7: days before a change are judged by the old rule', () => {
    // Daily until Wed 4, then Mon/Wed/Fri from Thu 5. Done: 1–4 daily, then Fri 6.
    const changed: ScheduleVersion = { ...MON_WED_FRI, effectiveFrom: '2026-11-05' };
    const s = computeStreaks(
      input({ schedules: [DAILY, changed], done: [...days('2026-11-01', 4), '2026-11-06'] }),
    );
    expect(s.current).toBe(5); // 1, 2, 3, 4 (daily) + Fri 6; Thu 5 and Sat 7, Sun 8 are off
  });

  it('rule 8: days before the start are never missed', () => {
    const s = computeStreaks(
      input({ startDate: '2026-11-06', done: ['2026-11-06', '2026-11-07'] }),
    );
    expect(s.current).toBe(2);
    expect(dayState(input({ startDate: '2026-11-06' }), '2026-11-03')).toBe('before-start');
  });

  it('FR-HAB-009: a day counts once the count reaches the target', () => {
    const counts = new Map([
      ['2026-11-07', 8],
      ['2026-11-08', 3],
    ]);
    const base = input({ startDate: '2026-11-07', targetCount: 8, completions: counts });
    expect(dayState(base, '2026-11-07')).toBe('done');
    expect(dayState(base, '2026-11-08')).toBe('today'); // 3 of 8: not yet
    expect(computeStreaks(base).current).toBe(1);
  });

  it('rule 3: daylight-saving days are ordinary days (Europe, 29 Mar 2026)', () => {
    const s = computeStreaks(
      input({ startDate: '2026-03-28', today: '2026-03-30', done: days('2026-03-28', 3) }),
    );
    expect(s.current).toBe(3);
  });
});

describe('dayState', () => {
  it('labels each kind of day', () => {
    const daily = input({ done: ['2026-11-05'] });
    expect(dayState(daily, '2026-11-05')).toBe('done');
    expect(dayState(daily, '2026-11-06')).toBe('missed');
    expect(dayState(daily, '2026-11-08')).toBe('today');
    expect(dayState(daily, '2026-11-09')).toBe('upcoming');
    expect(dayState(input({ schedules: [MON_WED_FRI] }), '2026-11-03')).toBe('off');
    expect(dayState(input({ schedules: [THREE_A_WEEK] }), '2026-11-03')).toBe('open');
  });
});

describe('computeStats (the habit detail tiles)', () => {
  it('consistency is done periods over finished ones; today open doesn’t count yet', () => {
    // 1–7 Nov: six done, the 4th missed; today (8th) not done yet.
    const done = days('2026-11-01', 7).filter((d) => d !== '2026-11-04');
    expect(computeStats(input({ done }))).toEqual({ consistency: 86, totalDays: 6 });
  });

  it('today done counts', () => {
    expect(computeStats(input({ done: days('2026-11-01', 8) }))).toEqual({
      consistency: 100,
      totalDays: 8,
    });
  });

  it('a new habit has no consistency yet', () => {
    expect(computeStats(input({ startDate: '2026-11-08' }))).toEqual({
      consistency: null,
      totalDays: 0,
    });
  });

  it('days off don’t count against it, and a day short of its target isn’t a done day', () => {
    const s = computeStats(
      input({
        schedules: [MON_WED_FRI],
        targetCount: 2,
        completions: new Map([
          ['2026-11-02', 2], // Mon done
          ['2026-11-04', 1], // Wed short
          ['2026-11-06', 2], // Fri done
        ]),
      }),
    );
    expect(s).toEqual({ consistency: 67, totalDays: 2 });
  });

  it('N times a week: counted in weeks', () => {
    const s = computeStats(
      input({
        schedules: [THREE_A_WEEK],
        today: '2026-11-16',
        done: ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-10'],
      }),
    );
    // Week of 2 Nov: 3 of 3; week of 9 Nov: 1 of 3; the week of the 16th is still running.
    // (The 1st, a Sunday, is its own week before them, with nothing done.)
    expect(s.totalDays).toBe(4);
    expect(s.consistency).toBe(33);
  });
});
