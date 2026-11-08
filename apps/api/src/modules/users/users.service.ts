import { Injectable } from '@nestjs/common';
import type {
  ChangePasswordInput,
  PublicSettings,
  PublicUser,
  UpdateProfileInput,
  UpdateSettingsInput,
} from '@life-os/shared';
import type { User } from '../../generated/prisma/client.js';
import { withoutUndefined } from '../../common/utils/without-undefined.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import { SessionService } from '../auth/session.service.js';
import { toPublicSettings } from './public-settings.js';
import { toPublicUser } from './public-user.js';
import { AccountGoneError, WrongPasswordError } from './users.errors.js';

export interface Me {
  user: PublicUser;
  settings: PublicSettings;
}

// Every method takes the user ID from the verified token (@CurrentUser), never from the
// request, and every query is filtered by it: there is no way to name another user here.
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  async getMe(userId: string): Promise<Me> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { settings: true },
    });
    if (!user) throw new AccountGoneError();
    // Created with the user at register; missing means a bug, so a 500, not a guess.
    if (!user.settings) throw new Error(`User ${user.id} has no settings row`);
    return { user: toPublicUser(user), settings: toPublicSettings(user.settings) };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await this.activeUser(userId);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        // Keep the first completion time if the app sends it again.
        ...(input.onboardingCompleted && !user.onboardingCompletedAt
          ? { onboardingCompletedAt: new Date() }
          : {}),
      },
    });
    return toPublicUser(updated);
  }

  async updateSettings(userId: string, input: UpdateSettingsInput): Promise<PublicSettings> {
    await this.activeUser(userId);
    const settings = await this.prisma.userSettings.update({
      where: { userId },
      data: withoutUndefined(input),
    });
    return toPublicSettings(settings);
  }

  // Keeps this device logged in (its session family) and logs out every other one.
  async changePassword(
    userId: string,
    sessionId: string,
    input: ChangePasswordInput,
  ): Promise<void> {
    const user = await this.activeUser(userId);
    if (!(await this.passwords.verify(user.passwordHash, input.currentPassword))) {
      throw new WrongPasswordError();
    }
    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await this.sessions.revokeAllExcept(user.id, sessionId, tx);
    });
  }

  private async activeUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AccountGoneError();
    return user;
  }
}
