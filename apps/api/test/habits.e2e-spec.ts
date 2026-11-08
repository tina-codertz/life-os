import type { INestApplication } from '@nestjs/common';
import {
  addDays,
  type AuthResult,
  localToday,
  MAX_HABITS,
  type PublicHabit,
  type PublicHabitCompletion,
} from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

const PASSWORD = 'correct horse battery';
const ZONE = 'Africa/Dar_es_Salaam';
const today = () => localToday(ZONE);

describe('Habits (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tina: AuthResult;
  let juma: AuthResult;

  const http = () => request(app.getHttpServer());
  const as = (who: AuthResult) => {
    const auth = { Authorization: `Bearer ${who.accessToken}` };
    return {
      list: (query = '') => http().get(`/api/v1/habits${query}`).set(auth),
      create: (body: object) => http().post('/api/v1/habits').set(auth).send(body),
      get: (id: string) => http().get(`/api/v1/habits/${id}`).set(auth),
      update: (id: string, body: object) =>
        http().patch(`/api/v1/habits/${id}`).set(auth).send(body),
      remove: (id: string) => http().delete(`/api/v1/habits/${id}`).set(auth),
      action: (id: string, name: string) => http().post(`/api/v1/habits/${id}/${name}`).set(auth),
      checkIn: (id: string, body: object) =>
        http().post(`/api/v1/habits/${id}/completions`).set(auth).send(body),
      undo: (id: string, day: string) =>
        http().delete(`/api/v1/habits/${id}/completions/${day}`).set(auth),
    };
  };
  const register = async (email: string): Promise<AuthResult> =>
    (
      await http()
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, displayName: 'X' })
        .expect(201)
    ).body.data;
  const newHabit = async (who: AuthResult, body: object = {}): Promise<PublicHabit> =>
    (
      await as(who)
        .create({ name: 'Read', color: 'violet', schedule: { frequency: 'DAILY' }, ...body })
        .expect(201)
    ).body.data;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    tina = await register('tina@example.com');
    juma = await register('juma@example.com');
    // "Today" is the user's own day, in their saved zone.
    await prisma.userSettings.update({
      where: { userId: tina.user.id },
      data: { timezone: ZONE },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create, read and list', () => {
    it('needs a name, colour and schedule; starts today in the user’s zone', async () => {
      const habit = await newHabit(tina, { name: '  Read 20 min ', icon: 'book-open' });
      expect(habit).toEqual({
        id: expect.any(String),
        name: 'Read 20 min',
        icon: 'book-open',
        color: 'violet',
        targetCount: 1,
        unit: null,
        startDate: today(),
        archivedAt: null,
        sortOrder: 0,
        schedule: { frequency: 'DAILY' },
        dueToday: true,
        today: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect((await as(tina).get(habit.id).expect(200)).body.data).toEqual(habit);
      expect((await as(tina).list().expect(200)).body.data).toEqual([habit]);
    });

    it('validates with the shared schema', async () => {
      const res = await as(tina)
        .create({ name: '', color: 'violet', schedule: { frequency: 'WEEKLY_DAYS', weekdays: [] } })
        .expect(400);
      const fields = res.body.error.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['name', 'schedule.weekdays']));
    });

    it('a weekdays habit is due only on its days', async () => {
      const weekday = new Date(`${today()}T00:00:00Z`).getUTCDay();
      const other = (weekday + 1) % 7;
      const onToday = await newHabit(tina, {
        schedule: { frequency: 'WEEKLY_DAYS', weekdays: [weekday] },
      });
      const notToday = await newHabit(tina, {
        name: 'Gym',
        schedule: { frequency: 'WEEKLY_DAYS', weekdays: [other] },
      });
      expect(onToday.dueToday).toBe(true);
      expect(notToday.dueToday).toBe(false);
    });

    it(`allows at most ${MAX_HABITS} habits`, async () => {
      await prisma.habit.createMany({
        data: Array.from({ length: MAX_HABITS }, (_, i) => ({
          userId: tina.user.id,
          name: `H${i}`,
          color: 'blue',
          startDate: new Date(`${today()}T00:00:00Z`),
        })),
      });
      const res = await as(tina)
        .create({ name: 'One more', color: 'blue', schedule: { frequency: 'DAILY' } })
        .expect(422);
      expect(res.body.error.code).toBe('HABIT_LIMIT_REACHED');
    });
  });

  describe('check-ins (FR-HAB-002)', () => {
    it('checking in is safe to repeat, and shows as today’s', async () => {
      const habit = await newHabit(tina);
      await as(tina).checkIn(habit.id, { localDate: today() }).expect(201);
      await as(tina).checkIn(habit.id, { localDate: today() }).expect(201);
      expect(await prisma.habitCompletion.count({ where: { habitId: habit.id } })).toBe(1);
      const shown = (await as(tina).get(habit.id).expect(200)).body.data as PublicHabit;
      expect(shown.today).toMatchObject({ localDate: today(), count: 1 });
    });

    it('a count habit: one tap means done; a count can also be set', async () => {
      const water = await newHabit(tina, { name: 'Water', targetCount: 8, unit: 'glasses' });
      const tap = (await as(tina).checkIn(water.id, { localDate: today() }).expect(201)).body
        .data as PublicHabitCompletion;
      expect(tap.count).toBe(8);
      const set = await as(tina).checkIn(water.id, { localDate: today(), count: 3 }).expect(201);
      expect(set.body.data.count).toBe(3);
    });

    it('backfill: up to 7 days back; never the future, older days, or before the start', async () => {
      const habit = await newHabit(tina, { startDate: addDays(today(), -10) });
      await as(tina)
        .checkIn(habit.id, { localDate: addDays(today(), -7) })
        .expect(201);
      const old = await as(tina)
        .checkIn(habit.id, { localDate: addDays(today(), -8) })
        .expect(422);
      expect(old.body.error).toMatchObject({
        code: 'CHECK_IN_OUT_OF_RANGE',
        message: 'You can only change check-ins from the last 7 days.',
      });
      const future = await as(tina)
        .checkIn(habit.id, { localDate: addDays(today(), 1) })
        .expect(422);
      expect(future.body.error.message).toBe("You can't check in for a day that hasn't come yet.");

      const newer = await newHabit(tina, { name: 'New', startDate: today() });
      const before = await as(tina)
        .checkIn(newer.id, { localDate: addDays(today(), -1) })
        .expect(422);
      expect(before.body.error.message).toBe("That's before this habit started.");
    });

    it('undo removes the day’s check-in; undoing nothing is fine; a bad date is a 400', async () => {
      const habit = await newHabit(tina);
      await as(tina).checkIn(habit.id, { localDate: today() }).expect(201);
      await as(tina).undo(habit.id, today()).expect(204);
      expect((await as(tina).get(habit.id).expect(200)).body.data.today).toBeNull();
      await as(tina).undo(habit.id, today()).expect(204);
      const bad = await as(tina).undo(habit.id, '2026-02-30').expect(400);
      expect(bad.body.error.details[0].field).toBe('localDate');
    });
  });

  describe('schedule changes (FR-HAB rule 7)', () => {
    it('a new schedule applies from today; the old one is kept for the days before', async () => {
      const habit = await newHabit(tina, { startDate: addDays(today(), -5) });
      const changed = await as(tina)
        .update(habit.id, { schedule: { frequency: 'TIMES_PER_WEEK', timesPerWeek: 3 } })
        .expect(200);
      expect(changed.body.data.schedule).toEqual({ frequency: 'TIMES_PER_WEEK', timesPerWeek: 3 });
      // A second change the same day replaces today's version, not adds another.
      await as(tina)
        .update(habit.id, { schedule: { frequency: 'WEEKLY_DAYS', weekdays: [1, 3] } })
        .expect(200);
      const versions = await prisma.habitSchedule.findMany({
        where: { habitId: habit.id },
        orderBy: { effectiveFrom: 'asc' },
      });
      expect(versions.map((v) => v.frequency)).toEqual(['DAILY', 'WEEKLY_DAYS']);
      expect(versions[1]?.effectiveFrom.toISOString().slice(0, 10)).toBe(today());
    });

    it('PATCH is strict and changes only what is sent', async () => {
      const habit = await newHabit(tina);
      await as(tina).update(habit.id, { currentStreak: 99 }).expect(400);
      const renamed = await as(tina).update(habit.id, { name: 'Read more' }).expect(200);
      expect(renamed.body.data).toMatchObject({ name: 'Read more', color: 'violet' });
    });
  });

  describe('archive and delete (FR-HAB-007)', () => {
    it('archived habits leave the list, keep their history, and can’t be checked in', async () => {
      const habit = await newHabit(tina);
      await as(tina).checkIn(habit.id, { localDate: today() }).expect(201);
      await as(tina).action(habit.id, 'archive').expect(200);
      expect((await as(tina).list().expect(200)).body.data).toEqual([]);
      const archived = (await as(tina).list('?archived=true').expect(200)).body.data;
      expect(archived.map((h: PublicHabit) => h.name)).toEqual(['Read']);
      expect(await prisma.habitCompletion.count({ where: { habitId: habit.id } })).toBe(1);
      const refused = await as(tina).checkIn(habit.id, { localDate: today() }).expect(422);
      expect(refused.body.error.message).toBe('Unarchive this habit to check in.');

      await as(tina).action(habit.id, 'unarchive').expect(200);
      expect((await as(tina).list().expect(200)).body.data).toHaveLength(1);
    });

    it('deleted habits are gone (404)', async () => {
      const habit = await newHabit(tina);
      await as(tina).remove(habit.id).expect(204);
      await as(tina).get(habit.id).expect(404);
      expect((await as(tina).list().expect(200)).body.data).toEqual([]);
    });
  });

  describe('one user can never touch another', () => {
    it('another user’s habit is 404 everywhere; a malformed id too', async () => {
      const habit = await newHabit(tina);
      await as(juma).get(habit.id).expect(404);
      await as(juma).update(habit.id, { name: 'Mine' }).expect(404);
      await as(juma).checkIn(habit.id, { localDate: today() }).expect(404);
      await as(juma).undo(habit.id, today()).expect(404);
      await as(juma).remove(habit.id).expect(404);
      await as(tina).get('not-a-uuid').expect(404);
      expect((await as(tina).get(habit.id).expect(200)).body.data.name).toBe('Read');
    });

    it('needs a login', async () => {
      await http().get('/api/v1/habits').expect(401);
    });
  });
});
