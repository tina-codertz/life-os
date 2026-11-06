import { z } from 'zod';

// Every environment variable the API reads, validated once at startup.
// Add new variables here (and to .env.example), never read process.env elsewhere.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

export type Env = z.infer<typeof envSchema>;

// DI token: inject with `@Inject(ENV) env: Env`.
export const ENV = Symbol('ENV');

// Throws one readable error listing every bad variable. Messages name the variable
// and the rule it broke, never its value, so secrets don't end up in logs.
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}\nSee .env.example at the repo root.`);
  }
  return result.data;
}
