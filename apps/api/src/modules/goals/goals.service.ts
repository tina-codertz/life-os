import { Injectable } from '@nestjs/common';
import {
  type CreateGoalInput,
  type CreateMilestoneInput,
  type GoalDetail,
  type ListGoalsQuery,
  MAX_GOALS,
  MAX_MILESTONES,
  type PublicGoal,
  type UpdateGoalInput,
  type UpdateMilestoneInput,
} from '@life-os/shared';
import { toDbDate } from '../../common/dates.js';
import { fieldError } from '../../common/errors/field-error.js';
import type { Goal, Milestone, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CategoryNotFoundError } from '../categories/category.errors.js';
import { toPublicTask } from '../tasks/public-task.js';
import {
  GoalLimitError,
  GoalNotFoundError,
  MilestoneLimitError,
  MilestoneNotFoundError,
} from './goal.errors.js';
import { type LinkedCounts, toPublicGoal } from './public-goal.js';

type Tx = Prisma.TransactionClient;
type GoalWithLinks = Goal & { milestones: Milestone[]; habits: { habitId: string }[] };

// What every goal read loads with it: milestones in order, and the linked habits that still
// exist (a deleted habit drops out of the list without touching the link).
const withLinks = {
  milestones: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  habits: { where: { habit: { deletedAt: null } }, select: { habitId: true } },
} satisfies Prisma.GoalInclude;

// Linked tasks count when they're top-level and not deleted (a subtask counts through its task).
const linkedTaskWhere = { parentId: null, deletedAt: null } satisfies Prisma.TaskWhereInput;

