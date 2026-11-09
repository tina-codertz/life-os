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

// A settings change (PATCH /users/me/settings). The cached settings change first, so the app
// reacts at once (the theme applies, reminders are re-planned); if the server refuses, the old
// value comes back and a toast says so.
type SettingsPatch = Partial<Pick<PublicSettings, 'theme' | 'habitRemindersOn'>>;

function useSettingsPatch(failure: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => api().patch<PublicSettings>('/users/me/settings', patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: userKeys.me });
      const before = queryClient.getQueryData<MeResponse>(userKeys.me);
      if (before) {
        queryClient.setQueryData<MeResponse>(userKeys.me, {
          ...before,
          settings: { ...before.settings, ...patch },
        });
      }
      return { before };
    },
    onError: (_err, _patch, context) => {
      if (context?.before) queryClient.setQueryData(userKeys.me, context.before);
      toast({ message: failure, tone: 'error' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: userKeys.me }),
  });
}

// Settings → Appearance.
export function useSetTheme() {
  const patch = useSettingsPatch("Couldn't change the appearance. Try again.");
  return { ...patch, mutate: (theme: Theme) => patch.mutate({ theme }) };
}

// Settings → Notifications: habit reminders on or off (FR-SET-004).
export function useSetHabitReminders() {
  const patch = useSettingsPatch("Couldn't change notifications. Try again.");
  return { ...patch, mutate: (on: boolean) => patch.mutate({ habitRemindersOn: on }) };
}
