import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Env } from '../../config/env.js';
import { AppException } from '../../common/errors/app.exception.js';
import { bearerToken, JwtAuthGuard } from './jwt-auth.guard.js';
import { Public } from './public.decorator.js';
import { TokenService } from './token.service.js';

const tokens = new TokenService({
  JWT_ACCESS_SECRET: 'unit-test-secret-at-least-32-characters',
} as Env);
const guard = new JwtAuthGuard(new Reflector(), tokens);

// Stand-ins for controller methods: the guard only reads their metadata.
const openHandler = () => undefined;
const closedHandler = () => undefined;
Public()(openHandler);

function contextFor(handler: () => void, authorization?: string) {
  const req: { headers: { authorization?: string }; user?: unknown } = {
    headers: authorization === undefined ? {} : { authorization },
  };
  const headers: Record<string, string> = {};
  const res = { setHeader: (name: string, value: string) => (headers[name] = value) };
  const context = {
    getHandler: () => handler,
    getClass: () => Object, // no controller-level metadata
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
  return { context, req, headers };
}

async function rejection(promise: Promise<unknown>): Promise<AppException> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof AppException) return err;
    throw err;
  }
  throw new Error('expected the guard to reject');
}

describe('JwtAuthGuard', () => {
  it('lets @Public() routes through without a token', async () => {
    const { context } = contextFor(openHandler);
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('rejects a protected route without a token: 401 UNAUTHENTICATED + WWW-Authenticate', async () => {
    const { context, headers } = contextFor(closedHandler);
    const err = await rejection(guard.canActivate(context));
    expect(err.getStatus()).toBe(401);
    expect(err.code).toBe('UNAUTHENTICATED');
    expect(headers['WWW-Authenticate']).toBe('Bearer');
  });

  it('rejects an invalid token and keeps the reason as the cause', async () => {
    const { context } = contextFor(closedHandler, 'Bearer aaa.bbb.ccc');
    const err = await rejection(guard.canActivate(context));
    expect(err.code).toBe('UNAUTHENTICATED');
    expect(err.cause).toBeInstanceOf(Error);
  });

  it('accepts a valid token and sets req.user from its subject', async () => {
    const token = await tokens.signAccessToken({ userId: 'user-1', sessionId: 'session-1' });
    const { context, req } = contextFor(closedHandler, `Bearer ${token}`);
    expect(await guard.canActivate(context)).toBe(true);
    expect(req.user).toEqual({ id: 'user-1', sessionId: 'session-1' });
  });
});

describe('bearerToken', () => {
  it.each([
    ['Bearer a.b.c', 'a.b.c'],
    ['bearer a-1.b_2.c', 'a-1.b_2.c'],
  ])('reads %j', (header, token) => {
    expect(bearerToken(header)).toBe(token);
  });

  it.each([
    undefined,
    '',
    'a.b.c',
    'Basic dXNlcjpwYXNz',
    'Bearer ',
    'Bearer a.b',
    'Bearer a.b.c extra',
  ])('ignores %j', (header) => {
    expect(bearerToken(header)).toBeUndefined();
  });
});
