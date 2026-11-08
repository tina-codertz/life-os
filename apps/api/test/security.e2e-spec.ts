import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './utils/create-test-app.js';
import { withEnv } from './utils/with-env.js';

describe('Security headers, CORS, body size, API docs (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sends security headers and hides the framework', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'strict-transport-security': expect.stringContaining('max-age='),
      'content-security-policy': expect.stringContaining("default-src 'self'"),
    });
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sends no CORS headers by default (the mobile app is not a browser)', async () => {
    const res = await request(app.getHttpServer())
      .options('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows only the configured origins when CORS_ORIGINS is set', async () => {
    const corsApp = await withEnv({ CORS_ORIGINS: 'https://lifeos.app' }, () => createTestApp());
    try {
      const allowed = await request(corsApp.getHttpServer())
        .options('/api/v1/auth/login')
        .set('Origin', 'https://lifeos.app')
        .set('Access-Control-Request-Method', 'POST');
      expect(allowed.headers['access-control-allow-origin']).toBe('https://lifeos.app');

      const other = await request(corsApp.getHttpServer())
        .options('/api/v1/auth/login')
        .set('Origin', 'https://evil.example')
        .set('Access-Control-Request-Method', 'POST');
      expect(other.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      await corsApp.close();
    }
  });

  it('rejects a body over 100 kB with 413 PAYLOAD_TOO_LARGE', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.co', password: 'x'.repeat(150_000) })
      .expect(413);
    expect(res.body.error).toMatchObject({ code: 'PAYLOAD_TOO_LARGE', details: [] });
  });

  describe('Swagger', () => {
    it('serves the UI', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/docs').expect(200);
      expect(res.text).toContain('swagger-ui');
    });

    it('documents request bodies straight from the shared Zod schemas', async () => {
      const { body: doc } = await request(app.getHttpServer()).get('/api/v1/docs-json').expect(200);
      const login = doc.paths['/api/v1/auth/login'].post;

      expect(login.requestBody.content['application/json'].schema).toMatchObject({
        type: 'object',
        properties: { email: { type: 'string' }, password: { type: 'string', maxLength: 128 } },
        required: ['email', 'password'],
      });
      const settings = doc.paths['/api/v1/users/me/settings'].patch;
      expect(settings.requestBody.content['application/json'].schema).toMatchObject({
        additionalProperties: false, // strict PATCH body
        properties: { theme: { enum: ['SYSTEM', 'DARK', 'LIGHT'] } },
      });
    });

    it('marks public routes as needing no token, and the rest as bearer', async () => {
      const { body: doc } = await request(app.getHttpServer()).get('/api/v1/docs-json').expect(200);
      expect(doc.security).toEqual([{ bearer: [] }]);
      expect(doc.paths['/api/v1/auth/login'].post.security).toEqual([{}]);
      expect(doc.paths['/api/v1/users/me'].get.security).toBeUndefined(); // inherits bearer
    });

    it('is not served in production', async () => {
      const prodApp = await withEnv({ NODE_ENV: 'production' }, () => createTestApp());
      try {
        await request(prodApp.getHttpServer()).get('/api/v1/docs-json').expect(404);
      } finally {
        await prodApp.close();
      }
    });
  });
});
