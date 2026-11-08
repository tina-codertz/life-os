import { Injectable } from '@nestjs/common';
import { hashOpaqueToken, newOpaqueToken } from '../../common/crypto/opaque-token.js';
import type { AuthTokenType, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InvalidLinkError } from './auth.errors.js';

// How long an emailed link works. A reset link is short-lived because whoever holds it can
// take over the account; verifying an address is low-risk, so people get two days.
export const AUTH_TOKEN_TTL_MS: Record<AuthTokenType, number> = {
  EMAIL_VERIFICATION: 48 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

@Injectable()
export class AuthTokenService {
  constructor(private readonly prisma: PrismaService) {}

  // Creates a one-time token and returns it (to put in the email). Any older unused token of
  // the same type stops working, so only the most recent email's link is valid.
  async issue(userId: string, type: AuthTokenType): Promise<string> {
    const token = newOpaqueToken();
    await this.prisma.$transaction([
      this.prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } }),
      this.prisma.authToken.create({
        data: {
          userId,
          type,
          tokenHash: hashOpaqueToken(token),
          expiresAt: new Date(Date.now() + AUTH_TOKEN_TTL_MS[type]),
        },
      }),
    ]);
    return token;
  }

  // Marks the token used and returns its user's ID, or throws InvalidLinkError. Pass `tx` so
  // that if the rest of the operation fails, the token isn't burnt.
  async consume(
    token: string,
    type: AuthTokenType,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<string> {
    const row = await tx.authToken.findUnique({
      where: { tokenHash: hashOpaqueToken(token) },
      include: { user: { select: { deletedAt: true } } },
    });
    if (
      !row ||
      row.type !== type ||
      row.usedAt ||
      row.expiresAt <= new Date() ||
      row.user.deletedAt
    ) {
      throw new InvalidLinkError();
    }
    // Compare-and-set, as for refresh tokens: two clicks at once can't both succeed.
    const { count } = await tx.authToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) throw new InvalidLinkError();
    return row.userId;
  }
}
