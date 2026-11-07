import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ConfigModule } from './config/config.module.js';
import { LoggingModule } from './logging/logging.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [ConfigModule, LoggingModule, PrismaModule, HealthModule],
  // APP_FILTER (not app.useGlobalFilters) so the filter gets DI and e2e tests get it too.
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
