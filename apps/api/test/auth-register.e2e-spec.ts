import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createUser } from './factories.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

const valid = { email: 'tina@example.com', password: 'correct horse battery', displayName: 'Tina' };

describe('POST /auth/register (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const register = (body: object) =>
    request(app.getHttpServer()).post('/api/v1/auth/register').send(body);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates the user, logs them in, and returns no password data', async () => {
    const res = await register({ ...valid, email: '  Tina@Example.COM ' }).expect(201);

    expect(res.body).toEqual({
      data: {
        user: {
          id: expect.any(String),
          email: 'tina@example.com',
          displayName: 'Tina',
          emailVerifiedAt: null,
          onboardingCompletedAt: null,
          createdAt: expect.any(String),
        },
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password|argon2/i);
  });

  it('stores an argon2id hash, never the password, and creates default settings', async () => {
    await register(valid).expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: valid.email },
      include: { settings: true },
    });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.passwordHash).not.toContain(valid.password);
    expect(user.settings).toMatchObject({ timezone: 'UTC', theme: 'SYSTEM' });
  });

  it('ignores fields the client is not allowed to set', async () => {
    const res = await register({ ...valid, role: 'ADMIN', emailVerifiedAt: '2026-01-01' }).expect(
      201,
    );

    expect(res.body.data.user.emailVerifiedAt).toBeNull();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: valid.email } });
    expect(user.role).toBe('USER');
  });

  it('returns 409 EMAIL_TAKEN for an existing email in any letter case', async () => {
    await createUser(prisma, { email: 'tina@example.com' });

    const res = await register({ ...valid, email: 'TINA@example.com' }).expect(409);
    expect(res.body.error).toMatchObject({ code: 'EMAIL_TAKEN', details: [] });
  });

  it('lets exactly one of two simultaneous sign-ups with the same email succeed', async () => {
    const results = await Promise.all([register(valid), register(valid)]);

    expect(results.map((r) => r.status).toSorted((a, b) => a - b)).toEqual([201, 409]);
    // The loser hits the unique index, not a pre-check: it must still be EMAIL_TAKEN,
    // not the filter's generic CONFLICT.
    const loser = results.find((r) => r.status === 409);
    expect(loser?.body.error.code).toBe('EMAIL_TAKEN');
    expect(await prisma.user.count()).toBe(1);
  });

  it('returns 400 with a detail per invalid field', async () => {
    const res = await register({ email: 'nope', password: 'password123', displayName: '' }).expect(
      400,
    );

    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toEqual([
      { field: 'email', message: 'Enter a valid email address.' },
      { field: 'password', message: expect.stringMatching(/too common/) },
      { field: 'displayName', message: 'Enter your name.' },
    ]);
    expect(await prisma.user.count()).toBe(0);
  });
});
