import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AppException } from '../../common/errors/app.exception.js';
// Also brings in the `req.user` type declaration.
import type { AuthUser } from './auth-user.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { TokenService } from './token.service.js';

// Registered globally (APP_GUARD in AuthModule). Runs after middleware and before
// interceptors and pipes, so an unauthenticated request never reaches validation or the handler.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const token = bearerToken(req.headers.authorization);
    if (!token) throw unauthenticated(http.getResponse<Response>());

    try {
      const { userId } = await this.tokens.verifyAccessToken(token);
      const user: AuthUser = { id: userId };
      req.user = user;
      return true;
    } catch (err) {
      // Expired, forged, wrong audience…: the client's answer is the same (refresh or log in),
      // so they all get one 401. The reason stays in `cause` for debugging.
      throw unauthenticated(http.getResponse<Response>(), err);
    }
  }
}

// "Authorization: Bearer <token>" (RFC 6750). Anything else counts as no token.
export function bearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/i.exec(header ?? '');
  return match?.[1];
}

function unauthenticated(res: Response, cause?: unknown): AppException {
  // Tells HTTP clients which scheme this API expects (RFC 6750).
  res.setHeader('WWW-Authenticate', 'Bearer');
  return new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Log in to continue.', {
    cause,
  });
}
