import { z } from 'zod';

// Every environment variable the API reads, validated once at startup.
// Add new variables here (and to .env.example), never read process.env elsewhere.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Signs access tokens (HS256). Anyone with it can mint a token for any user: keep it out of
  // git and logs, and use a different random value per environment.
  JWT_ACCESS_SECRET: z.string().min(32, { error: 'must be at least 32 characters' }),
  // Outgoing email. Locally Mailpit (docker-compose); in production a provider's SMTP, whose
  // URL contains a password, so treat it as a secret too.
  SMTP_URL: z.url({ protocol: /^smtps?$/ }),
  MAIL_FROM: z.string().min(3).default('Life OS <no-reply@lifeos.local>'),
  // Start of the links in emails: lifeos://verify-email?token=… opens the app (Phase 5).
  EMAIL_LINK_BASE_URL: z.url().default('lifeos://'),
  // 4.8 security settings.
  RATE_LIMIT_ENABLED: z.stringbool().default(true), // "false" only in the general e2e run
  // Browser origins allowed to call the API (comma-separated). The mobile app isn't a browser
  // and needs none; leave unset unless a web client exists.
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : [],
    ),
  // Behind Caddy in production: how many proxies to trust for the client IP (X-Forwarded-For).
  // Unset = trust none, so a client can't fake its IP to dodge rate limits.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

export type Env = z.infer<typeof envSchema>;

// DI token: inject with `@Inject(ENV) env: Env`.
export const ENV = Symbol('ENV');

// Throws one readable error listing every bad variable. Messages name the variable
// and the rule it broke, never its value, so secrets don't end up in logs.
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(
      `Invalid environment configuration:\n${problems.join('\n')}\nSee .env.example at the repo root.`,
    );
  }
  return result.data;
}