// FR-GOAL-001…006. Every query is scoped by the token's userId and skips soft-deleted goals
// (NFR-SEC-003): another user's goal is simply not found.
@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  // FR-GOAL-006: soonest target first, goals without one last. The app groups by status.
  async list(userId: string, query: ListGoalsQuery): Promise<PublicGoal[]> {
    const goals = await this.prisma.goal.findMany({
      where: { userId, deletedAt: null, ...(query.status ? { status: query.status } : {}) },
      include: withLinks,
      orderBy: [{ targetDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    });
    return this.toPublicList(this.prisma, goals);
  }

  async get(userId: string, id: string): Promise<GoalDetail> {
    return this.detail(this.prisma, await this.findActive(this.prisma, userId, id));
  }

  async create(userId: string, input: CreateGoalInput): Promise<PublicGoal> {
    const existing = await this.prisma.goal.count({ where: { userId, deletedAt: null } });
    if (existing >= MAX_GOALS) throw new GoalLimitError();
    if (input.categoryId) await this.assertOwnCategory(userId, input.categoryId);
    const goal = await this.prisma.goal.create({
      data: {
        userId,
        title: input.title,
        description: input.description || null,
        categoryId: input.categoryId ?? null,
        targetDate: input.targetDate ? toDbDate(input.targetDate) : null,
        progressMode: input.progressMode,
        manualProgress: input.manualProgress ?? null,
      },
      include: withLinks,
    });
    return this.one(this.prisma, goal);
  }

  async update(userId: string, id: string, input: UpdateGoalInput): Promise<PublicGoal> {
    const goal = await this.findActive(this.prisma, userId, id);
    if (input.categoryId) await this.assertOwnCategory(userId, input.categoryId);

    const data: Prisma.GoalUncheckedUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description || null;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.targetDate !== undefined) {
      data.targetDate = input.targetDate ? toDbDate(input.targetDate) : null;
    }
    if (input.progressMode !== undefined) data.progressMode = input.progressMode;
    if (input.manualProgress !== undefined) data.manualProgress = input.manualProgress;
    // FR-GOAL-005: completing records when; completing again keeps the first date, and
    // reopening or abandoning clears it.
    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status !== 'COMPLETED') data.completedAt = null;
      else if (!goal.completedAt) data.completedAt = new Date();
    }
    const updated = await this.prisma.goal.update({ where: { id }, data, include: withLinks });
    return this.one(this.prisma, updated);
  }

  // Soft delete. Its tasks stay, no longer linked, so none points at a goal you can't see; its
  // milestones and habit links go when the row is purged.
  async remove(userId: string, id: string): Promise<void> {
    await this.findActive(this.prisma, userId, id);
    await this.prisma.$transaction([
      this.prisma.task.updateMany({
        where: { goalId: id, userId },
        data: { goalId: null, milestoneId: null },
      }),
      this.prisma.goal.update({ where: { id }, data: { deletedAt: new Date() } }),
    ]);
  }

  // ── Milestones (FR-GOAL-002). Each change answers with the goal, so progress is current. ──

  async addMilestone(userId: string, id: string, input: CreateMilestoneInput): Promise<PublicGoal> {
    const goal = await this.findActive(this.prisma, userId, id);
    if (goal.milestones.length >= MAX_MILESTONES) throw new MilestoneLimitError();
    await this.prisma.milestone.create({
      data: {
        goalId: id,
        title: input.title,
        dueDate: input.dueDate ? toDbDate(input.dueDate) : null,
        sortOrder: goal.milestones.length, // new ones go to the end
      },
    });
    return this.reload(userId, id);
  }

  async updateMilestone(
    userId: string,
    id: string,
    milestoneId: string,
    input: UpdateMilestoneInput,
  ): Promise<PublicGoal> {
    const goal = await this.findActive(this.prisma, userId, id);
    const milestone = goal.milestones.find((m) => m.id === milestoneId);
    if (!milestone) throw new MilestoneNotFoundError();

    const data: Prisma.MilestoneUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate ? toDbDate(input.dueDate) : null;
    if (input.completed !== undefined) {
      // Ticking it again keeps the first date ("Done 2 Nov").
      data.completedAt = input.completed ? (milestone.completedAt ?? new Date()) : null;
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.milestone.update({ where: { id: milestoneId }, data });
      if (input.sortOrder !== undefined) {
        await this.move(tx, goal.milestones, milestoneId, input.sortOrder);
      }
    });
    return this.reload(userId, id);
  }

  async removeMilestone(userId: string, id: string, milestoneId: string): Promise<PublicGoal> {
    const goal = await this.findActive(this.prisma, userId, id);
    if (!goal.milestones.some((m) => m.id === milestoneId)) throw new MilestoneNotFoundError();
    await this.prisma.milestone.delete({ where: { id: milestoneId } });
    return this.reload(userId, id);
  }

  // ── Links (FR-GOAL-004). Each PUT replaces the whole set. ──

  async linkTasks(userId: string, id: string, taskIds: string[]): Promise<GoalDetail> {
    await this.findActive(this.prisma, userId, id);
    // Every id must be one of this user's top-level, not-deleted tasks: one bad id refuses the
    // whole request rather than linking some.
    const found = await this.prisma.task.count({
      where: { id: { in: taskIds }, userId, ...linkedTaskWhere },
    });
    if (found !== taskIds.length) {
      throw fieldError('taskIds', 'Choose your own tasks (not subtasks) to link.');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.task.updateMany({
        where: { goalId: id, userId, id: { notIn: taskIds } },
        data: { goalId: null, milestoneId: null },
      });
      // A task moving here from another goal leaves that goal's milestone behind. (Spelled out:
      // `NOT: { goalId: id }` would skip tasks with no goal, since NULL = id isn't false in SQL.)
      await tx.task.updateMany({
        where: { id: { in: taskIds }, userId, OR: [{ goalId: null }, { goalId: { not: id } }] },
        data: { goalId: id, milestoneId: null },
      });
      return this.detail(tx, await this.findActive(tx, userId, id));
    });
  }

  async linkHabits(userId: string, id: string, habitIds: string[]): Promise<GoalDetail> {
    await this.findActive(this.prisma, userId, id);
    const found = await this.prisma.habit.count({
      where: { id: { in: habitIds }, userId, deletedAt: null },
    });
    if (found !== habitIds.length) throw fieldError('habitIds', 'Choose your own habits to link.');
    return this.prisma.$transaction(async (tx) => {
      await tx.goalHabit.deleteMany({ where: { goalId: id } });
      await tx.goalHabit.createMany({ data: habitIds.map((habitId) => ({ goalId: id, habitId })) });
      return this.detail(tx, await this.findActive(tx, userId, id));
    });
  }

  // ── Helpers ──

  private async findActive(db: Tx, userId: string, id: string): Promise<GoalWithLinks> {
    const goal = await db.goal.findFirst({
      where: { id, userId, deletedAt: null },
      include: withLinks,
    });
    if (!goal) throw new GoalNotFoundError();
    return goal;
  }

  private async reload(userId: string, id: string): Promise<PublicGoal> {
    return this.one(this.prisma, await this.findActive(this.prisma, userId, id));
  }

  private async one(db: Tx, goal: GoalWithLinks): Promise<PublicGoal> {
    const [result] = await this.toPublicList(db, [goal]);
    if (!result) throw new GoalNotFoundError();
    return result;
  }

  private async detail(db: Tx, goal: GoalWithLinks): Promise<GoalDetail> {
    const tasks = await db.task.findMany({
      where: { goalId: goal.id, userId: goal.userId, ...linkedTaskWhere },
      orderBy: [
        { status: 'asc' }, // to do first, then done
        { dueDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
    });
    // Each task's own subtask counts ("2 of 4"), like the task list.
    const subtasks = await db.task.groupBy({
      by: ['parentId', 'status'],
      where: { parentId: { in: tasks.map((t) => t.id) }, deletedAt: null },
      _count: { _all: true },
    });
    const countsOf = (taskId: string) => {
      const rows = subtasks.filter((r) => r.parentId === taskId);
      return {
        total: rows.reduce((sum, r) => sum + r._count._all, 0),
        done: rows.find((r) => r.status === 'DONE')?._count._all ?? 0,
      };
    };
    return {
      ...(await this.one(db, goal)),
      linkedTasks: tasks.map((t) => toPublicTask(t, countsOf(t.id))),
    };
  }

  // One query for the linked-task counts of every goal (and milestone) in the list, not one per
  // goal.
  private async toPublicList(db: Tx, goals: GoalWithLinks[]): Promise<PublicGoal[]> {
    const counts =
      goals.length === 0
        ? []
        : await db.task.groupBy({
            by: ['goalId', 'milestoneId', 'status'],
            where: { goalId: { in: goals.map((g) => g.id) }, ...linkedTaskWhere },
            _count: { _all: true },
          });
    const tally = (rows: typeof counts) => ({
      total: rows.reduce((sum, r) => sum + r._count._all, 0),
      done: rows.filter((r) => r.status === 'DONE').reduce((sum, r) => sum + r._count._all, 0),
    });
    return goals.map((goal) => {
      const rows = counts.filter((r) => r.goalId === goal.id);
      const linked: LinkedCounts = {
        tasks: tally(rows),
        milestoneTasks: (milestoneId) => tally(rows.filter((r) => r.milestoneId === milestoneId)),
        habitIds: goal.habits.map((h) => h.habitId),
      };
      return toPublicGoal(goal, goal.milestones, linked);
    });
  }

  // Puts one milestone at `position` and renumbers the rest 0, 1, 2… in their order.
  private async move(
    tx: Tx,
    milestones: Milestone[],
    milestoneId: string,
    position: number,
  ): Promise<void> {
    const others = milestones.filter((m) => m.id !== milestoneId).map((m) => m.id);
    const at = Math.min(position, others.length);
    const order = [...others.slice(0, at), milestoneId, ...others.slice(at)];
    // One at a time: a transaction runs its queries on one connection anyway.
    for (const [sortOrder, mid] of order.entries()) {
      await tx.milestone.update({ where: { id: mid }, data: { sortOrder } });
    }
  }

  private async assertOwnCategory(userId: string, categoryId: string): Promise<void> {
    try {
      await this.categories.findOwned(userId, categoryId);
    } catch (err) {
      if (err instanceof CategoryNotFoundError) {
        throw fieldError('categoryId', 'Choose one of your categories.');
      }
      throw err;
    }
  }
}
