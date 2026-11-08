import { Body, Controller, Post } from '@nestjs/common';
import { type PublicUser, type RegisterInput, registerSchema } from '@life-os/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 201 Created (Nest's default for POST) → { data: { user } }.
  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
  ): Promise<{ user: PublicUser }> {
    return this.auth.register(body);
  }
}
