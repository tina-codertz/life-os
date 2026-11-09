import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module.js';
import { GoalsController } from './goals.controller.js';
import { GoalsService } from './goals.service.js';

@Module({
  // Categories: a goal's category must be the same user's.
  imports: [CategoriesModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
