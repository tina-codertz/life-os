import { describe, expect, it } from 'vitest';
import {
  createHabitSchema,
  habitCheckInSchema,
  habitScheduleSchema,
  listHabitsQuerySchema,
  updateHabitSchema,
} from './habits.ts';

describe('habitScheduleSchema', () => {
  it('daily, some weekdays (sorted), or N times a week', () => {
    expect(habitScheduleSchema.parse({ frequency: 'DAILY' })).toEqual({ frequency: 'DAILY' });
    expect(habitScheduleSchema.parse({ frequency: 'WEEKLY_DAYS', weekdays: [5, 1, 3] })).toEqual({
      frequency: 'WEEKLY_DAYS',
      weekdays: [1, 3, 5],
    });
    expect(habitScheduleSchema.parse({ frequency: 'TIMES_PER_WEEK', timesPerWeek: 3 })).toEqual({
      frequency: 'TIMES_PER_WEEK',
      timesPerWeek: 3,
    });
  });

  it.each([
    { frequency: 'WEEKLY_DAYS', weekdays: [] },
    { frequency: 'WEEKLY_DAYS', weekdays: [1, 1] },
    { frequency: 'WEEKLY_DAYS', weekdays: [7] },
    { frequency: 'TIMES_PER_WEEK', timesPerWeek: 0 },
    { frequency: 'TIMES_PER_WEEK', timesPerWeek: 8 },
    { frequency: 'DAILY', weekdays: [1] }, // extra fields refused
    { frequency: 'HOURLY' },
  ])('refuses %j', (schedule) => {
    expect(habitScheduleSchema.safeParse(schedule).success).toBe(false);
  });
});

describe('habit bodies', () => {
  it('a habit needs a name, a colour and a schedule', () => {
    expect(
      createHabitSchema.parse({
        name: ' Read ',
        color: 'violet',
        schedule: { frequency: 'DAILY' },
      }),
    ).toEqual({ name: 'Read', color: 'violet', schedule: { frequency: 'DAILY' } });
    expect(createHabitSchema.safeParse({ name: '', color: 'violet' }).success).toBe(false);
  });

  it('PATCH is strict; check-ins take a day and an optional count', () => {
    expect(updateHabitSchema.safeParse({ streak: 5 }).success).toBe(false);
    expect(habitCheckInSchema.parse({ localDate: '2026-11-08', count: 3 })).toEqual({
      localDate: '2026-11-08',
      count: 3,
    });
    expect(habitCheckInSchema.safeParse({ localDate: '2026-02-30' }).success).toBe(false);
  });

  it('?archived=true lists archived habits; anything else, the active ones', () => {
    expect(listHabitsQuerySchema.parse({ archived: 'true' })).toEqual({ archived: true });
    expect(listHabitsQuerySchema.parse({})).toEqual({ archived: false });
  });
});
