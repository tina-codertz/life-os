import { describe, expect, it } from 'vitest';
import { addDays } from '../dates.ts';
import {
  computeStats,
  computeStreaks,
  dayState,
  isDueOn,
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
    // Week of 26 Oct (only Sun 1 Nov is in range: too short to be missed), 2–8 Nov: 3 done.
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

describe('isDueOn (the calendar)', () => {
  it('follows the schedule in force on each day, past or future', () => {
    // Mon/Wed/Fri until 2026-11-15, then daily.
    const changed = [MON_WED_FRI, { ...DAILY, effectiveFrom: '2026-11-16' }];
    expect(days('2026-11-09', 9).filter((d) => isDueOn(changed, d))).toEqual([
      '2026-11-09',
      '2026-11-11',
      '2026-11-13',
      '2026-11-16',
      '2026-11-17',
    ]);
    expect(isDueOn([THREE_A_WEEK], '2026-11-03')).toBe(true);
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
    // The 1st, a Sunday, is a one-day first week: it can't reach 3, so it isn't missed (rule 8).
    expect(s.totalDays).toBe(4);
    expect(s.consistency).toBe(50);
  });
});

// The rest of the matrix: each frequency × time-zone change × daylight saving × schedule change.
describe('time-zone changes (rules 1 and 2)', () => {
  it('flying east: "today" jumps ahead, yesterday’s check-in still counts', () => {
    // Done 5–7 Nov in Dar es Salaam; landing in Tokyo it's already the 8th, not done yet.
    const s = computeStreaks(input({ startDate: '2026-11-05', done: days('2026-11-05', 3) }));
    expect(s.current).toBe(3);
  });

  it('flying west: a check-in on a day that is "tomorrow" again isn’t lost or counted twice', () => {
    // Done 5–8 Nov in Tokyo, then in Los Angeles it's the 7th again.
    const before = input({ startDate: '2026-11-05', done: days('2026-11-05', 4) });
    const west = { ...before, today: '2026-11-07' };
    expect(computeStreaks(west).current).toBe(3); // 5, 6, 7: the 8th hasn't come yet here
    expect(dayState(west, '2026-11-08')).toBe('done'); // kept, shown as done
    // When the 8th arrives in Los Angeles it counts once.
    expect(computeStreaks({ ...west, today: '2026-11-08' }).current).toBe(4);
  });

  it('every frequency judges days by their stored local date, not by the new zone', () => {
    const done = ['2026-11-02', '2026-11-04', '2026-11-06'];
    for (const schedules of [[MON_WED_FRI], [THREE_A_WEEK]]) {
      const there = computeStreaks(input({ schedules, startDate: '2026-11-02', done }));
      const back = computeStreaks(
        input({ schedules, startDate: '2026-11-02', done, today: '2026-11-07' }),
      );
      expect(back).toEqual(there);
    }
  });
});

describe('daylight saving (rule 3) for every frequency', () => {
  // United States: spring forward Sun 8 Mar 2026, fall back Sun 1 Nov 2026.
  it('daily across the spring-forward day', () => {
    const s = computeStreaks(
      input({ startDate: '2026-03-07', today: '2026-03-09', done: days('2026-03-07', 3) }),
    );
    expect(s.current).toBe(3);
  });

  it('Mon/Wed/Fri across the fall-back weekend', () => {
    const s = computeStreaks(
      input({
        schedules: [{ ...MON_WED_FRI, effectiveFrom: '2026-10-26' }],
        startDate: '2026-10-26',
        today: '2026-11-06',
        done: ['2026-10-26', '2026-10-28', '2026-10-30', '2026-11-02', '2026-11-04', '2026-11-06'],
      }),
    );
    expect(s.current).toBe(6);
  });

  it('3 times a week: the fall-back Sunday stays in its week', () => {
    // Weeks from Monday: 26 Oct – 1 Nov holds the DST Sunday.
    const s = computeStreaks(
      input({
        schedules: [{ ...THREE_A_WEEK, effectiveFrom: '2026-10-26' }],
        startDate: '2026-10-26',
        today: '2026-11-09',
        done: ['2026-10-27', '2026-10-29', '2026-11-01', '2026-11-03', '2026-11-05', '2026-11-07'],
      }),
    );
    expect(s).toEqual({ current: 2, best: 2, unit: 'weeks' });
  });
});

describe('schedule changes (rule 7) between every pair of frequencies', () => {
  it('daily → 3 times a week on a Thursday: the cut-short week isn’t missed', () => {
    // Daily Mon 2 – Wed 4, all done; 3 a week from Thu 5, done once by Sun 8 (now Mon 9).
    const s = computeStreaks(
      input({
        schedules: [DAILY, { ...THREE_A_WEEK, effectiveFrom: '2026-11-05' }],
        startDate: '2026-11-02',
        today: '2026-11-09',
        done: [...days('2026-11-02', 3), '2026-11-07'],
      }),
    );
    expect(s.current).toBe(3); // the 3 daily days; Thu–Sun (4 days) neither breaks nor adds
    expect(s.unit).toBe('weeks');
  });

  it('3 times a week → daily on a Wednesday: Mon–Tue alone can’t reach 3, so they don’t break it', () => {
    const s = computeStreaks(
      input({
        schedules: [
          { ...THREE_A_WEEK, effectiveFrom: '2026-10-26' },
          { ...DAILY, effectiveFrom: '2026-11-04' },
        ],
        startDate: '2026-10-26',
        today: '2026-11-08',
        // Week of 26 Oct: 3 done. Mon 2: done. Then daily from Wed 4 to Sun 8.
        done: ['2026-10-26', '2026-10-28', '2026-10-30', '2026-11-02', ...days('2026-11-04', 5)],
      }),
    );
    expect(s).toEqual({ current: 6, best: 6, unit: 'days' }); // 1 week + 5 days
  });

  it('a cut-short week that did reach its target still counts', () => {
    const s = computeStreaks(
      input({
        schedules: [
          { ...THREE_A_WEEK, effectiveFrom: '2026-11-02' },
          { ...DAILY, effectiveFrom: '2026-11-05' },
        ],
        startDate: '2026-11-02',
        done: [...days('2026-11-02', 3), ...days('2026-11-05', 4)],
      }),
    );
    expect(s.current).toBe(5); // the week (Mon–Wed, 3 of 3) + Thu–Sun daily
  });

  it('changing the target mid-week applies to the running week', () => {
    // 3 a week until Wed 4, then 2 a week; done Mon and Thu.
    const s = computeStreaks(
      input({
        schedules: [
          { ...THREE_A_WEEK, effectiveFrom: '2026-11-02' },
          { ...THREE_A_WEEK, timesPerWeek: 2, effectiveFrom: '2026-11-05' },
        ],
        startDate: '2026-11-02',
        today: '2026-11-09',
        done: ['2026-11-02', '2026-11-05'],
      }),
    );
    expect(s.current).toBe(1);
  });

  it('Mon/Wed/Fri → daily: the old days off stay off, every day counts after', () => {
    const s = computeStreaks(
      input({
        schedules: [
          { ...MON_WED_FRI, effectiveFrom: '2026-11-02' },
          { ...DAILY, effectiveFrom: '2026-11-06' },
        ],
        startDate: '2026-11-02',
        done: ['2026-11-02', '2026-11-04', ...days('2026-11-06', 3)],
      }),
    );
    expect(s.current).toBe(5);
  });
});
