import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { type Env, ENV } from './config/env.js';
import { loadRootEnv } from './config/load-env.js';

async function bootstrap() {
  loadRootEnv();
  // bufferLogs: hold Nest's startup logs until pino is ready, so every line has the same format.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app);
  app.enableShutdownHooks(); // runs onModuleDestroy (closes DB connections) on SIGTERM
  await app.listen(app.get<Env>(ENV).PORT);
}
await bootstrap();
