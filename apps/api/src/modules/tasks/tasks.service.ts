import { Injectable } from '@nestjs/common';
import {
  type CreateTaskInput,
  type ListTasksQuery,
  type PublicTask,
  TASK_RESTORE_DAYS,
  type UpdateTaskInput,
} from '@life-os/shared';
import { toDbDate } from '../../common/dates.js';
import { decodeCursor, pageOf } from '../../common/pagination/cursor.js';
import { Page } from '../../common/pagination/page.js';
import type { Prisma, Task } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CategoryNotFoundError } from '../categories/category.errors.js';
import { toPublicTask } from './public-task.js';
import { fieldError, TaskNotFoundError } from './task.errors.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Every query is scoped by the token's userId and skips soft-deleted rows (NFR-SEC-003): there is
// no way to name another user's task, and a deleted task is gone except for restore.
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  // Newest first. UUIDv7 IDs sort by creation time, so "id < cursor" pages without gaps or
  // repeats even while tasks are being added.
  async list(userId: string, query: ListTasksQuery): Promise<Page<PublicTask>> {
    const where: Prisma.TaskWhereInput = { userId, deletedAt: null };
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
    return new Page(items.map(toPublicTask), meta);
  }

  async get(userId: string, id: string): Promise<PublicTask> {
    return toPublicTask(await this.findActive(userId, id));
  }

  async create(userId: string, input: CreateTaskInput): Promise<PublicTask> {
    if (input.categoryId) await this.assertOwnCategory(userId, input.categoryId);
    const task = await this.prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description || null,
        priority: input.priority ?? 'NONE',
        categoryId: input.categoryId ?? null,
        dueDate: input.dueDate ? toDbDate(input.dueDate) : null,
        dueTime: input.dueTime ?? null,
      },
    });
    return toPublicTask(task);
  }

  async update(userId: string, id: string, input: UpdateTaskInput): Promise<PublicTask> {
    const task = await this.findActive(userId, id);
    if (input.categoryId) await this.assertOwnCategory(userId, input.categoryId);

    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description || null;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate ? toDbDate(input.dueDate) : null;
    if (input.dueTime !== undefined) data.dueTime = input.dueTime;

    // A time only means something on a day: removing the date removes the time too, and a time
    // can't be set on a task that has (or will have) no date.
    if (input.dueDate === null) data.dueTime = null;
    const dateAfter = input.dueDate !== undefined ? input.dueDate : task.dueDate;
    if (input.dueTime != null && !dateAfter) throw fieldError('dueTime', 'A time needs a date.');

    return toPublicTask(await this.prisma.task.update({ where: { id: task.id }, data }));
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
    if (!task.deletedAt) return toPublicTask(task);
    if (Date.now() - task.deletedAt.getTime() > TASK_RESTORE_DAYS * DAY_MS) {
      throw new TaskNotFoundError();
    }
    return toPublicTask(
      await this.prisma.task.update({ where: { id: task.id }, data: { deletedAt: null } }),
    );
  }

  // Safe to repeat: completing a done task keeps its original completion time.
  async complete(userId: string, id: string): Promise<{ task: PublicTask }> {
    const task = await this.findActive(userId, id);
    if (task.status === 'DONE') return { task: toPublicTask(task) };
    const done = await this.prisma.task.update({
      where: { id: task.id },
      data: { status: 'DONE', completedAt: new Date() },
    });
    return { task: toPublicTask(done) };
  }

  async uncomplete(userId: string, id: string): Promise<{ task: PublicTask }> {
    const task = await this.findActive(userId, id);
    if (task.status === 'TODO') return { task: toPublicTask(task) };
    const todo = await this.prisma.task.update({
      where: { id: task.id },
      data: { status: 'TODO', completedAt: null },
    });
    return { task: toPublicTask(todo) };
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
}
