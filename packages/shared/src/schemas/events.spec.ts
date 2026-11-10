import { describe, expect, it } from 'vitest';
import {
  calendarQuerySchema,
  createEventSchema,
  eventOccurrences,
  updateEventSchema,
} from './events.ts';

describe('createEventSchema', () => {
  it('needs a title and a day; no times means all day', () => {
    expect(createEventSchema.parse({ title: ' Holiday ', startDate: '2026-12-24' })).toEqual({
      title: 'Holiday',
      startDate: '2026-12-24',
    });
  });

  it('accepts a full repeating event', () => {
    const event = {
      title: 'Stand-up',
      notes: 'Team call',
      location: 'Office',
      color: 'blue',
      startDate: '2026-11-09',
      endDate: '2026-11-09',
      startTime: 540,
      endTime: 570,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      recurrenceUntil: '2026-12-31',
      reminderMinutes: 10,
    };
    expect(createEventSchema.parse(event)).toEqual(event);
  });

  it('may run past midnight into the next day', () => {
    const late = { startDate: '2026-11-09', endDate: '2026-11-10', startTime: 1380, endTime: 60 };
    expect(createEventSchema.safeParse({ title: 'Night bus', ...late }).success).toBe(true);
  });

  it.each([
    [{ title: '', startDate: '2026-11-09' }, 'title'],
    [{ title: 'A', startDate: '2026-02-30' }, 'startDate'],
    [{ title: 'A', startDate: '2026-11-09', startTime: 540 }, 'endTime'], // start, no end
    [{ title: 'A', startDate: '2026-11-09', startTime: 600, endTime: 600 }, 'endTime'],
    [{ title: 'A', startDate: '2026-11-09', endDate: '2026-11-08' }, 'endDate'],
    [{ title: 'A', startDate: '2026-11-01', endDate: '2026-11-15' }, 'endDate'], // 15 days
    [{ title: 'A', startDate: '2026-11-09', recurrenceUntil: '2026-12-01' }, 'recurrenceUntil'],
    [
      {
        title: 'A',
        startDate: '2026-11-09',
        recurrenceRule: 'FREQ=DAILY',
        recurrenceUntil: '2026-11-08',
      },
      'recurrenceUntil',
    ],
    [{ title: 'A', startDate: '2026-11-09', color: 'gold' }, 'color'],
    [{ title: 'A', startDate: '2026-11-09', reminderMinutes: 10_081 }, 'reminderMinutes'],
  ])('rejects %j (field %s)', (input, field) => {
    expect(createEventSchema.safeParse(input).error?.issues[0]?.path).toEqual([field]);
  });
});

describe('updateEventSchema', () => {
  it('is strict and lets null clear a field', () => {
    expect(updateEventSchema.parse({ location: null, startTime: null, endTime: null })).toEqual({
      location: null,
      startTime: null,
      endTime: null,
    });
    expect(updateEventSchema.safeParse({ userId: 'x' }).success).toBe(false);
  });
});

describe('calendarQuerySchema', () => {
  it.each([
    [{ from: '2026-11-08', to: '2026-11-01' }, 'to'],
    [{ from: '2026-11-01', to: '2027-01-02' }, 'to'], // 63 days
  ])('refuses %j on %s', (query, field) => {
    expect(calendarQuerySchema.safeParse(query).error?.issues[0]?.path).toEqual([field]);
  });

  it('takes up to 62 days', () => {
    expect(calendarQuerySchema.safeParse({ from: '2026-11-01', to: '2027-01-01' }).success).toBe(
      true,
    );
  });
});

const starts = (list: { startDate: string }[]) => list.map((o) => o.startDate);

describe('eventOccurrences', () => {
  const once = {
    startDate: '2026-11-09',
    endDate: '2026-11-09',
    recurrenceRule: null,
    recurrenceUntil: null,
  };

  it('a one-off event is in the range only if one of its days is', () => {
    expect(eventOccurrences(once, '2026-11-01', '2026-11-30')).toHaveLength(1);
    expect(eventOccurrences(once, '2026-11-10', '2026-11-30')).toHaveLength(0);
    const trip = { ...once, endDate: '2026-11-12' };
    expect(eventOccurrences(trip, '2026-11-12', '2026-11-20')).toHaveLength(1);
  });

  it('repeats on the rule’s days, from the first day to the end date', () => {
    const weekly = {
      ...once,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TH',
      recurrenceUntil: '2026-11-19',
    };
    expect(starts(eventOccurrences(weekly, '2026-11-01', '2026-11-30'))).toEqual([
      '2026-11-09',
      '2026-11-12',
      '2026-11-16',
      '2026-11-19',
    ]);
  });

  it('keeps each occurrence as long as the first, including one that began before the range', () => {
    const weekend = {
      startDate: '2026-11-07',
      endDate: '2026-11-08',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=SA',
      recurrenceUntil: null,
    };
    expect(eventOccurrences(weekend, '2026-11-15', '2026-11-21')).toEqual([
      { ...weekend, startDate: '2026-11-14', endDate: '2026-11-15' },
      { ...weekend, startDate: '2026-11-21', endDate: '2026-11-22' },
    ]);
  });

  it('nothing before the series starts', () => {
    const daily = { ...once, recurrenceRule: 'FREQ=DAILY' };
    expect(eventOccurrences(daily, '2026-10-01', '2026-10-31')).toEqual([]);
  });
});
