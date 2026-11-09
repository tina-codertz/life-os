import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { ChestReward, Progress } from '@life-os/shared';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ProgressService } from './progress.service.js';

@ApiTags('progress')
@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  // { xp, streak, level, dailyChest }: the ⚡ and 🔥 chips and the Lio page.
  @Get()
  get(@CurrentUser() user: AuthUser): Promise<Progress> {
    return this.progress.get(user.id);
  }

  // Collect the daily chest (+40 XP). 200 every time it's collected, as it's safe to repeat.
  @Post('daily-chest')
  @HttpCode(HttpStatus.OK)
  collectDailyChest(@CurrentUser() user: AuthUser): Promise<ChestReward> {
    return this.progress.collectDailyChest(user.id);
  }
}
