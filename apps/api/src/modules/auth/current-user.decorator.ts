import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './auth-user.js';

// `me(@CurrentUser() user: AuthUser)`. The ID always comes from the verified token, never
// from the URL or body (NFR-SEC-003), so a user can only ever act as themselves.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const user = ctx.switchToHttp().getRequest<Request>().user;
    // Only possible on a @Public() route: a programming mistake, so a 500, not a 401.
    if (!user) throw new Error('@CurrentUser() used on a route without authentication');
    return user;
  },
);
