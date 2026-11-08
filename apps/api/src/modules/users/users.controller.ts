import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
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
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { type Me, UsersService } from './users.service.js';

// All routes need an access token (global JwtAuthGuard) and act on the caller only: "me"
// in the path, the ID from the token. There are no /users/:id routes on purpose.
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
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ): Promise<PublicUser> {
    return this.users.updateProfile(user.id, body);
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateSettingsSchema)) body: UpdateSettingsInput,
  ): Promise<PublicSettings> {
    return this.users.updateSettings(user.id, body);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ): Promise<void> {
    return this.users.changePassword(user.id, user.sessionId, body);
  }
}
