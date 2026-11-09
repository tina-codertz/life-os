import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller.js';
import { ProgressService } from './progress.service.js';
import { XpService } from './xp.service.js';

// Tasks and habits award XP through XpService, in their own transactions (a direct call rather
// than the domain events ADR-001 sketched: simpler, and points can't drift from completions).
@Module({
  controllers: [ProgressController],
  providers: [ProgressService, XpService],
  exports: [XpService, ProgressService],
})
export class ProgressModule {}
