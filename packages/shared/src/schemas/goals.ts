import { z } from 'zod';
import { type PublicTask, localDateSchema } from './tasks.ts';

// FR-GOAL-001: a goal is active until it's completed or abandoned.
export const GOAL_STATUSES = ['ACTIVE', 'COMPLETED', 'ABANDONED'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

// FR-GOAL-003: what the progress ring counts. (SAVINGS comes with Finance in v1.1.)
export const PROGRESS_MODES = ['MILESTONES', 'TASKS', 'MANUAL'] as const;
export type ProgressMode = (typeof PROGRESS_MODES)[number];

export const GOAL_TITLE_MAX_LENGTH = 120;
export const GOAL_DESCRIPTION_MAX_LENGTH = 5000;
export const MILESTONE_TITLE_MAX_LENGTH = 120;
export const MAX_GOALS = 100;
export const MAX_MILESTONES = 50;
// How many tasks or habits one PUT may link.
export const MAX_GOAL_LINKS = 200;

const title = z
  .string()
  .trim()
  .min(1, { error: 'Give the goal a title.' })
  .max(GOAL_TITLE_MAX_LENGTH, { error: `Use at most ${GOAL_TITLE_MAX_LENGTH} characters.` });
const description = z
  .string()
  .trim()
  .max(GOAL_DESCRIPTION_MAX_LENGTH, {
    error: `Use at most ${GOAL_DESCRIPTION_MAX_LENGTH} characters.`,
  });
const manualProgress = z.number().int().min(0).max(100);
const milestoneTitle = z
  .string()
  .trim()
  .min(1, { error: 'Give the milestone a title.' })
  .max(MILESTONE_TITLE_MAX_LENGTH, {
    error: `Use at most ${MILESTONE_TITLE_MAX_LENGTH} characters.`,
  });

export const createGoalSchema = z.object({
  title,
  description: description.nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  targetDate: localDateSchema.nullable().optional(),
  progressMode: z.enum(PROGRESS_MODES).default('MILESTONES'),
  manualProgress: manualProgress.nullable().optional(),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

// Strict, like every PATCH: a misspelt field is an error, not a silent "saved".
export const updateGoalSchema = z.strictObject({
  title: title.optional(),
  description: description.nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  targetDate: localDateSchema.nullable().optional(),
  progressMode: z.enum(PROGRESS_MODES).optional(),
  manualProgress: manualProgress.nullable().optional(),
  // FR-GOAL-005: COMPLETED records the date; back to ACTIVE clears it.
  status: z.enum(GOAL_STATUSES).optional(),
});
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const listGoalsQuerySchema = z.object({
  status: z.enum(GOAL_STATUSES).optional(),
});
export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>;

export const createMilestoneSchema = z.object({
  title: milestoneTitle,
  dueDate: localDateSchema.nullable().optional(),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneSchema = z.strictObject({
  title: milestoneTitle.optional(),
  dueDate: localDateSchema.nullable().optional(),
  completed: z.boolean().optional(),
  // The new position (0 = first); the others move to make room.
  sortOrder: z.number().int().min(0).max(MAX_MILESTONES).optional(),
});
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

// Replaces the whole linked set (docs/06): send every id that should stay linked.
const ids = z
  .array(z.uuid())
  .max(MAX_GOAL_LINKS, { error: `Link at most ${MAX_GOAL_LINKS}.` })
  .transform((list) => [...new Set(list)]);
export const linkGoalTasksSchema = z.strictObject({ taskIds: ids });
export type LinkGoalTasksInput = z.infer<typeof linkGoalTasksSchema>;
export const linkGoalHabitsSchema = z.strictObject({ habitIds: ids });
export type LinkGoalHabitsInput = z.infer<typeof linkGoalHabitsSchema>;

export interface PublicMilestone {
  id: string;
  title: string;
  dueDate: string | null; // "2026-12-01"
  completedAt: string | null;
  sortOrder: number;
  // Linked top-level tasks on this milestone ("Due 28 Nov · 3 tasks").
  tasks: { total: number; done: number };
}

// Worked out on the server from the goal's mode: done / total milestones, done / total linked
// tasks, or the manual percentage (done = percent, total = 100).
export interface GoalProgress {
  percent: number; // 0–100, rounded
  done: number;
  total: number;
}

export interface PublicGoal {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  progressMode: ProgressMode;
  manualProgress: number | null;
  targetDate: string | null;
  completedAt: string | null;
  categoryId: string | null;
  progress: GoalProgress;
  milestones: PublicMilestone[]; // in order
  tasks: { total: number; done: number }; // linked (top-level) tasks
  habitIds: string[];
  createdAt: string;
  updatedAt: string;
}

// GET /goals/:id: the goal plus its linked tasks (the detail lists them).
export interface GoalDetail extends PublicGoal {
  linkedTasks: PublicTask[];
}

export const GOAL_ERROR_CODES = [
  'GOAL_NOT_FOUND',
  'MILESTONE_NOT_FOUND',
  'GOAL_LIMIT_REACHED',
  'MILESTONE_LIMIT_REACHED',
] as const;

// FR-GOAL-003, docs/05 "Goal progress": computed on read. Nothing to count yet = 0%.
export function goalProgress(
  mode: ProgressMode,
  counts: {
    milestones: { done: number; total: number };
    tasks: { done: number; total: number };
    manual: number | null;
  },
): GoalProgress {
  if (mode === 'MANUAL') {
    const percent = counts.manual ?? 0;
    return { percent, done: percent, total: 100 };
  }
  const { done, total } = mode === 'TASKS' ? counts.tasks : counts.milestones;
  return { percent: total === 0 ? 0 : Math.round((done / total) * 100), done, total };
}
