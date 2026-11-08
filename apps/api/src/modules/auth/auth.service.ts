import { Injectable } from '@nestjs/common';
import type { PublicUser, RegisterInput } from '@life-os/shared';
import { isUniqueViolation } from '../../prisma/prisma-errors.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailTakenError } from './auth.errors.js';
import { PasswordService } from './password.service.js';
import { toPublicUser } from './public-user.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  // `input` is already validated and normalised by registerSchema (email lowercased).
  async register(input: RegisterInput): Promise<{ user: PublicUser }> {
    const passwordHash = await this.passwords.hash(input.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          passwordHash,
          settings: { create: {} }, // every user has a settings row, with defaults
        },
      });
      return { user: toPublicUser(user) };
    } catch (err) {
      // No "does this email exist?" query first: two sign-ups at the same moment could both
      // pass it. The unique index is the real check; we translate its error.
      if (isUniqueViolation(err, 'User', 'email')) throw new EmailTakenError(err);
      throw err;
    }
  }
}
