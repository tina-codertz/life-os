import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { AuthResult, LoginInput, RegisterInput } from '@life-os/shared';
import type { User } from '../../generated/prisma/client.js';
import { isUniqueViolation } from '../../prisma/prisma-errors.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailTakenError, InvalidCredentialsError } from './auth.errors.js';
import { PasswordService } from './password.service.js';
import { toPublicUser } from '../users/public-user.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {
  // A real argon2 hash of a random password nobody knows, created on first use.
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

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
    // FR-AUTH-001: a new user is logged in straight away.
    return this.issueTokens(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user || user.deletedAt) {
      // Same work as a real check, so "unknown email" isn't measurably faster than
      // "wrong password" (a timing difference would reveal which emails have accounts).
      this.dummyHash ??= this.passwords.hash(randomUUID());
      await this.passwords.verify(await this.dummyHash, input.password);
      throw new InvalidCredentialsError();
    }

    if (!(await this.passwords.verify(user.passwordHash, input.password))) {
      throw new InvalidCredentialsError();
    }
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const accessToken = await this.tokens.signAccessToken({ userId: user.id });
    return { user: toPublicUser(user), accessToken };
  }
}
