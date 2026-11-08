import { API_PREFIX, type ApiErrorBody, type ApiErrorDetail } from '@life-os/shared';
import { ApiError } from './api-error';

// Where the client gets tokens. The auth store (5.4) implements this; the client never
// stores tokens itself.
export interface TokenSource {
  getAccessToken(): string | null;
  // Exchanges the refresh token for a new pair. Resolves to the new access token, or null if
  // the session is over (the store then signs the user out).
  refresh(): Promise<string | null>;
}

// The part of fetch we use; tests pass a fake.
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export interface RequestOptions {
  body?: unknown;
  // false for login/register/refresh: no token sent, no refresh on 401.
  auth?: boolean;
  signal?: AbortSignal;
}

export interface HttpClientConfig {
  // e.g. http://192.168.1.20:3000. A function is read on each request, so nothing is resolved
  // at import time (tests, and builds that set the URL later).
  baseUrl: string | (() => string);
  tokens: TokenSource;
  fetch?: FetchLike;
  timeoutMs?: number;
}

export type HttpClient = ReturnType<typeof createHttpClient>;

export function createHttpClient({
  baseUrl,
  tokens,
  fetch: fetchImpl = globalThis.fetch,
  timeoutMs = 15_000,
}: HttpClientConfig) {
  // Single-flight: while a refresh is running, every request that hits a 401 waits for this
  // same promise instead of starting its own (each refresh token works only once, 4.5).
  let refreshing: Promise<string | null> | null = null;
  function refreshOnce(): Promise<string | null> {
    refreshing ??= tokens.refresh().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function send(
    method: string,
    path: string,
    { body, signal }: RequestOptions,
    token: string | null,
  ) {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Our own timeout, also cancelled if the caller's signal fires (e.g. the screen closed).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new TimeoutSignal()), timeoutMs);
    const onCallerAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', onCallerAbort);

    try {
      const root = typeof baseUrl === 'function' ? baseUrl() : baseUrl;
      const response = await fetchImpl(`${root}/${API_PREFIX}${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      return { status: response.status, ok: response.ok, text: await response.text() };
    } catch (err) {
      if (controller.signal.reason instanceof TimeoutSignal) {
        throw new ApiError(0, 'TIMEOUT', 'The server took too long to answer.', { cause: err });
      }
      if (signal?.aborted) throw err; // the caller cancelled: not an error to show
      throw new ApiError(0, 'NETWORK_ERROR', "Can't reach Life OS. Check your connection.", {
        cause: err,
      });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  async function request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const auth = options.auth ?? true;
    const sentToken = auth ? tokens.getAccessToken() : null;
    let result = await send(method, path, options, sentToken);

    if (auth && isExpiredToken(result)) {
      // Another request may have refreshed while this one was in flight: then just retry
      // with the new token. Otherwise refresh (shared) and retry once.
      const current = tokens.getAccessToken();
      const next = current && current !== sentToken ? current : await refreshOnce();
      if (next) result = await send(method, path, options, next);
    }
    // The one place a response gets a type: the caller says what the endpoint returns (the
    // shared types in packages/shared); the client can't check it. Bodies aren't validated
    // at runtime; that's a deliberate trust in our own API.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return parse(result) as T;
  }

  return {
    request,
    get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('POST', path, { ...options, body }),
    patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
      request<T>('PATCH', path, { ...options, body }),
    delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
  };
}

class TimeoutSignal extends Error {}

type RawResult = { status: number; ok: boolean; text: string };

// Only an expired/invalid access token is worth a refresh; a wrong password (401
// INVALID_CREDENTIALS) or a dead refresh token (INVALID_REFRESH_TOKEN) is not.
function isExpiredToken(result: RawResult): boolean {
  return result.status === 401 && errorBody(result.text)?.error.code === 'UNAUTHENTICATED';
}

function parse({ status, ok, text }: RawResult): unknown {
  if (ok) {
    if (status === 204 || text === '') return undefined;
    const body: unknown = JSON.parse(text);
    // Every success is { data } (docs/06). Pages ({ data, meta }) get their own helper in Phase 6.
    if (typeof body === 'object' && body !== null && 'data' in body) return body.data;
    throw new ApiError(status, 'HTTP_ERROR', 'Unexpected response from the server.');
  }
  const body = errorBody(text);
  if (body) throw ApiError.fromBody(status, body);
  // Not our envelope: e.g. a proxy's HTML error page.
  throw new ApiError(status, 'HTTP_ERROR', `The server answered with status ${status}.`);
}

// Reads our error envelope field by field (no cast), so a malformed error response can't put
// junk into ApiError. Returns null if it isn't our envelope at all.
function errorBody(text: string): ApiErrorBody | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null; // not JSON
  }
  if (!isRecord(body) || !isRecord(body['error'])) return null;
  const { code, message, details, requestId } = body['error'];
  if (typeof code !== 'string') return null;
  return {
    error: {
      code,
      message: typeof message === 'string' ? message : 'Request failed.',
      details: Array.isArray(details) ? details.filter(isErrorDetail) : [],
      requestId: typeof requestId === 'string' ? requestId : '',
    },
  };
}

function isErrorDetail(value: unknown): value is ApiErrorDetail {
  return (
    isRecord(value) &&
    typeof value['message'] === 'string' &&
    (value['field'] === undefined || typeof value['field'] === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
