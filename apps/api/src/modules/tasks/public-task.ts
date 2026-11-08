import type { PublicTask } from '@life-os/shared';
import { fromDbDate } from '../../common/dates.js';
import type { Task } from '../../generated/prisma/client.js';

export interface SubtaskCounts {
  total: number;
  done: number;
}
export const NO_SUBTASKS: SubtaskCounts = { total: 0, done: 0 };

// Allow-listed fields only (like toPublicUser): userId and deletedAt never leave the API.
export function toPublicTask(task: Task, subtasks: SubtaskCounts = NO_SUBTASKS): PublicTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? fromDbDate(task.dueDate) : null,
    dueTime: task.dueTime,
    completedAt: task.completedAt?.toISOString() ?? null,
    categoryId: task.categoryId,
    parentId: task.parentId,
    subtaskCount: subtasks.total,
    subtasksDone: subtasks.done,
    sortOrder: task.sortOrder,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
