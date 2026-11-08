import type { INestApplication } from '@nestjs/common';
import { addDays, type AuthResult, localToday, type Progress } from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

const PASSWORD = 'correct horse battery';
const ZONE = 'Africa/Dar_es_Salaam';
const today = () => localToday(ZONE);

const auth = (who: AuthResult) => ({ Authorization: `Bearer ${who.accessToken}` });

// XP (+15 a task, +5 a habit day) and the overall 🔥 streak, through the real endpoints.
describe('Progress: XP and the overall streak (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tina: AuthResult;
  let juma: AuthResult;

  const http = () => request(app.getHttpServer());
  const progress = async (who: AuthResult): Promise<Progress> =>
    (await http().get('/api/v1/progress').set(auth(who)).expect(200)).body.data;
  const post = (who: AuthResult, path: string, body?: object) =>
    http().post(`/api/v1${path}`).set(auth(who)).send(body);
  const register = async (email: string): Promise<AuthResult> =>
    (
      await http()
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, displayName: 'X' })
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
    await prisma.userSettings.update({ where: { userId: tina.user.id }, data: { timezone: ZONE } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('a task pays +15 once; un-completing takes it back', async () => {
    const task = (await post(tina, '/tasks', { title: 'Pay rent' }).expect(201)).body.data;
    await post(tina, `/tasks/${task.id}/complete`).expect(200);
    await post(tina, `/tasks/${task.id}/complete`).expect(200); // again: no more XP
    expect((await progress(tina)).xp).toBe(15);
    await post(tina, `/tasks/${task.id}/uncomplete`).expect(200);
    expect((await progress(tina)).xp).toBe(0);
    await post(tina, `/tasks/${task.id}/complete`).expect(200);
    expect((await progress(tina)).xp).toBe(15);
  });

  it('subtasks earn nothing on their own', async () => {
    const task = (await post(tina, '/tasks', { title: 'Move' }).expect(201)).body.data;
    const sub = (await post(tina, `/tasks/${task.id}/subtasks`, { title: 'Pack' }).expect(201)).body
      .data;
    await post(tina, `/tasks/${sub.id}/complete`).expect(200);
    expect((await progress(tina)).xp).toBe(0);
  });

  it('a habit day pays +5 once it reaches the target; undo or a lower count takes it back', async () => {
    const water = (
      await post(tina, '/habits', {
        name: 'Water',
        color: 'blue',
        targetCount: 8,
        schedule: { frequency: 'DAILY' },
      }).expect(201)
    ).body.data;
    await post(tina, `/habits/${water.id}/completions`, { localDate: today(), count: 3 }).expect(
      201,
    );
    expect((await progress(tina)).xp).toBe(0); // 3 of 8: not yet
    await post(tina, `/habits/${water.id}/completions`, { localDate: today() }).expect(201); // done
    await post(tina, `/habits/${water.id}/completions`, { localDate: today() }).expect(201); // again
    expect((await progress(tina)).xp).toBe(5);
    await post(tina, `/habits/${water.id}/completions`, { localDate: today(), count: 2 }).expect(
      201,
    );
    expect((await progress(tina)).xp).toBe(0);
    await post(tina, `/habits/${water.id}/completions`, { localDate: today() }).expect(201);
    await http()
      .delete(`/api/v1/habits/${water.id}/completions/${today()}`)
      .set(auth(tina))
      .expect(200);
    expect((await progress(tina)).xp).toBe(0);
  });

  it('the 🔥 streak: days in a row with a habit done or a task completed', async () => {
    const read = (
      await post(tina, '/habits', {
        name: 'Read',
        color: 'violet',
        startDate: addDays(today(), -5),
        schedule: { frequency: 'DAILY' },
      }).expect(201)
    ).body.data;
    for (const back of [3, 2, 1]) {
      await post(tina, `/habits/${read.id}/completions`, {
        localDate: addDays(today(), -back),
      }).expect(201);
    }
    // Nothing today yet: the run up to yesterday still counts.
    expect((await progress(tina)).streak).toEqual({ current: 3, best: 3 });
    const task = (await post(tina, '/tasks', { title: 'Call mum' }).expect(201)).body.data;
    await post(tina, `/tasks/${task.id}/complete`).expect(200); // today
    expect((await progress(tina)).streak).toEqual({ current: 4, best: 4 });
  });

  it('a habit day that hasn\u2019t reached its target doesn\u2019t count toward the streak', async () => {
    const water = (
      await post(tina, '/habits', {
        name: 'Water',
        color: 'blue',
        targetCount: 8,
        startDate: addDays(today(), -2),
        schedule: { frequency: 'DAILY' },
      }).expect(201)
    ).body.data;
    await post(tina, `/habits/${water.id}/completions`, {
      localDate: addDays(today(), -1),
      count: 3,
    }).expect(201);
    expect((await progress(tina)).streak).toEqual({ current: 0, best: 0 });
  });

  it('each person has their own XP; it needs a login', async () => {
    const task = (await post(tina, '/tasks', { title: 'Mine' }).expect(201)).body.data;
    await post(tina, `/tasks/${task.id}/complete`).expect(200);
    expect((await progress(juma)).xp).toBe(0);
    await http().get('/api/v1/progress').expect(401);
  });
});
