import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.js';
import { ConfigModule } from './config/config.module.js';
import { type Env, ENV } from './config/env.js';
import { LoggingModule } from './logging/logging.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard.js';
import { HealthModule } from './modules/health/health.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { rateLimitOptions } from './security/rate-limit.js';

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    PrismaModule,
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => rateLimitOptions(env),
    }),
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  // APP_* providers (not app.useGlobal*) so they get DI and e2e tests get them too.
  // Success → ResponseEnvelopeInterceptor `{ data }`; failure → AllExceptionsFilter `{ error }`.
  providers: [
    // Global guards run in this order. Auth first, so the rate limiter can count a logged-in
    // user per user (req.user) instead of per IP.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
