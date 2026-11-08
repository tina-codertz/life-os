import type { TaskHistory } from '@life-os/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/features/auth/auth-instance';
import { taskKeys } from '@/features/tasks/queries';

// Completed tasks per local day (GET /tasks/history). Under taskKeys.all, so completing or
// deleting a task refreshes History too.
export function useHistory(from: string, to: string, includeTasks = false) {
  return useQuery({
    queryKey: [...taskKeys.all, 'history', from, to, includeTasks] as const,
    queryFn: ({ signal }) =>
      api().get<TaskHistory>(
        `/tasks/history?from=${from}&to=${to}${includeTasks ? '&include=tasks' : ''}`,
        { signal },
      ),
  });
}

// "09:40": when a task was completed, on the user's clock.
export function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}
