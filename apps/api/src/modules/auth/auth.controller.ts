import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  type AuthResult,
  type LoginInput,
  loginSchema,
  type RegisterInput,
  registerSchema,
} from '@life-os/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 201 Created (Nest's default for POST) → { data: { user, accessToken } }.
  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput): Promise<AuthResult> {
    return this.auth.register(body);
  }

  // 200, not 201: logging in doesn't create a resource the client can fetch.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput): Promise<AuthResult> {
    return this.auth.login(body);
  }
}
