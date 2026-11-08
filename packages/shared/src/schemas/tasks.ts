import { z } from 'zod';
import { paginationQuerySchema } from './pagination.ts';

// Task priority (FR-TASK-001), same order as the database enum.
export const PRIORITIES = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TASK_STATUSES = ['TODO', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_TITLE_MAX_LENGTH = 200;
export const TASK_DESCRIPTION_MAX_LENGTH = 5000;
export const TASK_RESTORE_DAYS = 30;
// FR-TASK-005: one level of subtasks, up to this many per task.
export const MAX_SUBTASKS = 50;

// A calendar day in the user's own time zone ("2026-12-01"), never a timestamp (ADR-006):
// a task due "Monday" stays Monday wherever the user travels. Impossible days are refused.
export const localDateSchema = z.iso.date({ error: 'Use a date like 2026-12-01.' });

const title = z
  .string()
  .trim()
  .min(1, { error: 'Give the task a title.' })
  .max(TASK_TITLE_MAX_LENGTH, { error: `Use at most ${TASK_TITLE_MAX_LENGTH} characters.` });
const description = z
  .string()
  .trim()
  .max(TASK_DESCRIPTION_MAX_LENGTH, {
    error: `Use at most ${TASK_DESCRIPTION_MAX_LENGTH} characters.`,
  });
// Minutes after local midnight: 540 = 09:00.
const dueTime = z.number().int().min(0).max(1439);

const NEEDS_A_DATE = { path: ['dueTime'], error: 'A time needs a date.' };

// POST /tasks. Unknown keys are dropped (POST convention); the owner comes from the token.
export const createTaskSchema = z
  .object({
    title,
    description: description.nullable().optional(),
    priority: z.enum(PRIORITIES).optional(),
    categoryId: z.uuid().nullable().optional(),
    dueDate: localDateSchema.nullable().optional(),
    dueTime: dueTime.nullable().optional(),
  })
  .refine((t) => t.dueTime == null || t.dueDate != null, NEEDS_A_DATE);
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// PATCH /tasks/:id: strict, partial. `null` clears a field. Whether a time still has a date
// after the change depends on the stored task, so that rule is checked in the service too.
export const updateTaskSchema = z.strictObject({
  title: title.optional(),
  description: description.nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  categoryId: z.uuid().nullable().optional(),
  dueDate: localDateSchema.nullable().optional(),
  dueTime: dueTime.nullable().optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// GET /tasks filters (FR-TASK-007), plus ?limit & ?cursor.
export const listTasksQuerySchema = paginationQuerySchema.extend({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  categoryId: z.uuid().optional(),
  dueFrom: localDateSchema.optional(),
  dueTo: localDateSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

// POST /tasks/:id/subtasks. A subtask is a small task of its own (own title, own done state).
export const createSubtaskSchema = z.object({ title });
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;

// POST /tasks/:id/complete. FR-TASK-005: completing a task doesn't complete its subtasks unless
// asked (the app asks the user). No body is the same as {}.
export const completeTaskSchema = z
  .strictObject({ includeSubtasks: z.boolean().optional() })
  .default({});
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;

export interface PublicTask {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null; // "2026-12-01"
  dueTime: number | null; // minutes after local midnight
  completedAt: string | null;
  categoryId: string | null;
  // The parent's id on a subtask; null on a top-level task.
  parentId: string | null;
  // Subtasks of this task (0 on a subtask), for "2 of 4" on the list.
  subtaskCount: number;
  subtasksDone: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// GET /tasks/:id: the task with its subtasks, oldest first.
export interface TaskDetail extends PublicTask {
  subtasks: PublicTask[];
}

export const TASK_ERROR_CODES = [
  'TASK_NOT_FOUND',
  'SUBTASK_NOT_ALLOWED',
  'SUBTASK_LIMIT_REACHED',
] as const;
