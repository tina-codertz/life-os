import { Global, Module } from '@nestjs/common';
import { ENV, parseEnv } from './env.js';

// Global for the same reason as PrismaModule: almost every module needs config.
@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => parseEnv(process.env) }],
  exports: [ENV],
})
export class ConfigModule {}
