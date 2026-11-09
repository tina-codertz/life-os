import { Injectable } from '@nestjs/common';
import {
  type CompleteTaskResult,
  type CreateSubtaskInput,
  type CreateTaskInput,
  type HistoryDay,
  type HistoryQuery,
  type ListTasksQuery,
  localToday,
  MAX_SUBTASKS,
  nextDueDate,
  parseRule,
  type PublicTask,
  TASK_RESTORE_DAYS,
  type TaskDetail,
  type TaskHistory,
  type UpdateTaskInput,
} from '@life-os/shared';
import { fromDbDate, toDbDate } from '../../common/dates.js';
import { decodeCursor, pageOf } from '../../common/pagination/cursor.js';
import { Page } from '../../common/pagination/page.js';
import { Prisma, type Task } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CategoryNotFoundError } from '../categories/category.errors.js';
import { XpService } from '../progress/xp.service.js';
import { NO_SUBTASKS, type SubtaskCounts, toPublicTask } from './public-task.js';
import {
  fieldError,
  SubtaskLimitError,
  SubtaskNotAllowedError,
  TaskNotFoundError,
} from './task.errors.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Every query is scoped by the token's userId and skips soft-deleted rows (NFR-SEC-003): there is
// no way to name another user's task, and a deleted task is gone except for restore.
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    private readonly xp: XpService,
  ) {}

  // Newest first. UUIDv7 IDs sort by creation time, so "id < cursor" pages without gaps or
  // repeats even while tasks are being added.
  async list(userId: string, query: ListTasksQuery): Promise<Page<PublicTask>> {
    // Top-level tasks only: subtasks are shown inside their task (GET /tasks/:id).
    const where: Prisma.TaskWhereInput = { userId, deletedAt: null, parentId: null };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.dueFrom || query.dueTo) {
      where.dueDate = {
        ...(query.dueFrom ? { gte: toDbDate(query.dueFrom) } : {}),
        ...(query.dueTo ? { lte: toDbDate(query.dueTo) } : {}),
      };
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.cursor) where.id = { lt: decodeCursor(query.cursor) };

    const rows = await this.prisma.task.findMany({
      where,
      orderBy: { id: 'desc' },
      take: query.limit + 1,
    });
    const { items, meta } = pageOf(rows, query.limit);
    const counts = await this.subtaskCounts(items.map((t) => t.id));
    return new Page(
      items.map((t) => toPublicTask(t, counts.get(t.id))),
      meta,
    );
  }

  // The task with its subtasks, oldest first (the order they were added).
  // Completed top-level tasks per day in the user's own time zone (a task done at 23:30 in Dar
  // es Salaam counts on that local day, not on the UTC one). Days with nothing are left out.
  async history(userId: string, query: HistoryQuery): Promise<TaskHistory> {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const tz = settings?.timezone ?? 'UTC';
    // Bounds in UTC a day wider than the range on each side (zones are at most ±14 h), so the
    // (userId, completedAt) index narrows the rows before the exact local-day check.
    const after = new Date(toDbDate(query.from).getTime() - DAY_MS);
    const before = new Date(toDbDate(query.to).getTime() + 2 * DAY_MS);
    const rows = await this.prisma.$queryRaw<{ id: string; day: string }[]>(Prisma.sql`
      SELECT "id", to_char(("completedAt" AT TIME ZONE ${tz})::date, 'YYYY-MM-DD') AS "day"
      FROM "Task"
      WHERE "userId" = ${userId}::uuid
        AND "status" = 'DONE'
        AND "deletedAt" IS NULL
        AND "parentId" IS NULL
        AND "completedAt" >= ${after} AND "completedAt" < ${before}
        AND ("completedAt" AT TIME ZONE ${tz})::date BETWEEN ${query.from}::date AND ${query.to}::date
    `);

    const byDay = new Map<string, string[]>();
    for (const row of rows) {
      const ids = byDay.get(row.day);
      if (ids) ids.push(row.id);
      else byDay.set(row.day, [row.id]);
    }
    const dates = [...byDay.keys()].toSorted();

    let tasksById = new Map<string, PublicTask>();
    if (query.include === 'tasks' && rows.length > 0) {
      const tasks = await this.prisma.task.findMany({
        where: { id: { in: rows.map((r) => r.id) } },
      });
      const counts = await this.subtaskCounts(tasks.map((t) => t.id));
      tasksById = new Map(tasks.map((t) => [t.id, toPublicTask(t, counts.get(t.id))]));
    }

    const days: HistoryDay[] = dates.map((date) => {
      const ids = byDay.get(date) ?? [];
      if (query.include !== 'tasks') return { date, count: ids.length };
      const tasks = ids
        .map((id) => tasksById.get(id))
        .filter((t): t is PublicTask => t !== undefined)
        .toSorted((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
      return { date, count: ids.length, tasks };
    });
    return { from: query.from, to: query.to, total: rows.length, days };
  }

  async get(userId: string, id: string): Promise<TaskDetail> {
    const task = await this.findActive(userId, id);
    const subtasks = await this.prisma.task.findMany({
      where: { parentId: task.id, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return {
      ...toPublicTask(task, countOf(subtasks)),
      subtasks: subtasks.map((t) => toPublicTask(t)),
    };
  }

  // FR-TASK-005: one level deep, so a subtask can't get subtasks; at most MAX_SUBTASKS each.
  async addSubtask(
    userId: string,
    parentId: string,
    input: CreateSubtaskInput,
  ): Promise<PublicTask> {
    const parent = await this.findActive(userId, parentId);
    if (parent.parentId) throw new SubtaskNotAllowedError();
    const existing = await this.prisma.task.count({
      where: { parentId: parent.id, deletedAt: null },
    });
    if (existing >= MAX_SUBTASKS) throw new SubtaskLimitError();
    const subtask = await this.prisma.task.create({
      data: { userId, parentId: parent.id, title: input.title, sortOrder: existing },
    });
    return toPublicTask(subtask);
  }

  async create(userId: string, input: CreateTaskInput): Promise<PublicTask> {
    if (input.categoryId) await this.assertOwnCategory(userId, input.categoryId);
    if (input.goalId) await this.assertOwnGoal(userId, input.goalId);
    const task = await this.prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description || null,
        priority: input.priority ?? 'NONE',
        categoryId: input.categoryId ?? null,
        goalId: input.goalId ?? null,
        dueDate: input.dueDate ? toDbDate(input.dueDate) : null,
        dueTime: input.dueTime ?? null,
        recurrenceRule: input.recurrenceRule ?? null,
      },
    });
    return toPublicTask(task);
  }

  async update(userId: string, id: string, input: UpdateTaskInput): Promise<PublicTask> {
    const task = await this.findActive(userId, id);
    if (input.categoryId) await this.assertOwnCategory(userId, input.categoryId);
    if (input.goalId) {
      // A subtask counts towards a goal through its task (FR-TASK-005 keeps it one level).
      if (task.parentId) throw fieldError('goalId', 'Link the main task to a goal instead.');
      await this.assertOwnGoal(userId, input.goalId);
    }

    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description || null;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.goalId !== undefined) data.goalId = input.goalId;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate ? toDbDate(input.dueDate) : null;
    if (input.dueTime !== undefined) data.dueTime = input.dueTime;
    // Changing the repeat changes this task and the ones it creates, not finished ones.
    if (input.recurrenceRule !== undefined) data.recurrenceRule = input.recurrenceRule;

    // A time or a repeat only means something with a day: removing the date removes both, and
    // neither can be set on a task that has (or will have) no date.
    if (input.dueDate === null) {
      data.dueTime = null;
      data.recurrenceRule = null;
    }
    const dateAfter = input.dueDate !== undefined ? input.dueDate : task.dueDate;
    if (input.dueTime != null && !dateAfter) throw fieldError('dueTime', 'A time needs a date.');
    if (input.recurrenceRule != null && !dateAfter) {
      throw fieldError('recurrenceRule', 'A repeating task needs a date.');
    }
    // A step inside a task can't repeat on its own; its task can (FR-TASK-005/006).
    if (input.recurrenceRule != null && task.parentId) {
      throw fieldError('recurrenceRule', "A subtask can't repeat. Make its task repeat instead.");
    }

    return this.withCounts(await this.prisma.task.update({ where: { id: task.id }, data }));
  }

  // Soft delete: restorable for 30 days (FR-TASK-002), then purged (Phase 10 job).
  async remove(userId: string, id: string): Promise<void> {
    const task = await this.findActive(userId, id);
    await this.prisma.task.update({ where: { id: task.id }, data: { deletedAt: new Date() } });
  }

  // Undo for a delete. Restoring a task that isn't deleted just returns it.
  async restore(userId: string, id: string): Promise<PublicTask> {
    const task = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new TaskNotFoundError();
    if (!task.deletedAt) return this.withCounts(task);
    if (Date.now() - task.deletedAt.getTime() > TASK_RESTORE_DAYS * DAY_MS) {
      throw new TaskNotFoundError();
    }
    return this.withCounts(
      await this.prisma.task.update({ where: { id: task.id }, data: { deletedAt: null } }),
    );
  }

  // Safe to repeat: completing a done task keeps its original completion time. Subtasks stay
  // as they are unless `includeSubtasks` (FR-TASK-005: the app asks the user first). Completing
  // a repeating task creates the next one in the same transaction (FR-TASK-006, docs/05).
  async complete(userId: string, id: string, includeSubtasks = false): Promise<CompleteTaskResult> {
    const task = await this.findActive(userId, id);
    const now = new Date();
    const { done, next } = await this.prisma.$transaction(async (tx) => {
      if (includeSubtasks) {
        await tx.task.updateMany({
          where: { parentId: task.id, deletedAt: null, status: 'TODO' },
          data: { status: 'DONE', completedAt: now },
        });
      }
      // TODO → DONE as one conditional write: if two requests complete the task at the same
      // moment, the database lets only one of them flip it, and only that one creates the next
      // occurrence (the other sees count 0, so there's never a second copy).
      const flipped = await tx.task.updateMany({
        where: { id: task.id, status: 'TODO', deletedAt: null },
        data: { status: 'DONE', completedAt: now },
      });
      const current = await tx.task.findUniqueOrThrow({ where: { id: task.id } });
      if (flipped.count === 0) return { done: current, next: null };
      // +15 XP for a task (not for its subtasks), paid once per task.
      if (!current.parentId) await this.xp.award(tx, userId, 'TASK', current.id);
      return { done: current, next: await this.createNextOccurrence(tx, current) };
    });
    return {
      task: await this.withCounts(done),
      nextOccurrence: next ? await this.withCounts(next) : null,
    };
  }

  // The next task in a repeating series: same title, notes, priority, category, time and rule,
  // its subtasks as a fresh checklist, due on the next date from today on (nextDueDate). Not
  // created if a later one already exists, so complete → uncomplete → complete makes no copy.
  private async createNextOccurrence(
    tx: Prisma.TransactionClient,
    task: Task,
  ): Promise<Task | null> {
    const rule = task.recurrenceRule ? parseRule(task.recurrenceRule) : null;
    // Subtasks don't repeat (update refuses it); this guards older or hand-made data.
    if (!rule || !task.dueDate || task.parentId) return null;
    const seriesId = task.recurrenceSeriesId ?? task.id;
    const later = await tx.task.findFirst({
      where: {
        userId: task.userId,
        deletedAt: null,
        OR: [{ id: seriesId }, { recurrenceSeriesId: seriesId }],
        dueDate: { gt: task.dueDate },
      },
    });
    if (later) return null;

    const settings = await tx.userSettings.findUnique({ where: { userId: task.userId } });
    const today = localToday(settings?.timezone ?? 'UTC');
    const next = await tx.task.create({
      data: {
        userId: task.userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        categoryId: task.categoryId,
        goalId: task.goalId, // the next one counts towards the same goal
        dueDate: toDbDate(nextDueDate(rule, fromDbDate(task.dueDate), today)),
        dueTime: task.dueTime,
        recurrenceRule: task.recurrenceRule,
        recurrenceSeriesId: seriesId,
      },
    });
    const steps = await tx.task.findMany({
      where: { parentId: task.id, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    if (steps.length > 0) {
      await tx.task.createMany({
        data: steps.map((step, i) => ({
          userId: task.userId,
          parentId: next.id,
          title: step.title,
          sortOrder: i,
        })),
      });
    }
    return next;
  }

  async uncomplete(userId: string, id: string): Promise<{ task: PublicTask }> {
    const task = await this.findActive(userId, id);
    if (task.status === 'TODO') return { task: await this.withCounts(task) };
    // Not done after all: its XP goes too.
    const todo = await this.prisma.$transaction(async (tx) => {
      await this.xp.revoke(tx, userId, 'TASK', task.id);
      return tx.task.update({
        where: { id: task.id },
        data: { status: 'TODO', completedAt: null },
      });
    });
    return { task: await this.withCounts(todo) };
  }

  // Active subtasks per parent, total and done, for the given parents (one query).
  private async subtaskCounts(parentIds: string[]): Promise<Map<string, SubtaskCounts>> {
    const counts = new Map<string, SubtaskCounts>();
    if (parentIds.length === 0) return counts;
    const groups = await this.prisma.task.groupBy({
      by: ['parentId', 'status'],
      where: { parentId: { in: parentIds }, deletedAt: null },
      _count: { _all: true },
    });
    for (const g of groups) {
      if (!g.parentId) continue;
      const c = counts.get(g.parentId) ?? { total: 0, done: 0 };
      c.total += g._count._all;
      if (g.status === 'DONE') c.done += g._count._all;
      counts.set(g.parentId, c);
    }
    return counts;
  }

  private async withCounts(task: Task): Promise<PublicTask> {
    if (task.parentId) return toPublicTask(task);
    return toPublicTask(task, (await this.subtaskCounts([task.id])).get(task.id) ?? NO_SUBTASKS);
  }

  private async findActive(userId: string, id: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({ where: { id, userId, deletedAt: null } });
    if (!task) throw new TaskNotFoundError();
    return task;
  }

  // The foreign key only proves the category exists; it must also be this user's (Part 1 note).
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

  // Like a category: the goal must be this user's, and not deleted.
  private async assertOwnGoal(userId: string, goalId: string): Promise<void> {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!goal) throw fieldError('goalId', 'Choose one of your goals.');
  }
}

function countOf(subtasks: Task[]): SubtaskCounts {
  return { total: subtasks.length, done: subtasks.filter((t) => t.status === 'DONE').length };
}
