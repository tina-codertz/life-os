import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailNotVerifiedError } from './auth.errors.js';

// Use with @UseGuards(EmailVerifiedGuard) on sensitive routes (ADR-015). Route guards run
// after the global ones, so req.user is already set. Looks the user up: verification
// isn't in the access token, and must take effect immediately.
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId = context.switchToHttp().getRequest<Request>().user?.id;
    if (!userId) throw new Error('EmailVerifiedGuard used on a route without authentication');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });
    if (!user?.emailVerifiedAt) throw new EmailNotVerifiedError();
    return true;
  }
}
