import { Controller, Get } from '@nestjs/common';
import type { Progress } from '@life-os/shared';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ProgressService } from './progress.service.js';

@ApiTags('progress')
@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  // { xp, streak: { current, best } }: the ⚡ and 🔥 chips.
  @Get()
  get(@CurrentUser() user: AuthUser): Promise<Progress> {
    return this.progress.get(user.id);
  }
}
