import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Put } from '@nestjs/common';
import {
  type CreateGoalInput,
  createGoalSchema,
  type CreateMilestoneInput,
  createMilestoneSchema,
  type GoalDetail,
  type LinkGoalHabitsInput,
  linkGoalHabitsSchema,
  type LinkGoalTasksInput,
  linkGoalTasksSchema,
  type ListGoalsQuery,
  listGoalsQuerySchema,
  type PublicGoal,
  type UpdateGoalInput,
  updateGoalSchema,
  type UpdateMilestoneInput,
  updateMilestoneSchema,
} from '@life-os/shared';
import { ApiTags } from '@nestjs/swagger';
import { ZodBody } from '../../common/validation/zod-body.decorator.js';
import { IdParam } from '../../common/validation/zod-param.decorator.js';
import { ZodQuery } from '../../common/validation/zod-query.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { GoalsService } from './goals.service.js';

const goalId = () => IdParam('GOAL_NOT_FOUND', 'Goal not found.');
const milestoneId = () => IdParam('MILESTONE_NOT_FOUND', 'Milestone not found.', 'milestoneId');

// docs/06 "Goals". Milestone changes answer with the whole goal, so its progress is current.
@ApiTags('goals')
@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @ZodQuery(listGoalsQuerySchema) query: ListGoalsQuery,
  ): Promise<PublicGoal[]> {
    return this.goals.list(user.id, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createGoalSchema) body: CreateGoalInput,
  ): Promise<PublicGoal> {
    return this.goals.create(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @goalId() id: string): Promise<GoalDetail> {
    return this.goals.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @goalId() id: string,
    @ZodBody(updateGoalSchema) body: UpdateGoalInput,
  ): Promise<PublicGoal> {
    return this.goals.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @goalId() id: string): Promise<void> {
    return this.goals.remove(user.id, id);
  }

  @Post(':id/milestones')
  addMilestone(
    @CurrentUser() user: AuthUser,
    @goalId() id: string,
    @ZodBody(createMilestoneSchema) body: CreateMilestoneInput,
  ): Promise<PublicGoal> {
    return this.goals.addMilestone(user.id, id, body);
  }

  @Patch(':id/milestones/:milestoneId')
  updateMilestone(
    @CurrentUser() user: AuthUser,
    @goalId() id: string,
    @milestoneId() mid: string,
    @ZodBody(updateMilestoneSchema) body: UpdateMilestoneInput,
  ): Promise<PublicGoal> {
    return this.goals.updateMilestone(user.id, id, mid, body);
  }

  @Delete(':id/milestones/:milestoneId')
  removeMilestone(
    @CurrentUser() user: AuthUser,
    @goalId() id: string,
    @milestoneId() mid: string,
  ): Promise<PublicGoal> {
    return this.goals.removeMilestone(user.id, id, mid);
  }

  @Put(':id/tasks')
  linkTasks(
    @CurrentUser() user: AuthUser,
    @goalId() id: string,
    @ZodBody(linkGoalTasksSchema) body: LinkGoalTasksInput,
  ): Promise<GoalDetail> {
    return this.goals.linkTasks(user.id, id, body.taskIds);
  }

  @Put(':id/habits')
  linkHabits(
    @CurrentUser() user: AuthUser,
    @goalId() id: string,
    @ZodBody(linkGoalHabitsSchema) body: LinkGoalHabitsInput,
  ): Promise<GoalDetail> {
    return this.goals.linkHabits(user.id, id, body.habitIds);
  }
}
