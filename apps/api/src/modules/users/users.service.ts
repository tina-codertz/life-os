import { HttpStatus, Injectable } from '@nestjs/common';
import type { PublicUser } from '@life-os/shared';
import { AppException } from '../../common/errors/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { toPublicUser } from './public-user.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // A valid token for an account that's gone (deleted within the token's 15 minutes):
    // 401 so the app logs out, rather than 404.
    if (!user || user.deletedAt) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Log in to continue.');
    }
    return toPublicUser(user);
  }
}
