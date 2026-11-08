import type { INestApplication } from '@nestjs/common';
import type { AuthResult } from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';
import { withEnv } from './utils/with-env.js';

const PASSWORD = 'correct horse battery';

// The only e2e file with rate limiting on. Counters live in memory, so each test boots a
// fresh app to start from zero. All requests come from one IP (127.0.0.1).
describe('Rate limiting (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const login = (password: string) =>
    http().post('/api/v1/auth/login').send({ email: 'tina@example.com', password });
  const register = async (email: string): Promise<AuthResult> =>
    (
      await http()
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, displayName: 'X' })
    ).body.data;
  const changePassword = (who: AuthResult) =>
    http()
      .post('/api/v1/users/me/change-password')
      .set('Authorization', `Bearer ${who.accessToken}`)
      .send({ currentPassword: 'not it at all', newPassword: 'some new passphrase' });

  beforeEach(async () => {
    app = await withEnv({ RATE_LIMIT_ENABLED: 'true' }, () => createTestApp());
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows 5 login attempts a minute, then answers 429 RATE_LIMITED with Retry-After', async () => {
    for (let i = 0; i < 5; i += 1) await login('wrong password').expect(401);

    const res = await login(PASSWORD).expect(429); // even the right password, now
    expect(res.body.error).toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a minute and try again.',
    });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('counts each endpoint separately', async () => {
    for (let i = 0; i < 5; i += 1) await login('wrong password').expect(401);
    await http().post('/api/v1/auth/forgot-password').send({ email: 'x@example.com' }).expect(204);
  });

  it('counts logged-in users per user, not per IP', async () => {
    const tina = await register('tina@example.com');
    const juma = await register('juma@example.com');

    for (let i = 0; i < 5; i += 1) await changePassword(tina).expect(403);
    await changePassword(tina).expect(429);
    // Same IP, different user: not blocked.
    await changePassword(juma).expect(403);
  });

  it('allows 100 general requests a minute per user', async () => {
    const { accessToken } = (
      await http()
        .post('/api/v1/auth/register')
        .send({ email: 'tina@example.com', password: PASSWORD, displayName: 'Tina' })
    ).body.data as AuthResult;
    const me = () => http().get('/api/v1/users/me').set('Authorization', `Bearer ${accessToken}`);

    for (let i = 0; i < 100; i += 1) await me().expect(200);
    await me().expect(429);
  });

  it('never limits the health check', async () => {
    for (let i = 0; i < 110; i += 1) await http().get('/api/v1/health').expect(200);
  });
});
