import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception.js';
import { type Env, ENV } from '../config/env.js';
import { AttemptLimiter } from './attempt-limiter.js';

const HOUR = 60 * 60 * 1000;

// Per-email limits (docs/06 §4), on top of the per-IP throttler: they stop one account being
// attacked from many IPs. Keys are the normalised email, whether or not an account exists,
// so the limits behave identically for unknown emails and reveal nothing.
@Injectable()
export class EmailRateLimits {
  private readonly loginFailures = new AttemptLimiter(10, HOUR);
  private readonly resetEmails = new AttemptLimiter(3, HOUR);
  private readonly enabled: boolean;

  constructor(@Inject(ENV) env: Env) {
    this.enabled = env.RATE_LIMIT_ENABLED;
  }

  // Throws 429 while an email has had 10 failed logins in the last hour, even with the
  // right password: that's the price of the limit, and why forgot-password stays open.
  assertLoginAllowed(email: string): void {
    const seconds = this.enabled ? this.loginFailures.blockedForSeconds(email) : 0;
    if (seconds > 0) {
      throw new AppException(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMITED',
        'Too many failed attempts. Try again later, or reset your password.',
        { headers: { 'Retry-After': String(seconds) } },
      );
    }
  }

  // Returns true when this failure used up the email's allowance (worth a log line).
  recordLoginFailure(email: string): boolean {
    if (!this.enabled) return false;
    this.loginFailures.hit(email);
    return this.loginFailures.blockedForSeconds(email) > 0;
  }

  recordLoginSuccess(email: string): void {
    this.loginFailures.reset(email);
  }

  // At most 3 reset emails an hour to one address, so nobody can flood an inbox.
  allowResetEmail(email: string): boolean {
    return !this.enabled || this.resetEmails.hit(email);
  }
}
