import { Controller, type INestApplication, Post, Query } from '@nestjs/common';
import { type PaginationQuery, paginationQuerySchema } from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { z } from 'zod';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe.js';
import { ZodBody } from '../src/common/validation/zod-body.decorator.js';
import { Public } from '../src/modules/auth/public.decorator.js';
import { createTestApp } from './utils/create-test-app.js';

const echoSchema = z.object({ title: z.string().min(1).max(10), done: z.boolean() });

// Test-only endpoint: echoes what the controller received after validation.
@Public()
@Controller('test-validation')
class ValidationTestController {
  @Post()
  echo(
    @ZodBody(echoSchema) body: z.infer<typeof echoSchema>,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return { body, query };
  }
}

describe('Validation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [ValidationTestController] });
  });

  afterAll(async () => {
    await app.close();
  });

  it('passes the parsed body and query to the controller', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/test-validation?limit=5')
      .send({ title: 'Buy milk', done: false, userId: 'someone-else' })
      .expect(201);

    // Unknown keys (userId) are dropped; the query string "5" became the number 5.
    expect(res.body).toEqual({
      data: { body: { title: 'Buy milk', done: false }, query: { limit: 5 } },
    });
  });

  it('returns 400 VALIDATION_FAILED with a detail per invalid field', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/test-validation')
      .send({ title: '', done: 'yes' })
      .expect(400);

    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Some fields are invalid.',
        details: [
          { field: 'title', message: expect.any(String) },
          { field: 'done', message: expect.any(String) },
        ],
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('validates the query string too', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/test-validation?limit=500')
      .send({ title: 'ok', done: true })
      .expect(400);

    expect(res.body.error.details).toEqual([{ field: 'limit', message: expect.any(String) }]);
  });

  it('rejects a request with no body', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/test-validation').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toHaveLength(1);
  });
});
