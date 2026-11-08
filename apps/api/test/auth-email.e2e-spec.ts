import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { clearInbox, emailsTo, tokenFromEmail, waitForEmails } from './utils/mailpit.js';
import { resetDatabase } from './utils/test-db.js';

const account = {
  email: 'tina@example.com',
  password: 'correct horse battery',
  displayName: 'Tina',
};
const NEW_PASSWORD = 'a brand new passphrase';

describe('Email verification and password reset (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;

  const http = () => request(app.getHttpServer());
  const post = (path: string, body: object = {}) => http().post(`/api/v1/auth/${path}`).send(body);
  const userRow = () => prisma.user.findUniqueOrThrow({ where: { email: account.email } });

  // Asks for a reset email and returns the token from its link.
  async function requestReset(): Promise<string> {
    await clearInbox();
    await post('forgot-password', { email: 'TINA@example.com' }).expect(204);
    const [email] = await waitForEmails(account.email);
    expect(email?.subject).toBe('Reset your Life OS password');
    return tokenFromEmail(email!, 'reset-password');
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    const res = await post('register', account).expect(201);
    ({ accessToken, refreshToken } = res.body.data);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('verification', () => {
    it('emails a link on register, and the link verifies the address once', async () => {
      const [email] = await waitForEmails(account.email);
      expect(email?.subject).toBe('Confirm your email for Life OS');
      expect(email?.text).toMatch(/^Hi Tina,/);
      const token = tokenFromEmail(email!, 'verify-email');

      expect((await userRow()).emailVerifiedAt).toBeNull();
      await post('verify-email', { token }).expect(204);
      expect((await userRow()).emailVerifiedAt).toBeInstanceOf(Date);

      const again = await post('verify-email', { token }).expect(400);
      expect(again.body.error.code).toBe('INVALID_LINK');
    });

    it('stores only a hash of the emailed token', async () => {
      const token = tokenFromEmail((await waitForEmails(account.email))[0]!, 'verify-email');
      const rows = await prisma.authToken.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.tokenHash).not.toContain(token);
    });

    it('resend needs a login, and only the newest link works', async () => {
      await post('resend-verification').expect(401);
      await http()
        .post('/api/v1/auth/resend-verification')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const emails = await waitForEmails(account.email, 2);
      const tokens = emails.map((e) => tokenFromEmail(e, 'verify-email'));
      // Mailpit lists newest first.
      await post('verify-email', { token: tokens[1] }).expect(400);
      await post('verify-email', { token: tokens[0] }).expect(204);
    });

    it('resend sends nothing once the address is verified', async () => {
      const token = tokenFromEmail((await waitForEmails(account.email))[0]!, 'verify-email');
      await post('verify-email', { token }).expect(204);
      await http()
        .post('/api/v1/auth/resend-verification')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
      expect(await emailsTo(account.email)).toHaveLength(1);
    });

    it('rejects an expired or made-up link', async () => {
      const token = tokenFromEmail((await waitForEmails(account.email))[0]!, 'verify-email');
      await prisma.authToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      await post('verify-email', { token }).expect(400);
      await post('verify-email', { token: 'x'.repeat(43) }).expect(400);
    });
  });

  describe('password reset', () => {
    it('answers 204 for an unknown email and sends nothing', async () => {
      await clearInbox();
      await post('forgot-password', { email: 'nobody@example.com' }).expect(204);
      await new Promise((resolve) => setTimeout(resolve, 300)); // give a background send time
      expect(await emailsTo('nobody@example.com')).toHaveLength(0);
    });

    it('sets the new password, logs out every device, and works once', async () => {
      const token = await requestReset();

      await post('reset-password', { token, newPassword: NEW_PASSWORD }).expect(204);

      await post('login', { email: account.email, password: account.password }).expect(401);
      await post('login', { email: account.email, password: NEW_PASSWORD }).expect(200);
      await post('refresh', { refreshToken }).expect(401); // the old session is gone
      await post('reset-password', { token, newPassword: 'yet another passphrase' }).expect(400);
    });

    it('verifies the email address too (the link proves ownership)', async () => {
      const token = await requestReset();
      await post('reset-password', { token, newPassword: NEW_PASSWORD }).expect(204);
      expect((await userRow()).emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('applies the new-password rules, without using up the link', async () => {
      const token = await requestReset();

      const res = await post('reset-password', { token, newPassword: '1234567890' }).expect(400);
      expect(res.body.error.details).toEqual([
        { field: 'newPassword', message: expect.stringMatching(/too common/) },
      ]);
      await post('reset-password', { token, newPassword: NEW_PASSWORD }).expect(204);
    });

    it('does not accept a verification link as a reset link', async () => {
      const token = tokenFromEmail((await waitForEmails(account.email))[0]!, 'verify-email');
      await post('reset-password', { token, newPassword: NEW_PASSWORD }).expect(400);
    });

    it('rejects a reset link older than one hour', async () => {
      const token = await requestReset();
      await prisma.authToken.updateMany({
        where: { type: 'PASSWORD_RESET' },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await post('reset-password', { token, newPassword: NEW_PASSWORD }).expect(400);
    });
  });
});
