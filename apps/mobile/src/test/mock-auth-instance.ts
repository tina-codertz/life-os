import type { FetchLike } from '@/services/http';
import { createAuthStore } from '@/features/auth/auth-store';
import { memorySessionStorage } from '@/features/auth/session-storage';

// Stands in for '@/features/auth/auth-instance' in screen tests:
//   jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));
// The real store and HTTP client, with in-memory storage and a scripted API: set `routes`
// per test ("POST /auth/login": reply), read `calls` to see what was sent.

export type Reply = { status: number; body?: unknown };
// A route key is "METHOD /path"; an exact match with the query string wins, otherwise the path
// alone is tried. The handler also gets the full path, to check filters and cursors.
export const routes: Record<
  string,
  (body: Record<string, unknown> | undefined, path: string) => Reply | Promise<Reply>
> = {};
export const calls: { route: string; body: Record<string, unknown> | undefined }[] = [];

const fetch: FetchLike = async (url, init) => {
  const route = `${init.method} ${url.replace('http://api.test/api/v1', '')}`;
  const body = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;
  calls.push({ route, body });
  const handler = routes[route] ?? routes[route.split('?')[0] ?? route];
  const reply = await (handler
    ? handler(body, route.slice(route.indexOf(' ') + 1))
    : { status: 404, body: apiError('NOT_FOUND', `No fake route for ${route}`) });
  const text = reply.body === undefined ? '' : JSON.stringify(reply.body);
  return { ok: reply.status < 300, status: reply.status, text: async () => text };
};

export const authStore = createAuthStore({
  storage: memorySessionStorage(),
  baseUrl: 'http://api.test',
  fetch,
});
export const api = () => authStore.getState().http;

export function apiError(code: string, message: string, details: unknown[] = []) {
  return { error: { code, message, details, requestId: 'req-test' } };
}

export function resetMockApi(): void {
  for (const key of Object.keys(routes)) delete routes[key];
  calls.length = 0;
  authStore.setState({ status: 'signedOut', user: null, accessToken: null, refreshToken: null });
}
