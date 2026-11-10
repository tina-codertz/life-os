import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import {
  type CalendarQuery,
  calendarQuerySchema,
  type CalendarRange,
  type CreateEventInput,
  createEventSchema,
  type PublicEvent,
  type UpdateEventInput,
  updateEventSchema,
} from '@life-os/shared';
import { ApiTags } from '@nestjs/swagger';
import { ZodBody } from '../../common/validation/zod-body.decorator.js';
import { IdParam } from '../../common/validation/zod-param.decorator.js';
import { ZodQuery } from '../../common/validation/zod-query.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { HabitsService } from '../habits/habits.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import { EventsService } from './events.service.js';

const eventId = () => IdParam('EVENT_NOT_FOUND', 'Event not found.');

// docs/06 "Calendar".
@ApiTags('calendar')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createEventSchema) body: CreateEventInput,
  ): Promise<PublicEvent> {
    return this.events.create(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @eventId() id: string): Promise<PublicEvent> {
    return this.events.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @eventId() id: string,
    @ZodBody(updateEventSchema) body: UpdateEventInput,
  ): Promise<PublicEvent> {
    return this.events.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @eventId() id: string): Promise<void> {
    return this.events.remove(user.id, id);
  }
}

// The calendar is a read model (docs/02): events are its own; tasks and habits are shown from
// their modules, never copied.
@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly events: EventsService,
    private readonly tasks: TasksService,
    private readonly habits: HabitsService,
  ) {}

  @Get()
  async range(
    @CurrentUser() user: AuthUser,
    @ZodQuery(calendarQuerySchema) { from, to }: CalendarQuery,
  ): Promise<CalendarRange> {
    const [events, tasks, habits] = await Promise.all([
      this.events.between(user.id, from, to),
      this.tasks.dueBetween(user.id, from, to),
      this.habits.calendar(user.id, from, to),
    ]);
    return { from, to, events, tasks, habits };
  }
}
