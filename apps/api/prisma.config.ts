import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// The CLI runs from apps/api; the shared .env lives at the repo root.
const ROOT_ENV_PATH = '../../.env';
if (existsSync(ROOT_ENV_PATH)) {
  process.loadEnvFile(ROOT_ENV_PATH);
}

const url = process.env['DATABASE_URL'];

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // Omitted when unset, so `prisma generate` still works without a database (e.g. on fresh installs and CI).
  ...(url ? { datasource: { url } } : {}),
});
