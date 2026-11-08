import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  // Categories: a task's category must be the same user's. Progress: completing earns XP.
  imports: [CategoriesModule, ProgressModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
