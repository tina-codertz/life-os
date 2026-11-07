import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './utils/create-test-app.js';

describe('Error envelope (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 404 NOT_FOUND in the standard shape for an unknown route', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);

    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.any(String),
        details: [],
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('returns 400 VALIDATION_FAILED for a malformed JSON body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/does-not-exist')
      .set('Content-Type', 'application/json')
      .send('{"title": ')
      .expect(400);

    expect(res.body.error).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });
});
