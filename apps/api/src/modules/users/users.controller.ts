import { Controller, Get } from '@nestjs/common';
import type { PublicUser } from '@life-os/shared';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UsersService } from './users.service.js';

// Requires an access token (the global JwtAuthGuard); PATCH and settings come in 4.7.
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    return this.users.getMe(user.id);
  }
}
