import {
  type CreateGoalInput,
  type CreateMilestoneInput,
  type GoalDetail,
  goalProgress,
  type PublicGoal,
  type UpdateGoalInput,
  type UpdateMilestoneInput,
} from '@life-os/shared';
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { api } from '@/features/auth/auth-instance';

// Under "tasks": a goal's progress can count its tasks, so anything that changes a task (and
// invalidates "tasks") refreshes the goals too, like XP under "habits".
export const goalKeys = {
  all: ['tasks', 'goals'] as const,
  list: ['tasks', 'goals', 'list'] as const,
  detail: (id: string) => ['tasks', 'goals', 'detail', id] as const,
};

// Every goal, active first by the soonest target (the API's order); the screen groups them.
export function useGoals() {
  return useQuery({
    queryKey: goalKeys.list,
    queryFn: ({ signal }) => api().get<PublicGoal[]>('/goals', { signal }),
  });
}

export function useGoal(id: string | undefined) {
  return useQuery({
    queryKey: goalKeys.detail(id ?? ''),
    queryFn: ({ signal }) => api().get<GoalDetail>(`/goals/${id}`, { signal }),
    enabled: Boolean(id),
  });
}

// Puts a goal the server just sent into the list and detail caches, so every screen shows it
// at once (the detail keeps its linked tasks).
function store(queryClient: QueryClient, goal: PublicGoal): void {
  queryClient.setQueryData<PublicGoal[]>(goalKeys.list, (list) =>
    list?.map((g) => (g.id === goal.id ? goal : g)),
  );
  queryClient.setQueryData<GoalDetail>(goalKeys.detail(goal.id), (detail) =>
    detail ? { ...detail, ...goal } : detail,
  );
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => api().post<PublicGoal>('/goals', input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function useUpdateGoal(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGoalInput) => api().patch<PublicGoal>(`/goals/${id}`, input),
    onSuccess: (goal) => store(queryClient, goal),
    onSettled: () => queryClient.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api().delete<void>(`/goals/${id}`),
    // Its tasks were unlinked, so they change too.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useAddMilestone(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneInput) =>
      api().post<PublicGoal>(`/goals/${goalId}/milestones`, input),
    onSuccess: (goal) => store(queryClient, goal),
    onSettled: () => queryClient.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function useUpdateMilestone(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateMilestoneInput & { id: string }) =>
      api().patch<PublicGoal>(`/goals/${goalId}/milestones/${id}`, input),
    onSuccess: (goal) => store(queryClient, goal),
    onSettled: () => queryClient.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function useRemoveMilestone(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api().delete<PublicGoal>(`/goals/${goalId}/milestones/${id}`),
    onSuccess: (goal) => store(queryClient, goal),
    // Its tasks stay on the goal without a milestone.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// Tick or untick a milestone. Optimistic: the check and the ring move at once (progress from
// the same shared function as the server); if the server refuses, both go back and a toast
// says so.
export function useToggleMilestone(goal: PublicGoal) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api().patch<PublicGoal>(`/goals/${goal.id}/milestones/${id}`, { completed: done }),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: goalKeys.all });
      const before = [
        [goalKeys.list, queryClient.getQueryData(goalKeys.list)],
        [goalKeys.detail(goal.id), queryClient.getQueryData(goalKeys.detail(goal.id))],
      ] as const;
      const current =
        queryClient.getQueryData<GoalDetail>(goalKeys.detail(goal.id)) ??
        queryClient.getQueryData<PublicGoal[]>(goalKeys.list)?.find((g) => g.id === goal.id) ??
        goal;
      const milestones = current.milestones.map((m) =>
        m.id === id
          ? { ...m, completedAt: done ? (m.completedAt ?? new Date().toISOString()) : null }
          : m,
      );
      const progress = goalProgress(current.progressMode, {
        milestones: {
          done: milestones.filter((m) => m.completedAt !== null).length,
          total: milestones.length,
        },
        tasks: current.tasks,
        manual: current.manualProgress,
      });
      store(queryClient, { ...current, milestones, progress });
      return { before };
    },
    onSuccess: (saved) => store(queryClient, saved),
    onError: (_err, _input, context) => {
      for (const [key, data] of context?.before ?? []) queryClient.setQueryData(key, data);
      toast({ message: "Couldn't save the milestone. Try again.", tone: 'error' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: goalKeys.all }),
  });
}
