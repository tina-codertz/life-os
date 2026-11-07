import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './utils/create-test-app.js';

describe('GET /api/v1/health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 200 when the database is reachable', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', db: 'ok' });
  });

  it('is not served without the version prefix', () => {
    return request(app.getHttpServer()).get('/health').expect(404);
  });

  it('sends back an X-Request-Id on every response', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reuses a safe X-Request-Id sent by the client', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .set('X-Request-Id', 'mobile-abc-123')
      .expect('X-Request-Id', 'mobile-abc-123');
  });

  it('replaces an unsafe X-Request-Id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('X-Request-Id', '<script>alert(1)</script>');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
