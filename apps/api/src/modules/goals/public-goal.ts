import { goalProgress, type PublicGoal, type PublicMilestone } from '@life-os/shared';
import { fromDbDate } from '../../common/dates.js';
import type { Goal, Milestone } from '../../generated/prisma/client.js';

export interface LinkedCounts {
  tasks: { total: number; done: number };
  habitIds: string[];
}

export function toPublicMilestone(milestone: Milestone): PublicMilestone {
  return {
    id: milestone.id,
    title: milestone.title,
    dueDate: milestone.dueDate ? fromDbDate(milestone.dueDate) : null,
    completedAt: milestone.completedAt?.toISOString() ?? null,
    sortOrder: milestone.sortOrder,
  };
}

// Allow-listed fields only: userId and deletedAt never leave the API. Progress is worked out
// here from the goal's mode (docs/05: computed on read).
export function toPublicGoal(
  goal: Goal,
  milestones: Milestone[],
  linked: LinkedCounts,
): PublicGoal {
  const done = milestones.filter((m) => m.completedAt !== null).length;
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    progressMode: goal.progressMode,
    manualProgress: goal.manualProgress,
    targetDate: goal.targetDate ? fromDbDate(goal.targetDate) : null,
    completedAt: goal.completedAt?.toISOString() ?? null,
    categoryId: goal.categoryId,
    progress: goalProgress(goal.progressMode, {
      milestones: { done, total: milestones.length },
      tasks: linked.tasks,
      manual: goal.manualProgress,
    }),
    milestones: milestones.map(toPublicMilestone),
    tasks: linked.tasks,
    habitIds: linked.habitIds,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}
