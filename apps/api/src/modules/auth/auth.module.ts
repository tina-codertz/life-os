import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MailModule } from '../../mail/mail.module.js';
import { AuthTokenService } from './auth-token.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    PasswordService,
    SessionService,
    TokenService,
    // Global: every route in the app requires a token unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  // For UsersModule's change-password.
  exports: [PasswordService, SessionService],
})
export class AuthModule {}
