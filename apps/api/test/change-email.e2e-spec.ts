import type { INestApplication } from '@nestjs/common';
import type { AuthResult } from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createUser } from './factories.js';
import { createTestApp } from './utils/create-test-app.js';
import { clearInbox, emailsTo, tokenFromEmail, waitForEmails } from './utils/mailpit.js';
import { resetDatabase } from './utils/test-db.js';

const OLD = 'tina@example.com';
const NEW = 'tina.new@example.org';
const PASSWORD = 'correct horse battery';

describe('Change email (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tina: AuthResult;

  const http = () => request(app.getHttpServer());
  const requestChange = (body: object, who: AuthResult = tina) =>
    http()
      .post('/api/v1/users/me/change-email')
      .set('Authorization', `Bearer ${who.accessToken}`)
      .send(body);
  const confirm = (token: string) =>
    http().post('/api/v1/auth/confirm-email-change').send({ token });
  const login = (email: string) =>
    http().post('/api/v1/auth/login').send({ email, password: PASSWORD });
  const markVerified = () =>
    prisma.user.update({ where: { email: OLD }, data: { emailVerifiedAt: new Date() } });
  // Starts a change and returns the token from the link sent to the new address.
  const startChange = async (newEmail = NEW): Promise<string> => {
    await requestChange({ newEmail, password: PASSWORD }).expect(204);
    const [email] = await waitForEmails(newEmail);
    return tokenFromEmail(email!, 'confirm-email-change');
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    tina = (
      await http()
        .post('/api/v1/auth/register')
        .send({ email: OLD, password: PASSWORD, displayName: 'Tina' })
        .expect(201)
    ).body.data;
    await waitForEmails(OLD); // the verification email from register
    await clearInbox();
  });

  afterAll(async () => {
    await app.close();
  });

  it('needs a verified current email (ADR-015)', async () => {
    const res = await requestChange({ newEmail: NEW, password: PASSWORD }).expect(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(await emailsTo(NEW)).toHaveLength(0);
  });

  describe('with a verified email', () => {
    beforeEach(async () => {
      await markVerified();
    });

    it('sends a link to the new address and a notice (no link) to the old one, changing nothing yet', async () => {
      await requestChange({ newEmail: ' Tina.New@Example.ORG ', password: PASSWORD }).expect(204);

      const [toNew] = await waitForEmails(NEW);
      expect(toNew?.subject).toBe('Confirm your new email for Life OS');
      const [toOld] = await waitForEmails(OLD);
      expect(toOld?.subject).toBe('Your Life OS email is being changed');
      expect(toOld?.text).toContain('t***@example.org');
      expect(toOld?.text).not.toContain('token=');

      expect((await prisma.user.findUniqueOrThrow({ where: { id: tina.user.id } })).email).toBe(
        OLD,
      );
      await login(OLD).expect(200);
    });

    it('confirming switches the email, keeps it verified, and tells the old address', async () => {
      const token = await startChange();
      await clearInbox();

      await confirm(token).expect(204);

      const user = await prisma.user.findUniqueOrThrow({ where: { id: tina.user.id } });
      expect(user.email).toBe(NEW);
      expect(user.emailVerifiedAt).toBeInstanceOf(Date);
      await login(NEW).expect(200);
      await login(OLD).expect(401);

      const [notice] = await waitForEmails(OLD);
      expect(notice?.subject).toBe('Your Life OS email was changed');
      await confirm(token).expect(400); // links work once
    });

    it('keeps existing sessions (the password did not change)', async () => {
      await confirm(await startChange()).expect(204);
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tina.refreshToken })
        .expect(200);
    });

    it('invalidates reset links that were sent to the old address', async () => {
      await http().post('/api/v1/auth/forgot-password').send({ email: OLD }).expect(204);
      const [resetEmail] = await waitForEmails(OLD);
      const resetToken = tokenFromEmail(resetEmail!, 'reset-password');

      await confirm(await startChange()).expect(204);

      await http()
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, newPassword: 'a takeover passphrase' })
        .expect(400);
    });

    it('requires the right password: 403 WRONG_PASSWORD', async () => {
      const res = await requestChange({ newEmail: NEW, password: 'not my password' }).expect(403);
      expect(res.body.error.code).toBe('WRONG_PASSWORD');
      expect(await emailsTo(NEW)).toHaveLength(0);
    });

    it('rejects the current address, in any letter case', async () => {
      const res = await requestChange({ newEmail: 'TINA@example.com', password: PASSWORD }).expect(
        400,
      );
      expect(res.body.error.details).toEqual([
        { field: 'newEmail', message: 'This is already your email address.' },
      ]);
    });

    it('answers 409 EMAIL_TAKEN when another account has the address', async () => {
      await createUser(prisma, { email: NEW });
      const res = await requestChange({ newEmail: NEW, password: PASSWORD }).expect(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('refuses to confirm if someone took the address in between, changing nothing', async () => {
      const token = await startChange();
      await createUser(prisma, { email: NEW });

      const res = await confirm(token).expect(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
      expect((await prisma.user.findUniqueOrThrow({ where: { id: tina.user.id } })).email).toBe(
        OLD,
      );
    });

    it('only the newest change link works', async () => {
      const first = await startChange('first@example.org');
      const second = await startChange('second@example.org');

      await confirm(first).expect(400);
      await confirm(second).expect(204);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: tina.user.id } })).email).toBe(
        'second@example.org',
      );
    });

    it('rejects an expired link and other kinds of link', async () => {
      const token = await startChange();
      await prisma.authToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      await confirm(token).expect(400);

      await clearInbox(); // the old inbox already has the "being changed" notice
      await http().post('/api/v1/auth/forgot-password').send({ email: OLD }).expect(204);
      const resetToken = tokenFromEmail((await waitForEmails(OLD))[0]!, 'reset-password');
      await confirm(resetToken).expect(400);
    });

    it('needs a login and a strict body', async () => {
      await http()
        .post('/api/v1/users/me/change-email')
        .send({ newEmail: NEW, password: PASSWORD })
        .expect(401);
      const res = await requestChange({ newEmail: NEW, password: PASSWORD, userId: 'x' }).expect(
        400,
      );
      expect(res.body.error.details).toEqual([
        { field: 'userId', message: 'This field is not allowed.' },
      ]);
    });
  });
});
