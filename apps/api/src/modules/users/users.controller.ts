import { Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type ChangePasswordInput,
  changePasswordSchema,
  type PublicSettings,
  type PublicUser,
  type UpdateProfileInput,
  updateProfileSchema,
  type UpdateSettingsInput,
  updateSettingsSchema,
} from '@life-os/shared';
import { ZodBody } from '../../common/validation/zod-body.decorator.js';
import { StrictRateLimit } from '../../security/rate-limit.js';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { type Me, UsersService } from './users.service.js';

// All routes need an access token (global JwtAuthGuard) and act on the caller only: "me"
// in the path, the ID from the token. There are no /users/:id routes on purpose.
@ApiTags('users')
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser): Promise<Me> {
    return this.users.getMe(user.id);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: AuthUser,
    @ZodBody(updateProfileSchema) body: UpdateProfileInput,
  ): Promise<PublicUser> {
    return this.users.updateProfile(user.id, body);
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @ZodBody(updateSettingsSchema) body: UpdateSettingsInput,
  ): Promise<PublicSettings> {
    return this.users.updateSettings(user.id, body);
  }

  @StrictRateLimit() // guessing the current password
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: AuthUser,
    @ZodBody(changePasswordSchema) body: ChangePasswordInput,
  ): Promise<void> {
    return this.users.changePassword(user.id, user.sessionId, body);
  }
}
