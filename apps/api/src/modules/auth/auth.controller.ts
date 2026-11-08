import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AuthResult,
  type ConfirmEmailChangeInput,
  confirmEmailChangeSchema,
  type ForgotPasswordInput,
  forgotPasswordSchema,
  type LoginInput,
  loginSchema,
  type RefreshTokenInput,
  refreshTokenSchema,
  type RegisterInput,
  registerSchema,
  type ResetPasswordInput,
  resetPasswordSchema,
  type TokenPair,
  type VerifyEmailInput,
  verifyEmailSchema,
} from '@life-os/shared';
import { ZodBody } from '../../common/validation/zod-body.decorator.js';
import { StrictRateLimit } from '../../security/rate-limit.js';
import type { AuthUser } from './auth-user.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { EmailChangeService } from './email-change.service.js';
import { Public } from './public.decorator.js';

// @Public() per method, not on the class: logout-all needs the guard.
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly emailChange: EmailChangeService,
  ) {}

  // 201 Created (Nest's default for POST) → { data: { user, accessToken, refreshToken } }.
  @Public()
  @StrictRateLimit()
  @Post('register')
  register(@ZodBody(registerSchema) body: RegisterInput): Promise<AuthResult> {
    return this.auth.register(body);
  }

  // 200, not 201: logging in doesn't create a resource the client can fetch.
  @Public()
  @StrictRateLimit()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@ZodBody(loginSchema) body: LoginInput): Promise<AuthResult> {
    return this.auth.login(body);
  }

  // Public: it's called exactly when the access token has expired.
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@ZodBody(refreshTokenSchema) body: RefreshTokenInput): Promise<TokenPair> {
    return this.auth.refresh(body.refreshToken);
  }

  // Public too: logging out must work even with an expired access token.
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@ZodBody(refreshTokenSchema) body: RefreshTokenInput): Promise<void> {
    return this.auth.logout(body.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  logoutAll(@CurrentUser() user: AuthUser): Promise<void> {
    return this.auth.logoutAll(user.id);
  }

  // The four below answer 204: there's nothing to return, and for forgot-password the
  // answer must not reveal whether the email has an account.
  @Public()
  @StrictRateLimit()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  verifyEmail(@ZodBody(verifyEmailSchema) body: VerifyEmailInput): Promise<void> {
    return this.auth.verifyEmail(body.token);
  }

  @StrictRateLimit()
  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  resendVerification(@CurrentUser() user: AuthUser): Promise<void> {
    return this.auth.resendVerification(user.id);
  }

  @Public()
  @StrictRateLimit()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@ZodBody(forgotPasswordSchema) body: ForgotPasswordInput): Promise<void> {
    return this.auth.forgotPassword(body.email);
  }

  @Public()
  @StrictRateLimit()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@ZodBody(resetPasswordSchema) body: ResetPasswordInput): Promise<void> {
    return this.auth.resetPassword(body);
  }

  // Step 2 of change email (step 1 is POST /users/me/change-email). Public: it's a link,
  // possibly opened where the app isn't logged in.
  @Public()
  @StrictRateLimit()
  @Post('confirm-email-change')
  @HttpCode(HttpStatus.NO_CONTENT)
  confirmEmailChange(
    @ZodBody(confirmEmailChangeSchema) body: ConfirmEmailChangeInput,
  ): Promise<void> {
    return this.emailChange.confirm(body.token);
  }
}
