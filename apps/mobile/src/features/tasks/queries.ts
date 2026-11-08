import type {
  CompleteTaskResult,
  CreateTaskInput,
  PublicCategory,
  PublicTask,
  TaskDetail,
  UpdateTaskInput,
} from '@life-os/shared';
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
import { formatDayShort } from './dates';

export type TaskFilter = 'TODO' | 'DONE' | 'ALL';

export const taskKeys = {
  all: ['tasks'] as const,
  list: (filter: TaskFilter, q = '') => ['tasks', 'list', filter, q] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
};
export const categoryKeys = { all: ['categories'] as const };

type TaskPages = InfiniteData<Paged<PublicTask>, string | null>;

// The task list, 30 at a time; the next page is fetched with the cursor from the last one.
// `q` searches titles and notes on the server (Tasks II).
export function useTasks(filter: TaskFilter, q = '') {
  const search = q.trim();
  return useInfiniteQuery({
    queryKey: taskKeys.list(filter, search),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams();
      if (filter !== 'ALL') params.set('status', filter);
      if (search) params.set('q', search);
      if (pageParam) params.set('cursor', pageParam);
      const query = params.toString();
      return api().getPage<PublicTask>(`/tasks${query ? `?${query}` : ''}`, { signal });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
  });
}

// Candidates for the highlighted card: open tasks due today or earlier, asked for on their own
// so the card doesn't depend on which page of the list happens to be loaded (week 13 review).
export function useFocusCandidates(today: string) {
  return useQuery({
    queryKey: [...taskKeys.all, 'focus', today] as const,
    queryFn: ({ signal }) =>
      api().getPage<PublicTask>(`/tasks?status=TODO&dueTo=${today}&limit=100`, { signal }),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? ''),
    queryFn: ({ signal }) => api().get<TaskDetail>(`/tasks/${id}`, { signal }),
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

interface ToggleInput {
  id: string;
  done: boolean;
  includeSubtasks?: boolean;
}

// Optimistic: the check shows at once; if the server refuses, the old state comes back and a
// toast says so. Lists refetch afterwards (a done task leaves "To do").
export function useToggleTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    // includeSubtasks: complete the task's open subtasks too (the user was asked first).
    mutationFn: ({ id, done, includeSubtasks }: ToggleInput) =>
      api().post<CompleteTaskResult>(
        `/tasks/${id}/${done ? 'complete' : 'uncomplete'}`,
        includeSubtasks ? { includeSubtasks: true } : undefined,
      ),
    onMutate: async ({ id, done, includeSubtasks }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const before = queryClient.getQueriesData<TaskPages>({ queryKey: ['tasks', 'list'] });
      updateCachedTasks(queryClient, (task) =>
        task.id === id
          ? {
              ...task,
              status: done ? 'DONE' : 'TODO',
              completedAt: done ? new Date().toISOString() : null,
              ...(includeSubtasks ? { subtasksDone: task.subtaskCount } : {}),
            }
          : task,
      );
      return { before };
    },
    onError: (_err, _vars, context) => {
      for (const [key, data] of context?.before ?? []) queryClient.setQueryData(key, data);
      toast({ message: "Couldn't update the task. Try again.", tone: 'error' });
    },
    // A repeating task: say when the next one is due (FR-TASK-006).
    onSuccess: (result) => {
      const next = result?.nextOccurrence;
      if (next?.dueDate) {
        toast({
          message: `Done. The next one is due ${formatDayShort(next.dueDate)}.`,
          tone: 'success',
        });
      }
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

// --- Subtasks (FR-TASK-005), shown inside their task's sheet ---

// Every change to a subtask also changes its task's "2 of 4", so lists refetch after each.
export function useAddSubtask(parentId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (title: string) => api().post<PublicTask>(`/tasks/${parentId}/subtasks`, { title }),
    onSuccess: (subtask) => {
      queryClient.setQueryData<TaskDetail>(taskKeys.detail(parentId), (task) =>
        task
          ? { ...task, subtasks: [...task.subtasks, subtask], subtaskCount: task.subtaskCount + 1 }
          : task,
      );
    },
    onError: () => toast({ message: "Couldn't add the subtask. Try again.", tone: 'error' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// Optimistic, like ticking a task: shows at once, comes back if the server refuses.
export function useToggleSubtask(parentId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api().post<{ task: PublicTask }>(`/tasks/${id}/${done ? 'complete' : 'uncomplete'}`),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(parentId) });
      const before = queryClient.getQueryData<TaskDetail>(taskKeys.detail(parentId));
      if (before) {
        const subtasks = before.subtasks.map((t) =>
          t.id === id ? { ...t, status: done ? ('DONE' as const) : ('TODO' as const) } : t,
        );
        queryClient.setQueryData<TaskDetail>(taskKeys.detail(parentId), {
          ...before,
          subtasks,
          subtasksDone: subtasks.filter((t) => t.status === 'DONE').length,
        });
      }
      return { before };
    },
    onError: (_err, _vars, context) => {
      if (context?.before) queryClient.setQueryData(taskKeys.detail(parentId), context.before);
      toast({ message: "Couldn't update the subtask. Try again.", tone: 'error' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useRemoveSubtask(parentId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => api().delete<void>(`/tasks/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(parentId) });
      const before = queryClient.getQueryData<TaskDetail>(taskKeys.detail(parentId));
      if (before) {
        const subtasks = before.subtasks.filter((t) => t.id !== id);
        queryClient.setQueryData<TaskDetail>(taskKeys.detail(parentId), {
          ...before,
          subtasks,
          subtaskCount: subtasks.length,
          subtasksDone: subtasks.filter((t) => t.status === 'DONE').length,
        });
      }
      return { before };
    },
    onError: (_err, _id, context) => {
      if (context?.before) queryClient.setQueryData(taskKeys.detail(parentId), context.before);
      toast({ message: "Couldn't remove the subtask. Try again.", tone: 'error' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// A new task's subtasks are typed before the task exists; they're created right after it.
export async function createSubtasks(parentId: string, titles: string[]): Promise<void> {
  for (const title of titles) {
    await api().post<PublicTask>(`/tasks/${parentId}/subtasks`, { title });
  }
}
