import type { PublicGoal } from '@life-os/shared';
import { dayMonth, daysLeftLabel, goalPace, overdueLabel, progressCaption } from './pace';

const goal = (
  o: Partial<Pick<PublicGoal, 'status' | 'targetDate'>> & { percent?: number } = {},
) => ({
  status: o.status ?? ('ACTIVE' as const),
  targetDate: o.targetDate === undefined ? '2026-12-20' : o.targetDate,
  progress: { percent: o.percent ?? 0, done: 0, total: 0 },
});

// Made 10 Nov, target 20 Dec: 40 days. On 30 Nov (20 days in) half the time has gone.
const START = '2026-11-10';

describe('goalPace (your rule: progress vs time, 10 points of slack)', () => {
  it('on track when progress keeps up with the time gone', () => {
    expect(goalPace(goal({ percent: 50 }), '2026-11-30', START)).toEqual({
      kind: 'active',
      daysLeft: 20,
      onTrack: true,
    });
    expect(goalPace(goal({ percent: 40 }), '2026-11-30', START)).toMatchObject({ onTrack: true });
  });

  it('behind when it trails by more than 10 points', () => {
    expect(goalPace(goal({ percent: 39 }), '2026-11-30', START)).toMatchObject({ onTrack: false });
  });

  it('a new goal is on track on its first day, even at 0%', () => {
    expect(goalPace(goal(), START, START)).toMatchObject({ onTrack: true, daysLeft: 40 });
  });

  it('the target day itself: due today, needs to be nearly done', () => {
    expect(goalPace(goal({ percent: 95 }), '2026-12-20', START)).toEqual({
      kind: 'active',
      daysLeft: 0,
      onTrack: true,
    });
    expect(goalPace(goal({ percent: 80 }), '2026-12-20', START)).toMatchObject({ onTrack: false });
  });

  it('overdue after the target; no label without one; done and abandoned say so', () => {
    expect(goalPace(goal({ percent: 99 }), '2026-12-23', START)).toEqual({
      kind: 'overdue',
      days: 3,
    });
    expect(goalPace(goal({ targetDate: null }), '2026-11-30', START)).toEqual({
      kind: 'no-target',
    });
    expect(goalPace(goal({ status: 'COMPLETED' }), '2026-12-23', START)).toEqual({
      kind: 'completed',
    });
    expect(goalPace(goal({ status: 'ABANDONED' }), '2026-11-30', START)).toEqual({
      kind: 'abandoned',
    });
  });

  it('a target set on (or before) the day it was made counts all the time as gone', () => {
    expect(goalPace(goal({ targetDate: START, percent: 89 }), START, START)).toMatchObject({
      onTrack: false,
    });
  });
});

describe('labels', () => {
  it('days left, overdue, dates and what the progress counts', () => {
    expect(daysLeftLabel(42)).toBe('42 days left');
    expect(daysLeftLabel(1)).toBe('1 day left');
    expect(daysLeftLabel(0)).toBe('Due today');
    expect(overdueLabel(1)).toBe('1 day overdue');
    expect(dayMonth('2026-12-20', '2026-11-09')).toBe('20 Dec');
    expect(dayMonth('2027-01-31', '2026-11-09')).toBe('31 Jan 2027');
    expect(
      progressCaption({ progressMode: 'MILESTONES', progress: { percent: 67, done: 4, total: 6 } }),
    ).toBe('4 of 6 milestones');
    expect(
      progressCaption({ progressMode: 'TASKS', progress: { percent: 100, done: 1, total: 1 } }),
    ).toBe('1 of 1 task');
    expect(
      progressCaption({ progressMode: 'TASKS', progress: { percent: 0, done: 0, total: 0 } }),
    ).toBe('No tasks yet');
    expect(
      progressCaption({ progressMode: 'MANUAL', progress: { percent: 45, done: 45, total: 100 } }),
    ).toBe('Set by you');
  });
});
