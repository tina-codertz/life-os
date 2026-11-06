import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { loadRootEnv } from './config/load-env.js';

async function bootstrap() {
  loadRootEnv();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks(); // runs onModuleDestroy (closes DB connections) on SIGTERM
  await app.listen(process.env['PORT'] ?? 3000);
}
await bootstrap();
