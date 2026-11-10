import { describe, expect, it } from 'vitest';
import {
  describeRule,
  formatRule,
  nextDueDate,
  nextOccurrence,
  occursOn,
  parseRule,
  type Recurrence,
  recurrenceRuleSchema,
  shortRule,
  weekdayOf,
} from './recurrence.ts';

const rule = (text: string) => parseRule(text) as Recurrence;

describe('parseRule / formatRule', () => {
  it.each([
    ['FREQ=DAILY', { freq: 'DAILY', interval: 1 }],
    ['FREQ=DAILY;INTERVAL=3', { freq: 'DAILY', interval: 3 }],
    ['FREQ=WEEKLY;BYDAY=WE,MO', { freq: 'WEEKLY', days: ['MO', 'WE'] }],
    ['FREQ=MONTHLY;BYMONTHDAY=31', { freq: 'MONTHLY', day: 31 }],
  ])('reads %s', (text, expected) => {
    expect(parseRule(text)).toEqual(expected);
  });

  it.each([
    '',
    'FREQ=YEARLY',
    'FREQ=DAILY;INTERVAL=0',
    'FREQ=DAILY;INTERVAL=366',
    'FREQ=DAILY;INTERVAL=2.5',
    'FREQ=DAILY;COUNT=3',
    'FREQ=WEEKLY',
    'FREQ=WEEKLY;BYDAY=',
    'FREQ=WEEKLY;BYDAY=MO,MO',
    'FREQ=WEEKLY;BYDAY=XX',
    'FREQ=MONTHLY;BYMONTHDAY=0',
    'FREQ=MONTHLY;BYMONTHDAY=32',
    'FREQ=DAILY;FREQ=DAILY',
    'FREQ=DAILY=1',
  ])('refuses %j', (text) => {
    expect(parseRule(text)).toBeNull();
  });

  it('writes each rule one way (weekdays in week order, no INTERVAL=1)', () => {
    expect(formatRule(rule('FREQ=WEEKLY;BYDAY=FR,MO'))).toBe('FREQ=WEEKLY;BYDAY=MO,FR');
    expect(formatRule({ freq: 'DAILY', interval: 1 })).toBe('FREQ=DAILY');
    expect(recurrenceRuleSchema.parse('FREQ=DAILY;INTERVAL=1')).toBe('FREQ=DAILY');
    expect(recurrenceRuleSchema.safeParse('FREQ=HOURLY').success).toBe(false);
  });
});

describe('nextOccurrence', () => {
  it('daily and every N days', () => {
    expect(nextOccurrence(rule('FREQ=DAILY'), '2026-12-31')).toBe('2027-01-01');
    expect(nextOccurrence(rule('FREQ=DAILY;INTERVAL=3'), '2026-11-08')).toBe('2026-11-11');
  });

  it('weekly: the next chosen weekday, across a week end', () => {
    expect(weekdayOf('2026-11-09')).toBe('MO');
    const monWed = rule('FREQ=WEEKLY;BYDAY=MO,WE');
    expect(nextOccurrence(monWed, '2026-11-09')).toBe('2026-11-11'); // Mon → Wed
    expect(nextOccurrence(monWed, '2026-11-11')).toBe('2026-11-16'); // Wed → next Mon
    expect(nextOccurrence(rule('FREQ=WEEKLY;BYDAY=MO'), '2026-11-09')).toBe('2026-11-16');
  });

  it('weekly across a daylight-saving change (Europe, 29 Mar 2026)', () => {
    expect(nextOccurrence(rule('FREQ=WEEKLY;BYDAY=SU'), '2026-03-22')).toBe('2026-03-29');
  });

  it('monthly: "Pay rent on the 1st" → the 1st of next month (FR-TASK-006)', () => {
    expect(nextOccurrence(rule('FREQ=MONTHLY;BYMONTHDAY=1'), '2026-12-01')).toBe('2027-01-01');
  });

  it('monthly on day 31 falls on the last day of shorter months', () => {
    const last = rule('FREQ=MONTHLY;BYMONTHDAY=31');
    expect(nextOccurrence(last, '2026-10-31')).toBe('2026-11-30');
    expect(nextOccurrence(last, '2026-11-30')).toBe('2026-12-31');
    expect(nextOccurrence(last, '2027-01-31')).toBe('2027-02-28');
    expect(nextOccurrence(last, '2028-01-31')).toBe('2028-02-29'); // leap year
  });

  it('monthly: later the same month when that day hasn’t come yet', () => {
    expect(nextOccurrence(rule('FREQ=MONTHLY;BYMONTHDAY=15'), '2026-11-01')).toBe('2026-11-15');
  });
});

describe('nextDueDate', () => {
  it('normally the occurrence after the due date, even if completed early', () => {
    expect(nextDueDate(rule('FREQ=WEEKLY;BYDAY=MO'), '2026-11-16', '2026-11-08')).toBe(
      '2026-11-23',
    );
  });

  it('skips past dates when completed late, instead of piling up overdue copies', () => {
    expect(nextDueDate(rule('FREQ=WEEKLY;BYDAY=MO'), '2026-10-05', '2026-11-08')).toBe(
      '2026-11-09',
    );
    // Today itself counts: a daily task completed late is due again today.
    expect(nextDueDate(rule('FREQ=DAILY'), '2026-11-01', '2026-11-08')).toBe('2026-11-08');
  });
});

describe('describeRule / shortRule', () => {
  it.each([
    ['FREQ=DAILY', 'Daily', 'Daily'],
    ['FREQ=DAILY;INTERVAL=3', 'Every 3 days', 'Every 3 days'],
    ['FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', 'Weekdays', 'Weekdays'],
    ['FREQ=WEEKLY;BYDAY=MO,WE', 'Weekly on Mon, Wed', 'Weekly'],
    ['FREQ=MONTHLY;BYMONTHDAY=1', 'Monthly on day 1', 'Monthly'],
  ])('%s → "%s" / "%s"', (text, long, short) => {
    expect(describeRule(rule(text))).toBe(long);
    expect(shortRule(rule(text))).toBe(short);
  });
});

// The days from…to on which a series starting on `first` falls.
const occurrenceDays = (text: string, first: string, from: string, to: string) => {
  const out: string[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`);) {
    const day = d.toISOString().slice(0, 10);
    if (occursOn(rule(text), first, day)) out.push(day);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
};

describe('occursOn', () => {
  it('every few days, counted from the first day', () => {
    expect(
      occurrenceDays('FREQ=DAILY;INTERVAL=3', '2026-11-02', '2026-10-30', '2026-11-11'),
    ).toEqual(['2026-11-02', '2026-11-05', '2026-11-08', '2026-11-11']);
  });

  it('weekly on its days, and on the first day even if that is not one of them', () => {
    // 2026-11-03 is a Tuesday.
    expect(
      occurrenceDays('FREQ=WEEKLY;BYDAY=MO,WE', '2026-11-03', '2026-11-01', '2026-11-10'),
    ).toEqual(['2026-11-03', '2026-11-04', '2026-11-09']);
  });

  it('monthly on day 31 falls on the last day of shorter months', () => {
    expect(
      occurrenceDays('FREQ=MONTHLY;BYMONTHDAY=31', '2027-01-31', '2027-01-01', '2027-04-30'),
    ).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
  });
});
