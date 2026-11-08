import { ApiError, isApiError } from './api-error';
import { createHttpClient, type FetchLike, type TokenSource } from './http';

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };
type Reply = { status: number; body?: unknown; raw?: string };

// A scripted fake server: `handler` decides each reply and every call is recorded.
function fakeFetch(handler: (call: Call) => Reply | Promise<Reply>) {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    const call: Call = { url, method: init.method, headers: init.headers };
    if (init.body !== undefined) call.body = init.body;
    calls.push(call);
    const reply = await handler(call);
    const text = reply.raw ?? (reply.body === undefined ? '' : JSON.stringify(reply.body));
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      text: async () => text,
    };
  };
  return { fetch, calls };
}

const errorReply = (status: number, code: string): Reply => ({
  status,
  body: { error: { code, message: `${code} message`, details: [], requestId: 'req-1' } },
});

// Tokens like the auth store will hold them; refresh swaps in the next one.
function fakeTokens(start: string | null, next: string | null = 'fresh-token') {
  let current = start;
  const refresh = jest.fn(async () => {
    await Promise.resolve(); // a real refresh is a network round trip
    current = next;
    return next;
  });
  const tokens: TokenSource = { getAccessToken: () => current, refresh };
  return { tokens, refresh };
}

// The API accepts only `valid`: anything else is an expired token.
const acceptsOnly =
  (valid: string) =>
  (call: Call): Reply =>
    call.headers['Authorization'] === `Bearer ${valid}`
      ? { status: 200, body: { data: { ok: true } } }
      : errorReply(401, 'UNAUTHENTICATED');

const BASE = 'http://api.test';

const offline: FetchLike = () => Promise.reject(new TypeError('Network request failed'));

// Hangs until aborted, like a server that never answers.
const neverAnswers: FetchLike = (_url, init) =>
  new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });

describe('http client: requests and responses', () => {
  it('prefixes the path, sends JSON and the token, and unwraps { data }', async () => {
    const { fetch, calls } = fakeFetch(() => ({ status: 200, body: { data: { id: 'u1' } } }));
    const http = createHttpClient({ baseUrl: BASE, tokens: fakeTokens('t1').tokens, fetch });

    await expect(http.patch('/users/me', { displayName: 'Tina' })).resolves.toEqual({ id: 'u1' });
    expect(calls[0]).toEqual({
      url: 'http://api.test/api/v1/users/me',
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer t1',
      },
      body: '{"displayName":"Tina"}',
    });
  });

  it('returns undefined for 204 No Content', async () => {
    const { fetch } = fakeFetch(() => ({ status: 204 }));
    const http = createHttpClient({ baseUrl: BASE, tokens: fakeTokens('t1').tokens, fetch });
    await expect(http.post('/auth/logout', { refreshToken: 'r' })).resolves.toBeUndefined();
  });

  it('sends no token when auth is false', async () => {
    const { fetch, calls } = fakeFetch(() => ({ status: 200, body: { data: {} } }));
    const http = createHttpClient({ baseUrl: BASE, tokens: fakeTokens('t1').tokens, fetch });
    await http.post('/auth/login', { email: 'a@b.co' }, { auth: false });
    expect(calls[0]?.headers['Authorization']).toBeUndefined();
  });
});

describe('http client: errors', () => {
  it('turns the error envelope into an ApiError with code, details and request ID', async () => {
    const { fetch } = fakeFetch(() => ({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Some fields are invalid.',
          details: [{ field: 'email', message: 'Enter a valid email address.' }],
          requestId: 'req-42',
        },
      },
    }));
    const http = createHttpClient({ baseUrl: BASE, tokens: fakeTokens('t1').tokens, fetch });

    const error = await http.post('/auth/register', {}).catch((e: unknown) => e);
    expect(isApiError(error, 'VALIDATION_FAILED')).toBe(true);
    expect(error).toMatchObject({ status: 400, requestId: 'req-42' });
    expect((error as ApiError).fieldErrors()).toEqual({ email: 'Enter a valid email address.' });
  });

  it('a malformed error envelope keeps only the fields that check out', async () => {
    const { fetch } = fakeFetch(() => ({
      status: 409,
      body: {
        error: { code: 'EMAIL_TAKEN', message: 42, details: [{ nope: true }, { message: 'ok' }] },
      },
    }));
    const http = createHttpClient({ baseUrl: BASE, tokens: fakeTokens('t1').tokens, fetch });
    await expect(http.post('/auth/register', {})).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
      message: 'Request failed.',
      details: [{ message: 'ok' }],
    });
  });

  it('a non-JSON error page becomes HTTP_ERROR with its status', async () => {
    const { fetch } = fakeFetch(() => ({ status: 502, raw: '<html>Bad Gateway</html>' }));
    const http = createHttpClient({ baseUrl: BASE, tokens: fakeTokens('t1').tokens, fetch });
    await expect(http.get('/health')).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR' });
  });

  it('no connection becomes NETWORK_ERROR (status 0)', async () => {
    const fetch = offline;
    const http = createHttpClient({ baseUrl: BASE, tokens: fakeTokens('t1').tokens, fetch });
    await expect(http.get('/health')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('a server that never answers becomes TIMEOUT', async () => {
    const fetch = neverAnswers;
    const http = createHttpClient({
      baseUrl: BASE,
      tokens: fakeTokens('t1').tokens,
      fetch,
      timeoutMs: 20,
    });
    await expect(http.get('/health')).rejects.toMatchObject({ status: 0, code: 'TIMEOUT' });
  });

  it('a request cancelled by the caller rejects with the abort, not an ApiError', async () => {
    const fetch = neverAnswers;
    const http = createHttpClient({ baseUrl: BASE, tokens: fakeTokens('t1').tokens, fetch });
    const controller = new AbortController();
    const pending = http.get('/users/me', { signal: controller.signal });
    controller.abort();
    const error = await pending.catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ApiError);
  });
});

