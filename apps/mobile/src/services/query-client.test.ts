import { ApiError } from './api-error';
import { shouldRetry } from './query-client';

describe('shouldRetry', () => {
  it.each([
    ['no connection', new ApiError(0, 'NETWORK_ERROR', 'x'), true],
    ['a timeout (status 0)', new ApiError(0, 'TIMEOUT', 'x'), true],
    ['a 503', new ApiError(503, 'SERVICE_UNAVAILABLE', 'x'), true],
    ['a 408', new ApiError(408, 'HTTP_ERROR', 'x'), true],
    ['a 404', new ApiError(404, 'NOT_FOUND', 'x'), false],
    ['a 401', new ApiError(401, 'UNAUTHENTICATED', 'x'), false],
    ['a 429', new ApiError(429, 'RATE_LIMITED', 'x'), false],
    ['a bug (not an ApiError)', new TypeError('x is undefined'), false],
  ])('first failure from %s → retry: %s', (_case, error, expected) => {
    expect(shouldRetry(0, error)).toBe(expected);
  });

  it('gives up after two retries', () => {
    const offline = new ApiError(0, 'NETWORK_ERROR', 'x');
    expect([0, 1, 2].map((n) => shouldRetry(n, offline))).toEqual([true, true, false]);
  });
});
