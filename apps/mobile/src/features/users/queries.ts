import type { MeResponse } from '@life-os/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/features/auth/auth-instance';

// Query keys in one place, so invalidation after an edit can't miss a spelling.
export const userKeys = {
  me: ['users', 'me'] as const,
};

export function useMe({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: ({ signal }) => api().get<MeResponse>('/users/me', { signal }),
    enabled,
  });
}
