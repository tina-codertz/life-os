import { Module } from '@nestjs/common';
import { MailModule } from '../../mail/mail.module.js';
import { AuthTokenService } from './auth-token.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, PasswordService, SessionService, TokenService],
  // PasswordService, SessionService: UsersModule's change-password. TokenService: the global
  // JwtAuthGuard, registered in AppModule so the guard order is visible in one place.
  exports: [PasswordService, SessionService, TokenService],
})
export class AuthModule {}
