import type { CreateTaskInput, PublicCategory, PublicTask, UpdateTaskInput } from '@life-os/shared';
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { api } from '@/features/auth/auth-instance';
import type { Paged } from '@/services/http';

export type TaskFilter = 'TODO' | 'DONE' | 'ALL';

export const taskKeys = {
  all: ['tasks'] as const,
  list: (filter: TaskFilter) => ['tasks', 'list', filter] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
};
export const categoryKeys = { all: ['categories'] as const };

type TaskPages = InfiniteData<Paged<PublicTask>, string | null>;

// The task list, 30 at a time; the next page is fetched with the cursor from the last one.
export function useTasks(filter: TaskFilter) {
  return useInfiniteQuery({
    queryKey: taskKeys.list(filter),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams();
      if (filter !== 'ALL') params.set('status', filter);
      if (pageParam) params.set('cursor', pageParam);
      const query = params.toString();
      return api().getPage<PublicTask>(`/tasks${query ? `?${query}` : ''}`, { signal });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? ''),
    queryFn: ({ signal }) => api().get<PublicTask>(`/tasks/${id}`, { signal }),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: ({ signal }) => api().get<PublicCategory[]>('/categories', { signal }),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api().post<PublicTask>('/tasks', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateTask(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => api().patch<PublicTask>(`/tasks/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// Every cached list page, with `change` applied to each task (or the task removed if it
// returns null). Used for optimistic updates.
function updateCachedTasks(
  queryClient: QueryClient,
  change: (task: PublicTask) => PublicTask | null,
): void {
  queryClient.setQueriesData<TaskPages>({ queryKey: ['tasks', 'list'] }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.flatMap((task) => {
              const next = change(task);
              return next ? [next] : [];
            }),
          })),
        }
      : data,
  );
}

// Optimistic: the check shows at once; if the server refuses, the old state comes back and a
// toast says so. Lists refetch afterwards (a done task leaves "To do").
export function useToggleTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api().post<{ task: PublicTask }>(`/tasks/${id}/${done ? 'complete' : 'uncomplete'}`),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const before = queryClient.getQueriesData<TaskPages>({ queryKey: ['tasks', 'list'] });
      updateCachedTasks(queryClient, (task) =>
        task.id === id
          ? {
              ...task,
              status: done ? 'DONE' : 'TODO',
              completedAt: done ? new Date().toISOString() : null,
            }
          : task,
      );
      return { before };
    },
    onError: (_err, _vars, context) => {
      for (const [key, data] of context?.before ?? []) queryClient.setQueryData(key, data);
      toast({ message: "Couldn't update the task. Try again.", tone: 'error' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// Removes the task at once and offers Undo (docs/07 §6: soft delete + undo toast, 5 s).
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (task: PublicTask) => api().delete<void>(`/tasks/${task.id}`),
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const before = queryClient.getQueriesData<TaskPages>({ queryKey: ['tasks', 'list'] });
      updateCachedTasks(queryClient, (t) => (t.id === task.id ? null : t));
      return { before };
    },
    onError: (_err, _task, context) => {
      for (const [key, data] of context?.before ?? []) queryClient.setQueryData(key, data);
      toast({ message: "Couldn't delete the task. Try again.", tone: 'error' });
    },
    onSuccess: (_result, task) => {
      toast({
        message: 'Task deleted',
        action: {
          label: 'Undo',
          onPress: () => {
            void api()
              .post(`/tasks/${task.id}/restore`)
              .then(() => queryClient.invalidateQueries({ queryKey: taskKeys.all }))
              .catch(() => toast({ message: "Couldn't restore the task.", tone: 'error' }));
          },
        },
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
