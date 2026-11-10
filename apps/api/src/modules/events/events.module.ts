import { Module } from '@nestjs/common';
import { HabitsModule } from '../habits/habits.module.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { CalendarController, EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';

@Module({
  // Tasks and habits: GET /calendar shows them next to the events.
  imports: [TasksModule, HabitsModule],
  controllers: [EventsController, CalendarController],
  providers: [EventsService],
})
export class EventsModule {}
