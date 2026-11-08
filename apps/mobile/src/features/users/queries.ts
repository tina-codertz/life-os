import type { MeResponse, PublicSettings, Theme } from '@life-os/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
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

// Settings → Appearance. The cached settings change first, so useThemeFromSettings applies the
// new theme at once; if the server refuses, the old theme comes back and a toast says so.
export function useSetTheme() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (theme: Theme) => api().patch<PublicSettings>('/users/me/settings', { theme }),
    onMutate: async (theme) => {
      await queryClient.cancelQueries({ queryKey: userKeys.me });
      const before = queryClient.getQueryData<MeResponse>(userKeys.me);
      if (before) {
        queryClient.setQueryData<MeResponse>(userKeys.me, {
          ...before,
          settings: { ...before.settings, theme },
        });
      }
      return { before };
    },
    onError: (_err, _theme, context) => {
      if (context?.before) queryClient.setQueryData(userKeys.me, context.before);
      toast({ message: "Couldn't change the appearance. Try again.", tone: 'error' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: userKeys.me }),
  });
}
