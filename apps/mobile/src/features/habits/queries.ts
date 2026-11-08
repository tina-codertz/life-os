import type {
  CreateHabitInput,
  HabitCheckInResult,
  HabitDay,
  HabitStats,
  Progress,
  PublicHabit,
  UpdateHabitInput,
} from '@life-os/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { api } from '@/features/auth/auth-instance';
import { isApiError } from '@/services/api-error';

export const habitKeys = {
  all: ['habits'] as const,
  list: (archived: boolean) => ['habits', 'list', archived] as const,
  days: (id: string, from: string, to: string) => ['habits', 'days', id, from, to] as const,
  stats: (id: string) => ['habits', 'stats', id] as const,
};
// XP and the 🔥 streak. Under habits too, so a check-in refreshes it.
export const progressKey = ['habits', 'progress'] as const;

export function useHabits(archived = false) {
  return useQuery({
    queryKey: habitKeys.list(archived),
    queryFn: ({ signal }) =>
      api().get<PublicHabit[]>(`/habits${archived ? '?archived=true' : ''}`, { signal }),
  });
}

export function useHabitDays(id: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: habitKeys.days(id ?? '', from, to),
    queryFn: ({ signal }) =>
      api().get<HabitDay[]>(`/habits/${id}/days?from=${from}&to=${to}`, { signal }),
    enabled: Boolean(id),
  });
}

// Consistency and Total days for the habit detail. Under habits, so a check-in refreshes it.
export function useHabitStats(id: string | undefined) {
  return useQuery({
    queryKey: habitKeys.stats(id ?? ''),
    queryFn: ({ signal }) => api().get<HabitStats>(`/habits/${id}/stats`, { signal }),
    enabled: Boolean(id),
  });
}

export function useProgress() {
  return useQuery({
    queryKey: progressKey,
    queryFn: ({ signal }) => api().get<Progress>('/progress', { signal }),
  });
}

// Check in (or undo) one day. Optimistic: the day, and today's check-in, change at once; if the
// server refuses, they go back and a toast says why. `today` is the user's (useTimezone).
export function useCheckIn(habit: PublicHabit, today: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ day, undo, count }: CheckIn) =>
      undo
        ? api().delete<HabitCheckInResult>(`/habits/${habit.id}/completions/${day}`)
        : api().post<HabitCheckInResult>(`/habits/${habit.id}/completions`, {
            localDate: day,
            ...(count !== undefined ? { count } : {}),
          }),
    onMutate: async ({ day, undo, count }) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.all });
      const before = [
        ...queryClient.getQueriesData<PublicHabit[]>({ queryKey: ['habits', 'list'] }),
        ...queryClient.getQueriesData<HabitDay[]>({ queryKey: ['habits', 'days', habit.id] }),
      ];
      const newCount = undo ? 0 : (count ?? habit.targetCount);
      const state: HabitDay['state'] =
        newCount >= habit.targetCount ? 'done' : day === today ? 'today' : 'missed';
      queryClient.setQueriesData<HabitDay[]>({ queryKey: ['habits', 'days', habit.id] }, (list) =>
        list?.map((d) => (d.date === day ? { ...d, count: newCount, state } : d)),
      );
      if (day === today) {
        queryClient.setQueriesData<PublicHabit[]>({ queryKey: ['habits', 'list'] }, (list) =>
          list?.map((h) =>
            h.id === habit.id
              ? {
                  ...h,
                  today: undo
                    ? null
                    : { localDate: day, count: newCount, completedAt: new Date().toISOString() },
                }
              : h,
          ),
        );
      }
      return { before };
    },
    onError: (err, _vars, context) => {
      for (const [key, data] of context?.before ?? []) queryClient.setQueryData(key, data);
      toast({
        // The server's own words for a day out of range ("…the last 7 days.").
        message: isApiError(err, 'CHECK_IN_OUT_OF_RANGE')
          ? err.message
          : "Couldn't save the check-in. Try again.",
        tone: 'error',
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  });
}

export interface CheckIn {
  day: string;
  undo: boolean;
  count?: number;
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitInput) => api().post<PublicHabit>('/habits', input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  });
}

export function useUpdateHabit(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateHabitInput) => api().patch<PublicHabit>(`/habits/${id}`, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  });
}

export function useArchiveHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      api().post<PublicHabit>(`/habits/${id}/${archived ? 'archive' : 'unarchive'}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api().delete<void>(`/habits/${id}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  });
}
