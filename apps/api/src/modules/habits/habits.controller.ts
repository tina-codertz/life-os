import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  type CreateHabitInput,
  createHabitSchema,
  type HabitCheckInInput,
  type HabitCheckInResult,
  habitCheckInSchema,
  type HabitDay,
  type HabitDaysQuery,
  habitDaysQuerySchema,
  type ListHabitsQuery,
  listHabitsQuerySchema,
  localDateSchema,
  type PublicHabit,
  type UpdateHabitInput,
  updateHabitSchema,
} from '@life-os/shared';
import { ApiTags } from '@nestjs/swagger';
import { fieldError } from '../../common/errors/field-error.js';
import { IdParam } from '../../common/validation/zod-param.decorator.js';
import { ZodBody } from '../../common/validation/zod-body.decorator.js';
import { ZodQuery } from '../../common/validation/zod-query.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { HabitsService } from './habits.service.js';

const habitId = () => IdParam('HABIT_NOT_FOUND', 'Habit not found.');

@ApiTags('habits')
@Controller('habits')
export class HabitsController {
  constructor(private readonly habits: HabitsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @ZodQuery(listHabitsQuerySchema) query: ListHabitsQuery,
  ): Promise<PublicHabit[]> {
    return this.habits.list(user.id, query.archived);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createHabitSchema) body: CreateHabitInput,
  ): Promise<PublicHabit> {
    return this.habits.create(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @habitId() id: string): Promise<PublicHabit> {
    return this.habits.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @habitId() id: string,
    @ZodBody(updateHabitSchema) body: UpdateHabitInput,
  ): Promise<PublicHabit> {
    return this.habits.update(user.id, id, body);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@CurrentUser() user: AuthUser, @habitId() id: string): Promise<PublicHabit> {
    return this.habits.setArchived(user.id, id, true);
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  unarchive(@CurrentUser() user: AuthUser, @habitId() id: string): Promise<PublicHabit> {
    return this.habits.setArchived(user.id, id, false);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @habitId() id: string): Promise<void> {
    return this.habits.remove(user.id, id);
  }

  @Get(':id/days')
  days(
    @CurrentUser() user: AuthUser,
    @habitId() id: string,
    @ZodQuery(habitDaysQuerySchema) query: HabitDaysQuery,
  ): Promise<HabitDay[]> {
    return this.habits.days(user.id, id, query);
  }

  @Post(':id/completions')
  checkIn(
    @CurrentUser() user: AuthUser,
    @habitId() id: string,
    @ZodBody(habitCheckInSchema) body: HabitCheckInInput,
  ): Promise<HabitCheckInResult> {
    return this.habits.checkIn(user.id, id, body);
  }

  // Undo answers 200 with the new streak (FR-HAB-003).
  @Delete(':id/completions/:localDate')
  undoCheckIn(
    @CurrentUser() user: AuthUser,
    @habitId() id: string,
    @Param('localDate') localDate: string,
  ): Promise<HabitCheckInResult> {
    if (!localDateSchema.safeParse(localDate).success) {
      throw fieldError('localDate', 'Use a date like 2026-12-01.');
    }
    return this.habits.undoCheckIn(user.id, id, localDate);
  }
}
