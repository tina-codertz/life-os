import { HttpException, type HttpStatus } from '@nestjs/common';
import type { ApiErrorDetail } from '@life-os/shared';

export interface AppExceptionOptions {
  details?: ApiErrorDetail[];
  // The underlying error, kept for the logs; never sent to the client.
  cause?: unknown;
  // Extra response headers, e.g. Retry-After on a 429.
  headers?: Record<string, string>;
}

// Throw this for any error the client should understand: a stable `code` the mobile app
// can switch on, plus a human-readable message. Features subclass it, e.g.
// `class TaskNotFoundError extends AppException`.
export class AppException extends HttpException {
  readonly code: string;
  readonly details: ApiErrorDetail[];
  readonly headers: Record<string, string>;

  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    options: AppExceptionOptions = {},
  ) {
    super(message, status, { cause: options.cause });
    this.code = code;
    this.details = options.details ?? [];
    this.headers = options.headers ?? {};
  }
}
