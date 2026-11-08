import type { ApiErrorBody, ApiErrorDetail } from '@life-os/shared';

// Codes the client itself produces when there's no API answer to read.
export const CLIENT_ERROR_CODES = ['NETWORK_ERROR', 'TIMEOUT', 'HTTP_ERROR'] as const;

// Every failed API call throws this. Screens switch on `code` (stable, docs/06), never on
// `message`; `requestId` is what a user can quote in a bug report to find the log line.
export class ApiError extends Error {
  readonly status: number; // 0 = no response (offline, timeout)
  readonly code: string;
  readonly details: ApiErrorDetail[];
  readonly requestId: string | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    options: { details?: ApiErrorDetail[]; requestId?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = options.details ?? [];
    this.requestId = options.requestId;
  }

  static fromBody(status: number, body: ApiErrorBody): ApiError {
    const { code, message, details, requestId } = body.error;
    return new ApiError(status, code, message, { details, requestId });
  }

  // { email: 'Enter a valid email address.' }: what a form needs to show errors per field.
  fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const { field, message } of this.details) {
      if (field && !(field in errors)) errors[field] = message;
    }
    return errors;
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
