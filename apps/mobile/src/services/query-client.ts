import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './api-error';

const MINUTE = 60_000;
export const CACHE_MAX_AGE = 24 * 60 * MINUTE;

// Retry what a retry can fix: no connection, a timeout, a server hiccup (5xx). A 4xx means the
// request itself is wrong or not allowed; asking again gives the same answer.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (!isApiError(error)) return false;
  return error.status === 0 || error.status === 408 || error.status >= 500;
}

// One client per signed-in user (QueryProvider). Offline, queries *pause* instead of failing
// (networkMode 'online', the default) and resume when the connection is back.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // refetch on use after 30 s, show cached data meanwhile
        gcTime: CACHE_MAX_AGE, // kept at least as long as the saved cache lives
        retry: shouldRetry,
      },
      mutations: { retry: false },
    },
  });
}
