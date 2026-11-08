import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { TokenService } from '../src/modules/auth/token.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createUser } from './factories.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

const account = {
  email: 'tina@example.com',
  password: 'correct horse battery',
  displayName: 'Tina',
};

describe('POST /auth/login (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const login = (body: object) =>
    request(app.getHttpServer()).post('/api/v1/auth/login').send(body);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(account).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with the user and an access token for that user', async () => {
    const res = await login({ email: account.email, password: account.password }).expect(200);

    expect(res.body.data.user).toMatchObject({ email: account.email, displayName: 'Tina' });
    const claims = await app.get(TokenService).verifyAccessToken(res.body.data.accessToken);
    expect(claims.userId).toBe(res.body.data.user.id);
  });

  it('matches the email in any letter case', async () => {
    await login({ email: ' TINA@Example.com', password: account.password }).expect(200);
  });

  it('gives the same 401 for a wrong password and an unknown email', async () => {
    const wrongPassword = await login({ email: account.email, password: 'wrong password!' });
    const unknownEmail = await login({ email: 'nobody@example.com', password: account.password });

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
        details: [],
      });
    }
  });

  it('rejects a deleted account with the same 401', async () => {
    const passwordHash = await new PasswordService().hash('deleted user password');
    await createUser(prisma, {
      email: 'gone@example.com',
      passwordHash,
      deletedAt: new Date(),
    });

    const res = await login({ email: 'gone@example.com', password: 'deleted user password' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('does not apply the new-password rules to login', async () => {
    const res = await login({ email: account.email, password: 'short' });
    expect(res.status).toBe(401); // wrong password, not a 400 about length
  });

  it('returns 400 when the password is missing', async () => {
    const res = await login({ email: account.email }).expect(400);
    expect(res.body.error.details).toEqual([{ field: 'password', message: expect.any(String) }]);
  });
});
