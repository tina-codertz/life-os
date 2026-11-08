import type { INestApplication } from '@nestjs/common';
import type { TokenPair } from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { hashRefreshToken } from '../src/modules/auth/session.service.js';
import { TokenService } from '../src/modules/auth/token.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

const account = {
  email: 'tina@example.com',
  password: 'correct horse battery',
  displayName: 'Tina',
};

describe('Sessions: refresh, logout, logout-all (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let phone: TokenPair; // from register
  let userId: string;

  const http = () => request(app.getHttpServer());
  const refresh = (refreshToken: string) =>
    http().post('/api/v1/auth/refresh').send({ refreshToken });
  const login = (deviceName: string) =>
    http()
      .post('/api/v1/auth/login')
      .send({ email: account.email, password: account.password, deviceName })
      .expect(200);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ ...account, deviceName: 'Phone' })
      .expect(201);
    phone = res.body.data;
    userId = res.body.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores only a hash of the refresh token, linked to the access token by sid', async () => {
    const sessions = await prisma.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.refreshTokenHash).toBe(hashRefreshToken(phone.refreshToken));
    expect(sessions[0]?.refreshTokenHash).not.toContain(phone.refreshToken);
    expect(sessions[0]?.deviceName).toBe('Phone');

    const claims = await app.get(TokenService).verifyAccessToken(phone.accessToken);
    expect(claims).toEqual({ userId, sessionId: sessions[0]?.familyId });
  });

  it('exchanges a refresh token for a new working pair', async () => {
    const res = await refresh(phone.refreshToken).expect(200);
    const next: TokenPair = res.body.data;

    expect(Object.keys(next).toSorted()).toEqual(['accessToken', 'refreshToken']);
    expect(next.refreshToken).not.toBe(phone.refreshToken);
    await http()
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${next.accessToken}`)
      .expect(200);
    await refresh(next.refreshToken).expect(200); // and the new one works in turn
  });

  it('ends the whole login when an old refresh token is reused', async () => {
    const next: TokenPair = (await refresh(phone.refreshToken).expect(200)).body.data;

    // Someone replays the first token: refused…
    const reuse = await refresh(phone.refreshToken).expect(401);
    expect(reuse.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    // …and the legitimate newer token is revoked too, so a thief's copy is useless either way.
    await refresh(next.refreshToken).expect(401);
    expect(await prisma.session.count({ where: { revokedAt: null } })).toBe(0);
  });

  it('lets only one of two simultaneous refreshes with the same token win', async () => {
    // Force the worst interleaving: hold each read until *both* requests have read the
    // (not yet rotated) session, so neither sees the other's write. Without the
    // compare-and-set in rotate(), both would succeed and the login would fork in two.
    const findUnique = prisma.session.findUnique.bind(prisma.session);
    let reads = 0;
    let release: (() => void) | undefined;
    const bothHaveRead = new Promise<void>((resolve) => (release = resolve));
    const spy = vi.spyOn(prisma.session, 'findUnique').mockImplementation(((
      args: Parameters<typeof findUnique>[0],
    ) =>
      findUnique(args).then(async (row) => {
        reads += 1;
        if (reads === 2) release?.();
        await bothHaveRead;
        return row;
      })) as never);

    let results;
    try {
      results = await Promise.all([refresh(phone.refreshToken), refresh(phone.refreshToken)]);
    } finally {
      spy.mockRestore();
    }

    expect(reads).toBe(2);
    expect(results.map((r) => r.status).toSorted((a, b) => a - b)).toEqual([200, 401]);
    // The loser counts as reuse, so the family is ended (the app must refresh single-flight).
    const winner = results.find((r) => r.status === 200);
    await refresh(winner?.body.data.refreshToken).expect(401);
  });

  it.each([
    ['unknown', async () => 'x'.repeat(43)],
    [
      'expired',
      async () => {
        await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
        return phone.refreshToken;
      },
    ],
    [
      'from a deleted account',
      async () => {
        await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
        return phone.refreshToken;
      },
    ],
  ])('rejects a refresh token that is %s', async (_case, tokenFor) => {
    const res = await refresh(await tokenFor()).expect(401);
    expect(res.body.error).toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Your session has ended. Please log in again.',
    });
  });

  it('logout ends this device only', async () => {
    const laptop: TokenPair = (await login('Laptop')).body.data;

    const res = await http()
      .post('/api/v1/auth/logout')
      .send({ refreshToken: phone.refreshToken })
      .expect(204);
    expect(res.text).toBe('');

    await refresh(phone.refreshToken).expect(401);
    await refresh(laptop.refreshToken).expect(200);
  });

  it('logout with an unknown token still answers 204', async () => {
    await http().post('/api/v1/auth/logout').send({ refreshToken: 'not-a-real-token' }).expect(204);
  });

  it('logout-all needs an access token, then ends every device', async () => {
    const laptop: TokenPair = (await login('Laptop')).body.data;

    await http().post('/api/v1/auth/logout-all').expect(401);
    await http()
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${laptop.accessToken}`)
      .expect(204);

    await refresh(phone.refreshToken).expect(401);
    await refresh(laptop.refreshToken).expect(401);
  });

  it('each login starts its own session family', async () => {
    await login('Laptop');
    const families = await prisma.session.groupBy({ by: ['familyId'], _count: true });
    expect(families).toHaveLength(2);
  });
});
