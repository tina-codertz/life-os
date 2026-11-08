// Versioned API path prefix shared by the API (global prefix) and the mobile HTTP client.
export const API_PREFIX = 'api/v1';

// Codes every endpoint may return (docs/06 §1). Feature modules add their own, e.g. TASK_NOT_FOUND.
export const COMMON_ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'BUSINESS_RULE_VIOLATION',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;
export type CommonErrorCode = (typeof COMMON_ERROR_CODES)[number];

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

// The body of every non-2xx response. The mobile client parses this into its ApiError.
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
    requestId: string;
  };
}

// Successful responses (docs/06 §1). A single resource is `{ data }`; a page of a collection
// adds `meta` for cursor pagination.
export interface PageMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiDataBody<T> {
  data: T;
}

export interface ApiPageBody<T> {
  data: T[];
  meta: PageMeta;
}

// Zod schemas: the API validates requests with them, the mobile app validates forms with them.
export * from './schemas/pagination.ts';
export * from './schemas/auth.ts';
export * from './schemas/users.ts';
export * from './schemas/categories.ts';
export * from './schemas/recurrence.ts';
export * from './schemas/tasks.ts';
