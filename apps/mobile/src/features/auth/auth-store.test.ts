import type { AuthResult, PublicUser } from '@life-os/shared';
import type { FetchLike } from '@/services/http';
import { createAuthStore } from './auth-store';
import { memorySessionStorage, type StoredSession } from './session-storage';

const USER: PublicUser = {
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: null,
  createdAt: '2026-11-08T09:00:00.000Z',
};
const LOGIN: AuthResult = { user: USER, accessToken: 'access-1', refreshToken: 'refresh-1' };

type Route = (body: Record<string, unknown> | undefined) => { status: number; body?: unknown };

// A fake API: one handler per "METHOD /path"; every call recorded.
function fakeApi(routes: Record<string, Route>) {
  const calls: { route: string; body: Record<string, unknown> | undefined; auth?: string }[] = [];
  const fetch: FetchLike = async (url, init) => {
    const route = `${init.method} ${url.replace('http://api.test/api/v1', '')}`;
    const body = init.body ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;
    const call: (typeof calls)[number] = { route, body };
    if (init.headers['Authorization']) call.auth = init.headers['Authorization'];
    calls.push(call);
    const handler = routes[route];
    const reply = handler ? handler(body) : { status: 404, body: errorBody('NOT_FOUND') };
    const text = reply.body === undefined ? '' : JSON.stringify(reply.body);
    return { ok: reply.status < 300, status: reply.status, text: async () => text };
  };
  return { fetch, calls };
}

const errorBody = (code: string) => ({
  error: { code, message: code, details: [], requestId: 'r' },
});

// Refresh rotates: refresh-N → refresh-N+1, access-N+1.
const rotatingRefresh: Route = (body) => {
  const n = Number(String(body?.['refreshToken']).split('-')[1]) + 1;
  return {
    status: 200,
    body: { data: { accessToken: `access-${n}`, refreshToken: `refresh-${n}` } },
  };
};
const offline: FetchLike = () => Promise.reject(new TypeError('Network request failed'));

function setup(stored: StoredSession | null = null, routes: Record<string, Route> = {}) {
  const storage = memorySessionStorage(stored);
  const api = fakeApi(routes);
  const store = createAuthStore({ storage, baseUrl: 'http://api.test', fetch: api.fetch });
  return { store, storage, calls: api.calls };
}

