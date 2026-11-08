import type { INestApplication } from '@nestjs/common';
import type { AuthResult } from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

const PASSWORD = 'correct horse battery';
const NEW_PASSWORD = 'a brand new passphrase';

describe('Profile, settings and password (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tina: AuthResult;
  let juma: AuthResult;

  const http = () => request(app.getHttpServer());
  const as = (who: AuthResult) => ({
    get: (path: string) =>
      http().get(`/api/v1${path}`).set('Authorization', `Bearer ${who.accessToken}`),
    patch: (path: string, body: object) =>
      http().patch(`/api/v1${path}`).set('Authorization', `Bearer ${who.accessToken}`).send(body),
    post: (path: string, body: object) =>
      http().post(`/api/v1${path}`).set('Authorization', `Bearer ${who.accessToken}`).send(body),
  });
  const register = async (email: string, displayName: string): Promise<AuthResult> =>
    (await http().post('/api/v1/auth/register').send({ email, password: PASSWORD, displayName }))
      .body.data;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    tina = await register('tina@example.com', 'Tina');
    juma = await register('juma@example.com', 'Juma');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users/me', () => {
    it('returns the user and their settings, with defaults', async () => {
      const res = await as(tina).get('/users/me').expect(200);
      expect(res.body.data).toEqual({
        user: expect.objectContaining({ email: 'tina@example.com', displayName: 'Tina' }),
        settings: {
          timezone: 'UTC',
          followDeviceTimezone: true,
          weekStartsOn: 1,
          theme: 'SYSTEM',
          habitRemindersOn: true,
          eventReminderDefault: null,
          crashReportsOn: true,
        },
      });
    });
  });

  describe('PATCH /users/me', () => {
    it('updates the display name', async () => {
      const res = await as(tina).patch('/users/me', { displayName: '  Tina K. ' }).expect(200);
      expect(res.body.data.displayName).toBe('Tina K.');
    });

    it('records when onboarding was completed, once', async () => {
      const first = await as(tina).patch('/users/me', { onboardingCompleted: true }).expect(200);
      const completedAt = first.body.data.onboardingCompletedAt;
      expect(Date.parse(completedAt)).toBeGreaterThan(0);

      const again = await as(tina).patch('/users/me', { onboardingCompleted: true }).expect(200);
      expect(again.body.data.onboardingCompletedAt).toBe(completedAt);
    });

    it.each([
      [{ dispayName: 'typo' }],
      [{ email: 'new@example.com' }],
      [{ emailVerifiedAt: '2026-01-01T00:00:00Z' }],
    ])('rejects fields it does not accept: %j', async (body) => {
      const res = await as(tina).patch('/users/me', body).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      const user = await prisma.user.findUniqueOrThrow({ where: { id: tina.user.id } });
      expect(user).toMatchObject({ email: 'tina@example.com', emailVerifiedAt: null });
    });
  });

  describe('PATCH /users/me/settings', () => {
    it('updates only the fields sent and returns all settings', async () => {
      const res = await as(tina)
        .patch('/users/me/settings', {
          timezone: 'africa/dar_es_salaam',
          theme: 'DARK',
          weekStartsOn: 0,
          eventReminderDefault: 15,
        })
        .expect(200);

      expect(res.body.data).toMatchObject({
        timezone: 'Africa/Dar_es_Salaam',
        theme: 'DARK',
        weekStartsOn: 0,
        eventReminderDefault: 15,
        habitRemindersOn: true, // untouched
      });

      await as(tina).patch('/users/me/settings', { eventReminderDefault: null }).expect(200);
      const me = await as(tina).get('/users/me').expect(200);
      expect(me.body.data.settings).toMatchObject({ theme: 'DARK', eventReminderDefault: null });
    });

    it('returns a detail per invalid field', async () => {
      const res = await as(tina)
        .patch('/users/me/settings', { timezone: '+03:00', weekStartsOn: 9, currency: 'USD' })
        .expect(400);
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          { field: 'timezone', message: 'Choose a time zone from the list.' },
          { field: 'weekStartsOn', message: expect.any(String) },
          { field: 'currency', message: 'This field is not allowed.' },
        ]),
      );
      expect(res.body.error.details).toHaveLength(3);
    });
  });

  describe('one user can never touch another', () => {
    it("changing my profile and settings leaves everyone else's alone", async () => {
      await as(tina).patch('/users/me', { displayName: 'Changed' }).expect(200);
      await as(tina).patch('/users/me/settings', { theme: 'LIGHT' }).expect(200);

      const res = await as(juma).get('/users/me').expect(200);
      expect(res.body.data.user).toMatchObject({ id: juma.user.id, displayName: 'Juma' });
      expect(res.body.data.settings.theme).toBe('SYSTEM');
    });

    it('a body cannot name a different user', async () => {
      await as(tina).patch('/users/me', { id: juma.user.id, displayName: 'Hacked' }).expect(400);
      await as(tina)
        .patch('/users/me/settings', { userId: juma.user.id, theme: 'DARK' })
        .expect(400);

      const res = await as(juma).get('/users/me').expect(200);
      expect(res.body.data.user.displayName).toBe('Juma');
      expect(res.body.data.settings.theme).toBe('SYSTEM');
    });

    it('there is no route that takes a user ID', async () => {
      await as(tina).get(`/users/${juma.user.id}`).expect(404);
    });

    it('every route needs a token', async () => {
      await http().get('/api/v1/users/me').expect(401);
      await http().patch('/api/v1/users/me').send({ displayName: 'x' }).expect(401);
      await http().patch('/api/v1/users/me/settings').send({ theme: 'DARK' }).expect(401);
      await http()
        .post('/api/v1/users/me/change-password')
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
        .expect(401);
    });
  });

  describe('POST /users/me/change-password', () => {
    it('changes the password, keeps this device in and logs out the others', async () => {
      const laptop: AuthResult = (
        await http()
          .post('/api/v1/auth/login')
          .send({ email: 'tina@example.com', password: PASSWORD, deviceName: 'Laptop' })
          .expect(200)
      ).body.data;
      const refresh = (token: string) =>
        http().post('/api/v1/auth/refresh').send({ refreshToken: token });

      await as(tina)
        .post('/users/me/change-password', { currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
        .expect(204);

      await refresh(tina.refreshToken).expect(200); // this device
      await refresh(laptop.refreshToken).expect(401); // the other one
      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'tina@example.com', password: NEW_PASSWORD })
        .expect(200);
      // Juma's sessions are untouched.
      await refresh(juma.refreshToken).expect(200);
    });

    it('answers a wrong current password with 403, not 401 (which would log the app out)', async () => {
      const res = await as(tina)
        .post('/users/me/change-password', {
          currentPassword: 'not my password',
          newPassword: NEW_PASSWORD,
        })
        .expect(403);
      expect(res.body.error.code).toBe('WRONG_PASSWORD');
      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'tina@example.com', password: PASSWORD })
        .expect(200);
    });

    it('applies the new-password rules', async () => {
      const res = await as(tina)
        .post('/users/me/change-password', { currentPassword: PASSWORD, newPassword: PASSWORD })
        .expect(400);
      expect(res.body.error.details[0]).toMatchObject({ field: 'newPassword' });
    });
  });

  it('a deleted account gets 401 on every route', async () => {
    await prisma.user.update({ where: { id: tina.user.id }, data: { deletedAt: new Date() } });
    await as(tina).get('/users/me').expect(401);
    await as(tina).patch('/users/me', { displayName: 'x' }).expect(401);
    await as(tina).patch('/users/me/settings', { theme: 'DARK' }).expect(401);
  });
});
