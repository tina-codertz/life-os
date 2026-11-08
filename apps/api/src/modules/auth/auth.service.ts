import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  AuthResult,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  TokenPair,
} from '@life-os/shared';
import { PinoLogger } from 'nestjs-pino';
import { hashOpaqueToken } from '../../common/crypto/opaque-token.js';
import { type Env, ENV } from '../../config/env.js';
import type { User } from '../../generated/prisma/client.js';
import { MailService } from '../../mail/mail.service.js';
import { isUniqueViolation } from '../../prisma/prisma-errors.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailRateLimits } from '../../security/email-rate-limits.js';
import { toPublicUser } from '../users/public-user.js';
import { AuthTokenService } from './auth-token.service.js';
import { EmailTakenError, InvalidCredentialsError } from './auth.errors.js';
import { linkTo, passwordResetEmail, verificationEmail } from './emails.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {
  // A real argon2 hash of a random password nobody knows, created on first use.
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
    private readonly authTokens: AuthTokenService,
    private readonly mail: MailService,
    private readonly emailLimits: EmailRateLimits,
    private readonly logger: PinoLogger,
    @Inject(ENV) private readonly env: Env,
  ) {
    logger.setContext(AuthService.name);
  }

  // `input` is already validated and normalised by registerSchema (email lowercased).
  async register(input: RegisterInput): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(input.password);
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          passwordHash,
          settings: { create: {} }, // every user has a settings row, with defaults
        },
      });
    } catch (err) {
      // No "does this email exist?" query first: two sign-ups at the same moment could both
      // pass it. The unique index is the real check; we translate its error.
      if (isUniqueViolation(err, 'User', 'email')) throw new EmailTakenError(err);
      throw err;
    }
    // An email problem mustn't cost someone their sign-up: log it, they can resend (ADR-015:
    // the app works unverified).
    await this.sendVerificationEmail(user).catch((err: unknown) => {
      this.logger.error({ err, userId: user.id }, 'Could not send verification email');
    });
    // FR-AUTH-001: a new user is logged in straight away.
    return this.startSession(user, input.deviceName);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    this.emailLimits.assertLoginAllowed(input.email);
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user || user.deletedAt) {
      // Same work as a real check, so "unknown email" isn't measurably faster than
      // "wrong password" (a timing difference would reveal which emails have accounts).
      this.dummyHash ??= this.passwords.hash(randomUUID());
      await this.passwords.verify(await this.dummyHash, input.password);
      throw this.loginFailed(input.email);
    }

    if (!(await this.passwords.verify(user.passwordHash, input.password))) {
      throw this.loginFailed(input.email);
    }
    this.emailLimits.recordLoginSuccess(input.email);
    return this.startSession(user, input.deviceName);
  }

  // Counts the failure per email (unknown emails too) and returns the error to throw.
  private loginFailed(email: string): InvalidCredentialsError {
    if (this.emailLimits.recordLoginFailure(email)) {
      // A hash, not the address: enough to spot repeats in the logs, no personal data.
      this.logger.warn(
        { emailHash: hashOpaqueToken(email).slice(0, 12) },
        'Login failure limit reached for an email',
      );
    }
    return new InvalidCredentialsError();
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const session = await this.sessions.rotate(refreshToken);
    const accessToken = await this.tokens.signAccessToken({
      userId: session.userId,
      sessionId: session.familyId,
    });
    return { accessToken, refreshToken: session.refreshToken };
  }

  logout(refreshToken: string): Promise<void> {
    return this.sessions.revokeFamilyOf(refreshToken);
  }

  logoutAll(userId: string): Promise<void> {
    return this.sessions.revokeAll(userId);
  }

  async verifyEmail(token: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { userId } = await this.authTokens.consume(token, 'EMAIL_VERIFICATION', tx);
      // `emailVerifiedAt: null` in the filter keeps the first verification date.
      await tx.user.updateMany({
        where: { id: userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: new Date() },
      });
    });
  }

  // Nothing to do for a verified (or deleted) account; the answer is 204 either way.
  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt || user.emailVerifiedAt) return;
    await this.sendVerificationEmail(user);
  }

  // Always "done", whether or not the email has an account (FR-AUTH-001: never reveal which
  // emails exist). Creating the token and talking to SMTP happen in the background: awaiting
  // them would make a known email measurably slower to answer than an unknown one.
  async forgotPassword(email: string): Promise<void> {
    // Still 204 when over the limit (the answer never varies); we just don't send.
    if (!this.emailLimits.allowResetEmail(email)) return;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) return;
    void this.sendPasswordResetEmail(user).catch((err: unknown) => {
      this.logger.error({ err, userId: user.id }, 'Could not send password reset email');
    });
  }

  async resetPassword({ token, newPassword }: ResetPasswordInput): Promise<void> {
    // Slow hash first, outside the transaction, so the transaction stays short.
    const passwordHash = await this.passwords.hash(newPassword);
    await this.prisma.$transaction(async (tx) => {
      const { userId } = await this.authTokens.consume(token, 'PASSWORD_RESET', tx);
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      // Opening a link sent to the address proves they own it.
      await tx.user.updateMany({
        where: { id: userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: new Date() },
      });
      // Whoever knew the old password (maybe an attacker) is logged out everywhere.
      await this.sessions.revokeAll(userId, tx);
    });
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const token = await this.authTokens.issue(user.id, 'EMAIL_VERIFICATION');
    const link = linkTo(this.env.EMAIL_LINK_BASE_URL, 'verify-email', token);
    await this.mail.send(verificationEmail(user.email, user.displayName, link));
  }

  private async sendPasswordResetEmail(user: User): Promise<void> {
    const token = await this.authTokens.issue(user.id, 'PASSWORD_RESET');
    const link = linkTo(this.env.EMAIL_LINK_BASE_URL, 'reset-password', token);
    await this.mail.send(passwordResetEmail(user.email, user.displayName, link));
  }

  private async startSession(user: User, deviceName?: string): Promise<AuthResult> {
    const { familyId, refreshToken } = await this.sessions.start(user.id, deviceName);
    const accessToken = await this.tokens.signAccessToken({ userId: user.id, sessionId: familyId });
    return { user: toPublicUser(user), accessToken, refreshToken };
  }
}
