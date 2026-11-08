import { Module } from '@nestjs/common';
import { MailModule } from '../../mail/mail.module.js';
import { EmailRateLimits } from '../../security/email-rate-limits.js';
import { AuthTokenService } from './auth-token.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailChangeService } from './email-change.service.js';
import { EmailVerifiedGuard } from './email-verified.guard.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    EmailChangeService,
    EmailRateLimits,
    EmailVerifiedGuard,
    PasswordService,
    SessionService,
    TokenService,
  ],
  // EmailChangeService, EmailVerifiedGuard, PasswordService, SessionService: UsersModule's
  // change-email and change-password. TokenService: the global JwtAuthGuard, registered in
  // AppModule so the guard order is visible in one place.
  exports: [EmailChangeService, EmailVerifiedGuard, PasswordService, SessionService, TokenService],
})
export class AuthModule {}