describe('http client: expired access token', () => {
  it('401 → refresh → retry with the new token', async () => {
    const { fetch, calls } = fakeFetch(acceptsOnly('fresh-token'));
    const { tokens, refresh } = fakeTokens('old-token');
    const http = createHttpClient({ baseUrl: BASE, tokens, fetch });

    await expect(http.get('/users/me')).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.headers['Authorization'])).toEqual([
      'Bearer old-token',
      'Bearer fresh-token',
    ]);
  });

  it('several requests failing at once share ONE refresh, then all succeed', async () => {
    const { fetch, calls } = fakeFetch(acceptsOnly('fresh-token'));
    const { tokens, refresh } = fakeTokens('old-token');
    const http = createHttpClient({ baseUrl: BASE, tokens, fetch });

    const results = await Promise.all([
      http.get('/users/me'),
      http.get('/tasks'),
      http.get('/habits'),
      http.patch('/users/me/settings', { theme: 'DARK' }),
    ]);

    expect(results).toEqual(Array.from({ length: 4 }, () => ({ ok: true })));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(8); // 4 rejected + 4 retried
  });

  it('a later batch of 401s refreshes again (the shared refresh is not cached forever)', async () => {
    let valid = 'fresh-token';
    const { fetch } = fakeFetch((call) => acceptsOnly(valid)(call));
    const { tokens, refresh } = fakeTokens('old-token');
    const http = createHttpClient({ baseUrl: BASE, tokens, fetch });

    await http.get('/users/me');
    valid = 'fresh-token-2'; // the 15 minutes are up again
    const secondRefresh = jest.fn(async () => 'fresh-token-2');
    tokens.refresh = secondRefresh;
    refresh.mockClear();
    await expect(http.get('/users/me')).resolves.toEqual({ ok: true });
    expect(secondRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh if another request already did while this one was in flight', async () => {
    const { tokens, refresh } = fakeTokens('old-token');
    let current = 'old-token';
    tokens.getAccessToken = () => current;
    const { fetch, calls } = fakeFetch((call) => {
      // The token changes (another request refreshed) after this request was sent.
      current = 'fresh-token';
      return acceptsOnly('fresh-token')(call);
    });
    const http = createHttpClient({ baseUrl: BASE, tokens, fetch });

    await expect(http.get('/users/me')).resolves.toEqual({ ok: true });
    expect(refresh).not.toHaveBeenCalled();
    expect(calls).toHaveLength(2);
  });

  it('when the session is over (refresh gives null) the 401 is thrown, without a retry', async () => {
    const { fetch, calls } = fakeFetch(acceptsOnly('never'));
    const { tokens } = fakeTokens('old-token', null);
    const http = createHttpClient({ baseUrl: BASE, tokens, fetch });

    await expect(http.get('/users/me')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    });
    expect(calls).toHaveLength(1);
  });

  it('retries only once: a second 401 is thrown, not looped', async () => {
    const { fetch, calls } = fakeFetch(acceptsOnly('never'));
    const { tokens, refresh } = fakeTokens('old-token');
    const http = createHttpClient({ baseUrl: BASE, tokens, fetch });

    await expect(http.get('/users/me')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  it.each([
    ['a wrong password', 'INVALID_CREDENTIALS'],
    ['a dead refresh token', 'INVALID_REFRESH_TOKEN'],
  ])('does not refresh on 401 for %s', async (_case, code) => {
    const { fetch } = fakeFetch(() => errorReply(401, code));
    const { tokens, refresh } = fakeTokens('t1');
    const http = createHttpClient({ baseUrl: BASE, tokens, fetch });

    await expect(http.post('/auth/login', {})).rejects.toMatchObject({ code });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('does not refresh for requests made without auth', async () => {
    const { fetch } = fakeFetch(() => errorReply(401, 'UNAUTHENTICATED'));
    const { tokens, refresh } = fakeTokens('t1');
    const http = createHttpClient({ baseUrl: BASE, tokens, fetch });

    await expect(http.post('/auth/refresh', {}, { auth: false })).rejects.toBeInstanceOf(ApiError);
    expect(refresh).not.toHaveBeenCalled();
  });
});
