import type {
  CalendarEvent,
  CalendarHabit,
  CalendarRange,
  PublicCategory,
  PublicTask,
} from '@life-os/shared';
import {
  type CalendarItem,
  hourRange,
  itemsOn,
  kindsOn,
  minutesNow,
  placeBlocks,
} from './calendar-items';

const DAY = '2026-11-08';
const NO_CATEGORIES = new Map<string, PublicCategory>();

const event = (o: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'e1',
  title: 'Lunch with Amina',
  notes: null,
  location: null,
  color: 'orange',
  startDate: DAY,
  endDate: DAY,
  startTime: 750,
  endTime: 810,
  recurrenceRule: null,
  recurrenceUntil: null,
  reminderMinutes: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...o,
});
const task = (o: Partial<PublicTask>): PublicTask => ({
  id: 't1',
  title: 'Deep work: auth module',
  description: null,
  priority: 'NONE',
  status: 'TODO',
  dueDate: DAY,
  dueTime: 600,
  durationMinutes: 120,
  completedAt: null,
  categoryId: null,
  goalId: null,
  milestoneId: null,
  parentId: null,
  recurrenceRule: null,
  subtaskCount: 0,
  subtasksDone: 0,
  sortOrder: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...o,
});
const habit = (o: Partial<CalendarHabit>): CalendarHabit => ({
  id: 'h1',
  name: 'Study Prisma relations',
  icon: 'book-open',
  color: 'green',
  reminderTimes: [840],
  days: [{ date: DAY, state: 'today', count: 0 }],
  ...o,
});
const range = (o: Partial<CalendarRange>): CalendarRange => ({
  from: DAY,
  to: DAY,
  events: [],
  tasks: [],
  habits: [],
  ...o,
});
const block = (key: string, start: number, end: number): CalendarItem => ({
  key,
  kind: 'event',
  id: key,
  title: key,
  color: 'orange',
  icon: 'calendar',
  done: false,
  start,
  end,
  detail: '',
});

describe('itemsOn', () => {
  it('the design’s day: a task with its length, an event, a habit at its reminder', () => {
    const items = itemsOn(
      range({ events: [event({})], tasks: [task({})], habits: [habit({})] }),
      DAY,
      NO_CATEGORIES,
    );
    expect(items.map((i) => [i.title, i.detail])).toEqual([
      ['Deep work: auth module', '10:00 – 12:00 · Task'],
      ['Lunch with Amina', '12:30 – 13:30 · Event'],
      ['Study Prisma relations', '14:00 – 14:30 · Habit'],
    ]);
  });

  it('puts untimed things in the All day row, first', () => {
    const items = itemsOn(
      range({
        events: [event({ startTime: null, endTime: null, title: 'Holiday' })],
        tasks: [task({ dueTime: null, durationMinutes: null, title: 'Pay rent' })],
        habits: [habit({ reminderTimes: [], name: 'Read' })],
      }),
      DAY,
      NO_CATEGORIES,
    );
    expect(items.map((i) => [i.title, i.start, i.detail])).toEqual([
      ['Holiday', null, 'All day · Event'],
      ['Pay rent', null, 'All day · Task'],
      ['Read', null, 'All day · Habit'],
    ]);
  });

  it('a task without a length, and one late in the day, stay inside the day', () => {
    const [short] = itemsOn(
      range({ tasks: [task({ durationMinutes: null })] }),
      DAY,
      NO_CATEGORIES,
    );
    expect(short).toMatchObject({ start: 600, end: 630 });
    const [late] = itemsOn(range({ tasks: [task({ dueTime: 1410 })] }), DAY, NO_CATEGORIES);
    expect(late).toMatchObject({ start: 1410, end: 1440, detail: '23:30 – 24:00 · Task' });
  });

  it('an event over three days: its start, the whole middle day, then its end', () => {
    const trip = event({
      startDate: '2026-11-07',
      endDate: '2026-11-09',
      startTime: 1080,
      endTime: 600,
    });
    const on = (day: string) => itemsOn(range({ events: [trip] }), day, NO_CATEGORIES)[0];
    expect(on('2026-11-07')).toMatchObject({ start: 1080, end: 1440 });
    expect(on('2026-11-08')).toMatchObject({ start: null, end: null });
    expect(on('2026-11-09')).toMatchObject({ start: 0, end: 600 });
  });

  it('only the habit’s due days; a done task or habit is marked done', () => {
    const r = range({
      tasks: [task({ status: 'DONE' })],
      habits: [habit({ days: [{ date: DAY, state: 'done', count: 1 }] })],
    });
    expect(itemsOn(r, DAY, NO_CATEGORIES).map((i) => i.done)).toEqual([true, true]);
    expect(itemsOn(r, '2026-11-09', NO_CATEGORIES)).toEqual([]);
  });

  it('a task takes its category’s colour and icon', () => {
    const work: PublicCategory = {
      id: 'c1',
      name: 'Work',
      color: 'blue',
      icon: 'briefcase',
      sortOrder: 0,
    };
    const [item] = itemsOn(
      range({ tasks: [task({ categoryId: 'c1' })] }),
      DAY,
      new Map([['c1', work]]),
    );
    expect(item).toMatchObject({ color: 'blue', icon: 'briefcase' });
  });
});

const place = (items: CalendarItem[]) =>
  placeBlocks(items).map((p) => `${p.item.key}:${p.column}/${p.columns}`);

describe('placeBlocks', () => {
  it('one column when nothing overlaps', () => {
    expect(place([block('a', 540, 570), block('b', 570, 600)])).toEqual(['a:0/1', 'b:0/1']);
  });

  it('overlapping blocks share the width; a later one reuses a free column', () => {
    expect(
      place([
        block('a', 540, 660),
        block('b', 600, 630),
        block('c', 630, 700),
        block('d', 720, 750),
      ]),
    ).toEqual(['a:0/2', 'b:1/2', 'c:1/2', 'd:0/1']);
  });

  it('three at once make three columns', () => {
    expect(place([block('a', 540, 600), block('b', 540, 600), block('c', 550, 560)])).toEqual([
      'a:0/3',
      'b:1/3',
      'c:2/3',
    ]);
  });
});

describe('hourRange', () => {
  it('8 to 18 by default, stretched for earlier or later blocks', () => {
    expect(hourRange([])).toEqual({ first: 8, last: 18 });
    expect(hourRange([block('a', 390, 420), block('b', 1290, 1350)])).toEqual({
      first: 6,
      last: 23,
    });
  });
});

describe('kindsOn', () => {
  it('a dot per kind; a habit only once it’s done', () => {
    const items = itemsOn(
      range({ events: [event({})], tasks: [task({})], habits: [habit({})] }),
      DAY,
      NO_CATEGORIES,
    );
    expect(kindsOn(items)).toEqual(['task', 'event']);
    const done = items.map((i) => (i.kind === 'habit' ? { ...i, done: true } : i));
    expect(kindsOn(done)).toEqual(['task', 'habit', 'event']);
  });
});

describe('minutesNow', () => {
  it('reads the clock in the user’s zone', () => {
    expect(minutesNow('Africa/Dar_es_Salaam', new Date('2026-11-08T07:15:00Z'))).toBe(615);
  });
});
