import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';

// The real AppModule with the same setup as main.ts, so e2e tests exercise production config.
// `controllers` mounts test-only endpoints, e.g. to exercise a pipe before a feature uses it.
export async function createTestApp(
  options: { controllers?: Type[] } = {},
): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}
