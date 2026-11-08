import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  imports: [CategoriesModule], // checks a task's category belongs to the same user
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
