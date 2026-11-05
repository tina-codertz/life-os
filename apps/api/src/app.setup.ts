import { INestApplication } from '@nestjs/common';
import { API_PREFIX } from '@life-os/shared';

// Shared by main.ts and the e2e tests, so tests run against the same config as production.
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
}
