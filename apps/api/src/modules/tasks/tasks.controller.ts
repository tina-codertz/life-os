import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import {
  type CompleteTaskInput,
  type CompleteTaskResult,
  completeTaskSchema,
  type CreateSubtaskInput,
  createSubtaskSchema,
  type CreateTaskInput,
  createTaskSchema,
  type ListTasksQuery,
  listTasksQuerySchema,
  type PublicTask,
  type TaskDetail,
  type UpdateTaskInput,
  updateTaskSchema,
} from '@life-os/shared';
import { ApiTags } from '@nestjs/swagger';
import type { Page } from '../../common/pagination/page.js';
import { IdParam } from '../../common/validation/zod-param.decorator.js';
import { ZodBody } from '../../common/validation/zod-body.decorator.js';
import { ZodQuery } from '../../common/validation/zod-query.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { TasksService } from './tasks.service.js';

const taskId = () => IdParam('TASK_NOT_FOUND', 'Task not found.');

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  // { data: tasks[], meta: { nextCursor, hasMore } }
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @ZodQuery(listTasksQuerySchema) query: ListTasksQuery,
  ): Promise<Page<PublicTask>> {
    return this.tasks.list(user.id, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createTaskSchema) body: CreateTaskInput,
  ): Promise<PublicTask> {
    return this.tasks.create(user.id, body);
  }

  // The task with its subtasks[].
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @taskId() id: string): Promise<TaskDetail> {
    return this.tasks.get(user.id, id);
  }

  @Post(':id/subtasks')
  addSubtask(
    @CurrentUser() user: AuthUser,
    @taskId() id: string,
    @ZodBody(createSubtaskSchema) body: CreateSubtaskInput,
  ): Promise<PublicTask> {
    return this.tasks.addSubtask(user.id, id, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @taskId() id: string,
    @ZodBody(updateTaskSchema) body: UpdateTaskInput,
  ): Promise<PublicTask> {
    return this.tasks.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @taskId() id: string): Promise<void> {
    return this.tasks.remove(user.id, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(@CurrentUser() user: AuthUser, @taskId() id: string): Promise<PublicTask> {
    return this.tasks.restore(user.id, id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUser() user: AuthUser,
    @taskId() id: string,
    @ZodBody(completeTaskSchema) body: CompleteTaskInput,
  ): Promise<CompleteTaskResult> {
    return this.tasks.complete(user.id, id, body.includeSubtasks ?? false);
  }

  @Post(':id/uncomplete')
  @HttpCode(HttpStatus.OK)
  uncomplete(@CurrentUser() user: AuthUser, @taskId() id: string): Promise<{ task: PublicTask }> {
    return this.tasks.uncomplete(user.id, id);
  }
}
