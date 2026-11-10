import type { INestApplication } from '@nestjs/common';
import {
  addDays,
  type AuthResult,
  type CalendarRange,
  localToday,
  type PublicEvent,
} from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

const PASSWORD = 'correct horse battery';
const ZONE = 'Africa/Dar_es_Salaam';
const today = () => localToday(ZONE);

describe('Calendar (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tina: AuthResult;
  let juma: AuthResult;

  const http = () => request(app.getHttpServer());
  const as = (who: AuthResult) => {
    const auth = { Authorization: `Bearer ${who.accessToken}` };
    return {
      create: (body: object) => http().post('/api/v1/events').set(auth).send(body),
      get: (id: string) => http().get(`/api/v1/events/${id}`).set(auth),
      update: (id: string, body: object) =>
        http().patch(`/api/v1/events/${id}`).set(auth).send(body),
      remove: (id: string) => http().delete(`/api/v1/events/${id}`).set(auth),
      calendar: (from: string, to: string) =>
        http().get(`/api/v1/calendar?from=${from}&to=${to}`).set(auth),
      post: (path: string, body: object) => http().post(`/api/v1/${path}`).set(auth).send(body),
    };
  };
  const register = async (email: string): Promise<AuthResult> =>
    (
      await http()
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, displayName: 'X' })
        .expect(201)
    ).body.data;
  const newEvent = async (who: AuthResult, body: object = {}): Promise<PublicEvent> =>
    (
      await as(who)
        .create({ title: 'Lunch with Amina', startDate: '2026-11-08', ...body })
        .expect(201)
    ).body.data;
  const range = async (who: AuthResult, from: string, to: string): Promise<CalendarRange> =>
    (await as(who).calendar(from, to).expect(200)).body.data;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    tina = await register('tina@example.com');
    juma = await register('juma@example.com');
    await prisma.userSettings.update({ where: { userId: tina.user.id }, data: { timezone: ZONE } });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('events (FR-CAL-002)', () => {
    it('a new event: one day, all day, the default colour', async () => {
      const event = await newEvent(tina, { title: '  Holiday ' });
      expect(event).toEqual({
        id: expect.any(String),
        title: 'Holiday',
        notes: null,
        location: null,
        color: 'orange',
        startDate: '2026-11-08',
        endDate: '2026-11-08',
        startTime: null,
        endTime: null,
        recurrenceRule: null,
        recurrenceUntil: null,
        reminderMinutes: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect((await as(tina).get(event.id).expect(200)).body.data).toEqual(event);
    });

    it('refuses an end before the start, or a start time without an end', async () => {
      const bad = await as(tina)
        .create({ title: 'A', startDate: '2026-11-08', startTime: 600, endTime: 540 })
        .expect(400);
      expect(bad.body.error.details).toEqual([
        { field: 'endTime', message: 'End after the start.' },
      ]);
      await as(tina).create({ title: 'A', startDate: '2026-11-08', startTime: 600 }).expect(400);
    });

    it('a change is checked against the stored event, with the same rules', async () => {
      const event = await newEvent(tina, { startTime: 750, endTime: 810 });
      // Only a new start, now after the stored end: refused.
      const res = await as(tina).update(event.id, { startTime: 900 }).expect(400);
      expect(res.body.error.details).toEqual([
        { field: 'endTime', message: 'End after the start.' },
      ]);
      // Both times cleared: all day.
      const allDay = (
        await as(tina).update(event.id, { startTime: null, endTime: null }).expect(200)
      ).body.data;
      expect(allDay).toMatchObject({ startTime: null, endTime: null });
      // An end date only goes on a repeating event, and goes when the repeat does.
      await as(tina).update(event.id, { recurrenceUntil: '2026-12-01' }).expect(400);
      const weekly = (
        await as(tina)
          .update(event.id, {
            recurrenceRule: 'FREQ=WEEKLY;BYDAY=SU',
            recurrenceUntil: '2026-12-01',
          })
          .expect(200)
      ).body.data;
      expect(weekly.recurrenceUntil).toBe('2026-12-01');
      const once = (await as(tina).update(event.id, { recurrenceRule: null }).expect(200)).body
        .data;
      expect(once).toMatchObject({ recurrenceRule: null, recurrenceUntil: null });
    });

    it('PATCH is strict; title, place, notes and colour change; empty text clears', async () => {
      const event = await newEvent(tina, { location: 'Café', notes: 'Bring the book' });
      await as(tina).update(event.id, { userId: juma.user.id }).expect(400);
      const changed = (
        await as(tina)
          .update(event.id, { title: 'Lunch', location: '', color: 'blue', reminderMinutes: 15 })
          .expect(200)
      ).body.data;
      expect(changed).toMatchObject({
        title: 'Lunch',
        location: null,
        notes: 'Bring the book',
        color: 'blue',
        reminderMinutes: 15,
      });
    });

    it('delete is soft and final for the API; another user’s event is not found', async () => {
      const event = await newEvent(tina);
      await as(juma).get(event.id).expect(404);
      await as(juma).update(event.id, { title: 'Mine' }).expect(404);
      await as(juma).remove(event.id).expect(404);
      await as(tina).get('not-a-uuid').expect(404);

      await as(tina).remove(event.id).expect(204);
      const gone = await as(tina).get(event.id).expect(404);
      expect(gone.body.error.code).toBe('EVENT_NOT_FOUND');
      expect(await prisma.event.count({ where: { id: event.id } })).toBe(1); // still stored
      expect((await range(tina, '2026-11-01', '2026-11-30')).events).toEqual([]);
    });

    it('needs a login', async () => {
      await http().post('/api/v1/events').send({ title: 'A', startDate: '2026-11-08' }).expect(401);
      await http().get('/api/v1/calendar?from=2026-11-01&to=2026-11-30').expect(401);
    });
  });

  describe('GET /calendar (FR-CAL-001, 003, 004, 005)', () => {
    it('refuses a backwards or too-long range', async () => {
      await as(tina).calendar('2026-11-30', '2026-11-01').expect(400);
      await as(tina).calendar('2026-11-01', '2027-01-02').expect(400); // 63 days
    });

    it('spreads a repeating event over its days, ordered by day and time', async () => {
      const standUp = await newEvent(tina, {
        title: 'Stand-up',
        startDate: '2026-11-02',
        startTime: 540,
        endTime: 570,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
        recurrenceUntil: '2026-11-06',
      });
      await newEvent(tina, {
        title: 'Lunch',
        startDate: '2026-11-04',
        startTime: 750,
        endTime: 810,
      });
      await newEvent(tina, { title: 'Holiday', startDate: '2026-11-04' }); // all day: first
      await newEvent(juma, { title: 'Theirs', startDate: '2026-11-04' });

      const { events } = await range(tina, '2026-11-01', '2026-11-30');
      expect(events.map((e) => `${e.startDate} ${e.title}`)).toEqual([
        '2026-11-02 Stand-up',
        '2026-11-03 Stand-up',
        '2026-11-04 Holiday',
        '2026-11-04 Stand-up',
        '2026-11-04 Lunch',
        '2026-11-05 Stand-up',
        '2026-11-06 Stand-up',
      ]);
      expect(events.every((e) => e.title !== 'Stand-up' || e.id === standUp.id)).toBe(true);
    });

    it('finds events that began before the range and still run into it', async () => {
      await newEvent(tina, { title: 'Trip', startDate: '2026-10-29', endDate: '2026-11-02' });
      await newEvent(tina, {
        title: 'Retreat',
        startDate: '2026-10-24',
        endDate: '2026-10-25',
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=SA',
        recurrenceUntil: '2026-10-31',
      });
      const { events } = await range(tina, '2026-11-01', '2026-11-07');
      expect(events.map((e) => [e.title, e.startDate, e.endDate])).toEqual([
        ['Trip', '2026-10-29', '2026-11-02'],
        ['Retreat', '2026-10-31', '2026-11-01'],
      ]);
    });

    it('shows top-level tasks due in the range, done ones too, with their length', async () => {
      const task = async (body: object) =>
        (
          await as(tina)
            .post('tasks', { title: 'T', ...body })
            .expect(201)
        ).body.data;
      const deep = await task({
        title: 'Deep work',
        dueDate: '2026-11-08',
        dueTime: 600,
        durationMinutes: 120,
      });
      await task({ title: 'Untimed', dueDate: '2026-11-08' });
      await task({ title: 'Later', dueDate: '2026-12-01' });
      await task({ title: 'No date' });
      await as(tina).post(`tasks/${deep.id}/subtasks`, { title: 'Step' }).expect(201);
      const done = await task({ title: 'Done', dueDate: '2026-11-07' });
      await as(tina).post(`tasks/${done.id}/complete`, {}).expect(200);

      const { tasks } = await range(tina, '2026-11-01', '2026-11-30');
      expect(tasks.map((t) => t.title)).toEqual(['Done', 'Untimed', 'Deep work']);
      expect(tasks[2]).toMatchObject({ durationMinutes: 120, subtaskCount: 1, subtasksDone: 0 });
      expect(tasks[0]?.status).toBe('DONE');
    });

    it('shows habits on the days they’re due, with their reminder times', async () => {
      const start = today();
      const habit = async (body: object) =>
        (
          await as(tina)
            .post('habits', { color: 'green', startDate: start, ...body })
            .expect(201)
        ).body.data;
      // Weekly on the weekday of today + 1 only.
      const weekday = new Date(`${addDays(start, 1)}T00:00:00Z`).getUTCDay();
      const study = await habit({
        name: 'Study',
        reminderTimes: [840],
        schedule: { frequency: 'WEEKLY_DAYS', weekdays: [weekday] },
      });
      const read = await habit({ name: 'Read', schedule: { frequency: 'DAILY' } });
      await as(tina).post(`habits/${read.id}/completions`, { localDate: start }).expect(201);

      const { habits } = await range(tina, addDays(start, -3), addDays(start, 7));
      expect(habits.map((h) => h.name)).toEqual(['Study', 'Read']);
      const [s, r] = habits;
      expect(s).toMatchObject({ id: study.id, color: 'green', reminderTimes: [840] });
      // Only its weekday (a week later is past the range); never before it started.
      expect(s?.days.map((d) => d.date)).toEqual([addDays(start, 1)]);
      expect(r?.days[0]).toEqual({ date: start, state: 'done', count: 1 });
      expect(r?.days).toHaveLength(8); // today … today + 7
    });
  });
});
