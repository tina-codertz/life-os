import type { ExecutionContext } from '@nestjs/common';
import { Throttle, type ThrottlerModuleOptions } from '@nestjs/throttler';
import type { Request } from 'express';
import type { Env } from '../config/env.js';

const MINUTE = 60_000;

// NFR-SEC-004: 100 requests/minute in general, 5/minute on endpoints worth brute-forcing or
// that send email. In-memory counters: right for one API instance (ADR-008); several
// instances would need a shared store (Redis).
export function rateLimitOptions(env: Env): ThrottlerModuleOptions {
  return {
    throttlers: [{ ttl: MINUTE, limit: 100 }],
    // Logged in → counted per user; anonymous → per IP. Many mobile users share one public IP
    // (carrier-grade NAT), so per-IP for everything would let one busy user block others.
    // Works because JwtAuthGuard runs first and has set req.user (AppModule guard order).
    getTracker: (req: Partial<Pick<Request, 'ip' | 'user'>>) =>
      req.user ? `user:${req.user.id}` : `ip:${req.ip ?? 'unknown'}`,
    skipIf: (_context: ExecutionContext) => !env.RATE_LIMIT_ENABLED,
    errorMessage: 'Too many requests. Please wait a minute and try again.',
  };
}

// For login, register, password and email endpoints: 5 per minute per IP (or per user).
export const StrictRateLimit = () => Throttle({ default: { limit: 5, ttl: MINUTE } });
