import type { PublicHabit } from '@life-os/shared';
import { MAX_PENDING_REMINDERS, planReminders, REMINDER_DAYS } from './plan';

const ZONE = 'Africa/Dar_es_Salaam'; // UTC+3, no daylight saving
// Monday 9 Nov 2026, 10:00 in Dar es Salaam.
const NOW = new Date('2026-11-09T07:00:00.000Z');

const habit = (o: Partial<PublicHabit> = {}): PublicHabit => ({
  id: 'h1',
  name: 'Read 20 min',
  icon: 'book-open',
  color: 'violet',
  targetCount: 1,
  unit: null,
  goalDays: 21,
  reminderTimes: [21 * 60],
  startDate: '2026-11-01',
  archivedAt: null,
  sortOrder: 0,
  schedule: { frequency: 'DAILY' },
  dueToday: true,
  today: null,
  streak: { current: 12, best: 12, unit: 'days' },
  chest: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...o,
});
const plan = (habits: PublicHabit[], o: { now?: Date; enabled?: boolean } = {}) =>
  planReminders(habits, { now: o.now ?? NOW, timeZone: ZONE, enabled: o.enabled ?? true });
const days = (list: ReturnType<typeof plan>) => list.map((r) => r.id.split(':')[2]);

describe('planReminders (FR-HAB-006)', () => {
  it('one a day at the time, in the user’s zone, for the next 14 days', () => {
    const list = plan([habit()]);
    expect(list).toHaveLength(REMINDER_DAYS);
    expect(list[0]).toMatchObject({
      id: 'habit-reminder:h1:2026-11-09:1260',
      habitId: 'h1',
      title: 'Read 20 min',
      body: 'Keep your 12-day streak going.',
    });
    expect(list[0]?.at.toISOString()).toBe('2026-11-09T18:00:00.000Z'); // 21:00 in Dar
    expect(days(list).at(-1)).toBe('2026-11-22');
  });

  it('skips today once it’s done, and a time that has already passed', () => {
    const done = plan([habit({ today: { localDate: '2026-11-09', count: 1, completedAt: 'x' } })]);
    expect(days(done)[0]).toBe('2026-11-10');
    const morning = plan([habit({ reminderTimes: [8 * 60, 21 * 60] })]);
    // 08:00 today has passed (it's 10:00); 21:00 hasn't.
    expect(morning.slice(0, 2).map((r) => r.id)).toEqual([
      'habit-reminder:h1:2026-11-09:1260',
      'habit-reminder:h1:2026-11-10:480',
    ]);
  });

  it('a count habit isn’t done until the target: 3 of 8 still gets today’s reminder', () => {
    const water = habit({
      targetCount: 8,
      today: { localDate: '2026-11-09', count: 3, completedAt: 'x' },
    });
    expect(days(plan([water]))[0]).toBe('2026-11-09');
  });

  it('only the habit’s days, and nothing before it starts', () => {
    const monWedFri = plan([
      habit({ schedule: { frequency: 'WEEKLY_DAYS', weekdays: [1, 3, 5] } }),
    ]);
    expect(days(monWedFri).slice(0, 4)).toEqual([
      '2026-11-09',
      '2026-11-11',
      '2026-11-13',
      '2026-11-16',
    ]);
    expect(days(plan([habit({ startDate: '2026-11-12' })]))[0]).toBe('2026-11-12');
  });

  it('none for archived habits, habits without times, or when reminders are off', () => {
    expect(plan([habit({ archivedAt: '2026-11-05T00:00:00.000Z' })])).toEqual([]);
    expect(plan([habit({ reminderTimes: [] })])).toEqual([]);
    expect(plan([habit()], { enabled: false })).toEqual([]);
  });

  it('nearest first across habits, and at most 60 (iOS keeps 64)', () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      habit({ id: `h${i}`, reminderTimes: [7 * 60 + i, 12 * 60 + i, 20 * 60 + i] }),
    );
    const list = plan(many);
    expect(list).toHaveLength(MAX_PENDING_REMINDERS);
    const times = list.map((r) => r.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(list[0]?.id).toBe('habit-reminder:h0:2026-11-09:720'); // 12:00 today comes first
  });

  it('a new streak gets a gentler line; a weekly habit counts weeks', () => {
    expect(plan([habit({ streak: { current: 0, best: 3, unit: 'days' } })])[0]?.body).toBe(
      'A small step today counts.',
    );
    const weekly = habit({
      schedule: { frequency: 'TIMES_PER_WEEK', timesPerWeek: 3 },
      streak: { current: 2, best: 2, unit: 'weeks' },
    });
    expect(plan([weekly])[0]?.body).toBe('Keep your 2-week streak going.');
  });
});
