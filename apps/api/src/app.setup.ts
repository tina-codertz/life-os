import { API_PREFIX } from '@life-os/shared';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { type Env, ENV } from './config/env.js';

export const DOCS_PATH = `${API_PREFIX}/docs`;

// Shared by main.ts and the e2e tests, so tests run against the same config as production.
export function configureApp(app: NestExpressApplication): void {
  const env = app.get<Env>(ENV);
  app.setGlobalPrefix(API_PREFIX);

  // Behind Caddy, the client's IP is in X-Forwarded-For. Trust exactly as many proxies as we
  // run (TRUST_PROXY_HOPS), otherwise any client could claim any IP and dodge rate limits.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);

  // Security headers (NFR-SEC-005): no MIME sniffing, no framing, HSTS, a strict CSP, no
  // "X-Powered-By: Express" advertising what we run.
  app.use(helmet());

  // CORS only matters to browsers. The mobile app doesn't need it, so it's off unless
  // CORS_ORIGINS lists web origins explicitly (never "*").
  if (env.CORS_ORIGINS.length > 0) {
    app.enableCors({ origin: env.CORS_ORIGINS, allowedHeaders: ['Authorization', 'Content-Type'] });
  }

  // Interactive API docs (M4: try every auth endpoint here). Not served in production.
  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Life OS API')
      .setDescription('Responses use `{ data }` / `{ error }` envelopes (docs/06).')
      .setVersion('v1')
      .addBearerAuth()
      .addSecurityRequirements('bearer') // every route, except those marked @Public()
      .build();
    SwaggerModule.setup(DOCS_PATH, app, () => SwaggerModule.createDocument(app, config), {
      jsonDocumentUrl: `${DOCS_PATH}-json`,
    });
  }
}
