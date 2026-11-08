import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { hashOpaqueToken, newOpaqueToken } from '../../common/crypto/opaque-token.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InvalidRefreshTokenError } from './auth.errors.js';

// ADR-004: 30 days, counted from the last refresh, so an app in regular use stays logged in.
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionTokens {
  familyId: string; // the access token's `sid`: one per login (device)
  refreshToken: string;
}

class ConcurrentRotation extends Error {}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    logger.setContext(SessionService.name);
  }

  // A login (or register) starts a new family.
  async start(userId: string, deviceName?: string): Promise<SessionTokens> {
    const familyId = randomUUID();
    const refreshToken = newOpaqueToken();
    await this.prisma.session.create({
      data: {
        userId,
        familyId,
        refreshTokenHash: hashOpaqueToken(refreshToken),
        deviceName: deviceName ?? null,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return { familyId, refreshToken };
  }

  // Swaps a refresh token for a new one in the same family. Each token works exactly once.
  async rotate(refreshToken: string): Promise<SessionTokens & { userId: string }> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hashOpaqueToken(refreshToken) },
      include: { user: { select: { deletedAt: true } } },
    });
    if (!session) throw new InvalidRefreshTokenError();

    if (session.rotatedAt) {
      // This token was already exchanged. Either the app is buggy or someone copied it, and we
      // can't tell which copy is the real one, so the whole login is ended.
      await this.reuseDetected(session.familyId, session.userId);
    }
    if (session.revokedAt || session.expiresAt <= new Date() || session.user.deletedAt) {
      throw new InvalidRefreshTokenError();
    }

    const next = newOpaqueToken();
    try {
      await this.prisma.$transaction(async (tx) => {
        // Compare-and-set: only succeeds if nobody rotated this row since we read it. Postgres
        // makes a concurrent second UPDATE wait for the first, then re-checks the WHERE.
        const { count } = await tx.session.updateMany({
          where: { id: session.id, rotatedAt: null, revokedAt: null },
          data: { rotatedAt: new Date() },
        });
        if (count === 0) throw new ConcurrentRotation();

        await tx.session.create({
          data: {
            userId: session.userId,
            familyId: session.familyId,
            refreshTokenHash: hashOpaqueToken(next),
            deviceName: session.deviceName,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
          },
        });
      });
    } catch (err) {
      // Two refreshes raced with the same token: the second is a reuse.
      if (err instanceof ConcurrentRotation)
        await this.reuseDetected(session.familyId, session.userId);
      throw err;
    }
    return { userId: session.userId, familyId: session.familyId, refreshToken: next };
  }

  // Logout on this device: ends the token's family. Unknown tokens are ignored, so logout
  // always succeeds and can't be used to test whether a token exists.
  async revokeFamilyOf(refreshToken: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hashOpaqueToken(refreshToken) },
      select: { familyId: true },
    });
    if (session) await this.revokeFamily(session.familyId);
  }

  // Logout everywhere, and password reset (pass `tx` to make it part of that transaction).
  async revokeAll(userId: string, tx: Prisma.TransactionClient = this.prisma): Promise<void> {
    await tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async reuseDetected(familyId: string, userId: string): Promise<never> {
    await this.revokeFamily(familyId);
    // Worth a look in the logs: it may mean a stolen token. IDs only, never the token.
    this.logger.warn({ familyId, userId }, 'Refresh token reuse detected; session family revoked');
    throw new InvalidRefreshTokenError();
  }
}
