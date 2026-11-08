import type { PublicTask } from '@life-os/shared';
import { fromDbDate } from '../../common/dates.js';
import type { Task } from '../../generated/prisma/client.js';

// Allow-listed fields only (like toPublicUser): userId and deletedAt never leave the API.
export function toPublicTask(task: Task): PublicTask {
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
    sortOrder: task.sortOrder,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
