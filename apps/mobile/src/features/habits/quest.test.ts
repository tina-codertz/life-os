import type { HabitDay, HabitSchedule, PublicHabit } from '@life-os/shared';
import { buildPath, habitIcon, isMilestone, scheduleLabel } from './quest';

const TODAY = '2026-11-08'; // a Sunday
const habit = (o: Partial<PublicHabit> = {}): PublicHabit => ({
  id: 'h1',
  name: 'Read',
  icon: 'book-open',
  color: 'violet',
  targetCount: 1,
  unit: null,
  goalDays: 21,
  startDate: '2026-10-01',
  archivedAt: null,
  sortOrder: 0,
  schedule: { frequency: 'DAILY' },
  dueToday: true,
  today: null,
  streak: { current: 12, best: 12, unit: 'days' },
  chest: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...o,
});
const day = (
  date: string,
  state: HabitDay['state'],
  count = state === 'done' ? 1 : 0,
): HabitDay => ({
  date,
  state,
  count,
});

describe('scheduleLabel', () => {
  const cases: [HabitSchedule, string][] = [
    [{ frequency: 'DAILY' }, 'Every day'],
    [{ frequency: 'WEEKLY_DAYS', weekdays: [1, 3, 5] }, 'Mon, Wed and Fri'],
    [{ frequency: 'WEEKLY_DAYS', weekdays: [6] }, 'Every Sat'],
    [{ frequency: 'TIMES_PER_WEEK', timesPerWeek: 3 }, '3 times a week'],
    [{ frequency: 'TIMES_PER_WEEK', timesPerWeek: 1 }, 'Once a week'],
  ];
  it.each(cases)('%j → %s', (schedule, label) => {
    expect(scheduleLabel(schedule)).toBe(label);
  });
});

describe('buildPath', () => {
  const days = [
    day('2026-11-04', 'done'),
    day('2026-11-05', 'missed'),
    day('2026-11-06', 'done'),
    day('2026-11-07', 'done'),
    day(TODAY, 'today'),
  ];

  it('the last 3 past days, today, then the next 2 due days with what they’d reach', () => {
    // Streak 12 up to yesterday; today would make 13, then 14 (a milestone 🎁) and 15.
    expect(buildPath(habit(), days, TODAY)).toEqual([
      { kind: 'missed', date: '2026-11-05' },
      { kind: 'done', date: '2026-11-06' },
      { kind: 'done', date: '2026-11-07' },
      { kind: 'today', date: TODAY, done: false, count: 0 },
      { kind: 'gift', date: '2026-11-09', streakDay: 14 },
      { kind: 'locked', date: '2026-11-10', streakDay: 15 },
    ]);
  });

  it('today done counts already: the next days are 14 and 15 when the streak is 13', () => {
    const doneToday = [...days.slice(0, -1), day(TODAY, 'done')];
    const nodes = buildPath(
      habit({ streak: { current: 13, best: 13, unit: 'days' } }),
      doneToday,
      TODAY,
    );
    expect(nodes.find((n) => n.kind === 'today')).toMatchObject({ done: true });
    expect(nodes.slice(-2).map((n) => 'streakDay' in n && n.streakDay)).toEqual([14, 15]);
  });

  it('only due days ahead; a day off today shows as rest', () => {
    const monWedFri = habit({
      schedule: { frequency: 'WEEKLY_DAYS', weekdays: [1, 3, 5] },
      dueToday: false,
      streak: { current: 2, best: 2, unit: 'days' },
    });
    const nodes = buildPath(monWedFri, [day(TODAY, 'off')], TODAY);
    expect(nodes).toEqual([
      { kind: 'rest', date: TODAY },
      { kind: 'locked', date: '2026-11-09', streakDay: 3 }, // Mon
      { kind: 'locked', date: '2026-11-11', streakDay: 4 }, // Wed
    ]);
  });

  it('the challenge’s last day is a milestone too; weeks-based streaks have none', () => {
    expect(isMilestone(21, 21)).toBe(true);
    expect(isMilestone(10, 10)).toBe(true);
    expect(isMilestone(9, 21)).toBe(false);
    const weekly = habit({
      schedule: { frequency: 'TIMES_PER_WEEK', timesPerWeek: 3 },
      streak: { current: 6, best: 6, unit: 'weeks' },
    });
    expect(
      buildPath(weekly, [day(TODAY, 'today')], TODAY).filter((n) => n.kind === 'gift'),
    ).toEqual([]);
  });

  it('icons fall back to a flame', () => {
    expect(habitIcon('dumbbell')).toBe('dumbbell');
    expect(habitIcon(null)).toBe('flame');
    expect(habitIcon('rocket')).toBe('flame');
  });
});
