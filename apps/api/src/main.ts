import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { type Env, ENV } from './config/env.js';
import { loadRootEnv } from './config/load-env.js';

async function bootstrap() {
  loadRootEnv();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks(); // runs onModuleDestroy (closes DB connections) on SIGTERM
  await app.listen(app.get<Env>(ENV).PORT);
}
await bootstrap();