describe('auth store: launch (hydrate)', () => {
  it('starts in loading, then signedOut when nothing is stored', async () => {
    const { store } = setup();
    expect(store.getState().status).toBe('loading');
    await store.getState().hydrate();
    expect(store.getState().status).toBe('signedOut');
  });

  it('opens signed in with the cached user before the network answers, then gets a token', async () => {
    // Hold the refresh response until the test lets it go.
    let release: (() => void) | undefined;
    const answered = new Promise<void>((resolve) => (release = resolve));
    const api = fakeApi({ 'POST /auth/refresh': rotatingRefresh });
    const slowFetch: FetchLike = async (url, init) => {
      await answered;
      return api.fetch(url, init);
    };
    const storage = memorySessionStorage({ refreshToken: 'refresh-1', user: USER });
    const store = createAuthStore({ storage, baseUrl: 'http://api.test', fetch: slowFetch });

    const hydrating = store.getState().hydrate();
    await new Promise((resolve) => setTimeout(resolve, 0)); // storage read done, refresh pending
    expect(store.getState()).toMatchObject({ status: 'signedIn', user: USER, accessToken: null });

    release?.();
    await hydrating;
    expect(store.getState()).toMatchObject({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    expect(storage.current()?.refreshToken).toBe('refresh-2');
  });

  it('signs out if the server says the session is over', async () => {
    const { store, storage } = setup(
      { refreshToken: 'refresh-1', user: USER },
      { 'POST /auth/refresh': () => ({ status: 401, body: errorBody('INVALID_REFRESH_TOKEN') }) },
    );
    await store.getState().hydrate();
    expect(store.getState().status).toBe('signedOut');
    expect(storage.current()).toBeNull();
  });

  it('stays signed in offline (cached user, token kept for later)', async () => {
    const storage = memorySessionStorage({ refreshToken: 'refresh-1', user: USER });
    const store = createAuthStore({ storage, baseUrl: 'http://api.test', fetch: offline });
    await store.getState().hydrate();
    expect(store.getState()).toMatchObject({ status: 'signedIn', user: USER, accessToken: null });
    expect(storage.current()?.refreshToken).toBe('refresh-1');
  });

  it('runs only once (a second call does not reset a signed-in state)', async () => {
    const { store } = setup();
    await store.getState().signIn(LOGIN);
    await store.getState().hydrate();
    expect(store.getState().status).toBe('signedIn');
  });
});

describe('auth store: sign in, restart, sign out', () => {
  it('stores the refresh token and user, never the access token', async () => {
    const { store, storage } = setup();
    await store.getState().hydrate();
    await store.getState().signIn(LOGIN);

    expect(store.getState()).toMatchObject({ status: 'signedIn', accessToken: 'access-1' });
    expect(storage.current()).toEqual({ refreshToken: 'refresh-1', user: USER });
    expect(JSON.stringify(storage.current())).not.toContain('access-1');
  });

  it('survives an app restart: a new store on the same storage is signed in', async () => {
    const storage = memorySessionStorage();
    const before = createAuthStore({ storage, baseUrl: 'http://api.test', fetch: offline });
    await before.getState().hydrate();
    await before.getState().signIn(LOGIN);

    // "Restart": a fresh store, nothing in memory, the same SecureStore.
    const after = createAuthStore({ storage, baseUrl: 'http://api.test', fetch: offline });
    await after.getState().hydrate();
    expect(after.getState()).toMatchObject({ status: 'signedIn', user: USER });
  });

  it('signs out locally even offline, and tells the server when it can', async () => {
    const online = setup(null, { 'POST /auth/logout': () => ({ status: 204 }) });
    await online.store.getState().signIn(LOGIN);
    await online.store.getState().signOut();
    expect(online.store.getState().status).toBe('signedOut');
    expect(online.storage.current()).toBeNull();
    expect(online.calls).toContainEqual({
      route: 'POST /auth/logout',
      body: { refreshToken: 'refresh-1' },
    });

    const storage = memorySessionStorage();
    const offlineStore = createAuthStore({ storage, baseUrl: 'http://api.test', fetch: offline });
    await offlineStore.getState().signIn(LOGIN);
    await offlineStore.getState().signOut();
    expect(offlineStore.getState().status).toBe('signedOut');
    expect(storage.current()).toBeNull();
  });
});

describe('auth store: as the HTTP client token source', () => {
  it('launch refresh and a request at the same moment share ONE refresh (no reuse)', async () => {
    // Refresh answers slowly, so the request's 401 arrives while the launch refresh is pending.
    let release: (() => void) | undefined;
    const answered = new Promise<void>((resolve) => (release = resolve));
    const api = fakeApi({
      'POST /auth/refresh': rotatingRefresh,
      'GET /users/me': () => ({ status: 401, body: errorBody('UNAUTHENTICATED') }),
    });
    const fetch: FetchLike = async (url, init) => {
      if (url.endsWith('/auth/refresh')) await answered;
      return api.fetch(url, init);
    };
    const storage = memorySessionStorage({ refreshToken: 'refresh-1', user: USER });
    const store = createAuthStore({ storage, baseUrl: 'http://api.test', fetch });

    const launching = store.getState().hydrate();
    await new Promise((resolve) => setTimeout(resolve, 0)); // signed in, launch refresh pending
    const request = store
      .getState()
      .http.get('/users/me')
      .catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    release?.();
    await Promise.all([launching, request]);

    // Two refreshes with refresh-1 would be "reuse" to the server and end the session (4.5).
    expect(api.calls.filter((c) => c.route === 'POST /auth/refresh')).toHaveLength(1);
    expect(store.getState().status).toBe('signedIn');
  });

  it('an expired access token is refreshed through the store, saved, and the call retried', async () => {
    const { store, storage, calls } = setup(null, {
      'POST /auth/refresh': rotatingRefresh,
      'GET /users/me': () =>
        calls.at(-1)?.auth === 'Bearer access-2'
          ? { status: 200, body: { data: { user: USER } } }
          : { status: 401, body: errorBody('UNAUTHENTICATED') },
    });
    await store.getState().signIn(LOGIN);

    await expect(store.getState().http.get('/users/me')).resolves.toEqual({ user: USER });
    expect(calls.map((c) => c.route)).toEqual([
      'GET /users/me',
      'POST /auth/refresh',
      'GET /users/me',
    ]);
    expect(storage.current()?.refreshToken).toBe('refresh-2');
  });

  it('a dead refresh token signs the user out', async () => {
    const { store } = setup(null, {
      'POST /auth/refresh': () => ({ status: 401, body: errorBody('INVALID_REFRESH_TOKEN') }),
      'GET /users/me': () => ({ status: 401, body: errorBody('UNAUTHENTICATED') }),
    });
    await store.getState().signIn(LOGIN);

    await expect(store.getState().http.get('/users/me')).rejects.toMatchObject({ status: 401 });
    expect(store.getState().status).toBe('signedOut');
  });

  it('updates the cached user', async () => {
    const { store, storage } = setup();
    await store.getState().signIn(LOGIN);
    const onboarded = { ...USER, onboardingCompletedAt: '2026-11-08T10:00:00.000Z' };
    await store.getState().setUser(onboarded);
    expect(store.getState().user).toEqual(onboarded);
    expect(storage.current()?.user).toEqual(onboarded);
  });
});
