import type { INestApplication } from '@nestjs/common';
import type { AuthResult } from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { clearInbox, waitForEmails, emailsTo } from './utils/mailpit.js';
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

  // ~8 argon2 hashes/checks (2 sign-ups, 7 wrong passwords), each slow on purpose: on a busy
  // machine that brushed the default 5 s limit about one run in seven, so it gets 20 s.
  it('counts logged-in users per user, not per IP', { timeout: 20_000 }, async () => {
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

// One account attacked from many IPs: the per-IP limit never triggers, the per-email one must.
// TRUST_PROXY_HOPS=1 makes the app read X-Forwarded-For, so each request can come "from" a
// different address, like a botnet.
describe('Per-email limits (e2e)', () => {
  let app: INestApplication<App>;
  let ipCounter = 0;
  const fromNewIp = () => {
    ipCounter += 1;
    return `203.0.113.${ipCounter % 250}`;
  };
  const http = () => request(app.getHttpServer());
  const login = (email: string, password: string) =>
    http().post('/api/v1/auth/login').set('X-Forwarded-For', fromNewIp()).send({ email, password });
  const register = (email: string) =>
    http()
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', fromNewIp())
      .send({ email, password: PASSWORD, displayName: 'X' })
      .expect(201);

  beforeEach(async () => {
    app = await withEnv({ RATE_LIMIT_ENABLED: 'true', TRUST_PROXY_HOPS: '1' }, () =>
      createTestApp(),
    );
    await resetDatabase(app.get(PrismaService));
    await register('tina@example.com');
    await register('juma@example.com');
  });

  afterEach(async () => {
    await app.close();
  });

  it('blocks an email after 10 failed logins from 10 different IPs, even with the right password', async () => {
    for (let i = 0; i < 10; i += 1) await login('tina@example.com', 'wrong password').expect(401);

    const res = await login('tina@example.com', PASSWORD).expect(429);
    expect(res.body.error).toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Too many failed attempts. Try again later, or reset your password.',
    });
    const retryAfter = Number(res.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(3500);
    expect(retryAfter).toBeLessThanOrEqual(3600);

    await login('juma@example.com', PASSWORD).expect(200); // other accounts unaffected
  });

  it('a successful login resets the count', async () => {
    for (let i = 0; i < 9; i += 1) await login('tina@example.com', 'wrong password').expect(401);
    await login('tina@example.com', PASSWORD).expect(200);
    for (let i = 0; i < 9; i += 1) await login('tina@example.com', 'wrong password').expect(401);
    await login('tina@example.com', PASSWORD).expect(200);
  });

  it('treats unknown emails exactly the same (no hint that an account exists)', async () => {
    const known: number[] = [];
    const unknown: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      known.push((await login('tina@example.com', 'wrong password')).status);
      unknown.push((await login('nobody@example.com', 'wrong password')).status);
    }
    expect(unknown).toEqual(known);
    expect(known.at(-1)).toBe(429);
  });

  it('sends at most 3 reset emails an hour to one address, still answering 204', async () => {
    await clearInbox();
    for (let i = 0; i < 5; i += 1) {
      await http()
        .post('/api/v1/auth/forgot-password')
        .set('X-Forwarded-For', fromNewIp())
        .send({ email: 'tina@example.com' })
        .expect(204);
    }
    await waitForEmails('tina@example.com', 3);
    await new Promise((resolve) => setTimeout(resolve, 300)); // room for any extra to arrive
    expect(await emailsTo('tina@example.com')).toHaveLength(3);
  });
});
