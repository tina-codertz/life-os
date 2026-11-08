import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  // The task module checks that a task's category belongs to the same user.
  exports: [CategoriesService],
})
export class CategoriesModule {}
