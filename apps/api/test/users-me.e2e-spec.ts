import type { INestApplication } from '@nestjs/common';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { type Env, ENV } from '../src/config/env.js';
import { TokenService } from '../src/modules/auth/token.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

const account = {
  email: 'tina@example.com',
  password: 'correct horse battery',
  displayName: 'Tina',
};

describe('Authentication on protected routes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const me = (authorization?: string) => {
    const req = request(app.getHttpServer()).get('/api/v1/users/me');
    return authorization === undefined ? req : req.set('Authorization', authorization);
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(account)
      .expect(201);
    accessToken = res.body.data.accessToken;
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the logged-in user for a valid token', async () => {
    const res = await me(`Bearer ${accessToken}`).expect(200);
    expect(res.body.data.user).toMatchObject({ id: userId, email: account.email });
  });

  it.each([
    ['no Authorization header', undefined],
    ['a non-Bearer scheme', 'Basic dGluYTpwYXNz'],
    ['a malformed token', 'Bearer not-a-jwt'],
  ])('returns 401 UNAUTHENTICATED for %s', async (_case, authorization) => {
    const res = await me(authorization).expect(401);
    expect(res.headers['www-authenticate']).toBe('Bearer');
    expect(res.body.error).toEqual({
      code: 'UNAUTHENTICATED',
      message: 'Log in to continue.',
      details: [],
      requestId: res.headers['x-request-id'],
    });
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = await new SignJWT({ sid: 'session-1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer('life-os-api')
      .setAudience('life-os-app')
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('an-attacker-guessed-secret-of-32-chars'));
    await me(`Bearer ${forged}`).expect(401);
  });

  it('rejects an expired token', async () => {
    const secret = new TextEncoder().encode(app.get<Env>(ENV).JWT_ACCESS_SECRET);
    const expired = await new SignJWT({ sid: 'session-1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer('life-os-api')
      .setAudience('life-os-app')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 20 * 60)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 5 * 60)
      .sign(secret);
    await me(`Bearer ${expired}`).expect(401);
  });

  it('rejects a valid token once the account is deleted', async () => {
    await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
    const res = await me(`Bearer ${accessToken}`).expect(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('identifies the user only from the token', async () => {
    const other = await app.get(TokenService).signAccessToken({
      userId: '00000000-0000-7000-8000-000000000000',
      sessionId: '00000000-0000-4000-8000-000000000000',
    });
    // A token for a user that doesn't exist: 401, never someone else's data.
    await me(`Bearer ${other}`).expect(401);
  });

  it('keeps health, register and login public', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: account.email, password: account.password })
      .expect(200);
  });

  it('still answers 404 for unknown routes, with or without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
  });
});
