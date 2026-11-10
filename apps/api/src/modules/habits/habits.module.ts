import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module.js';
import { HabitsController } from './habits.controller.js';
import { HabitsService } from './habits.service.js';

@Module({
  imports: [ProgressModule],
  controllers: [HabitsController],
  providers: [HabitsService],
  exports: [HabitsService],
})
export class HabitsModule {}
