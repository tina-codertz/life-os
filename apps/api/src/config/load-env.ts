import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Local development keeps one .env at the repo root (shared with docker-compose).
// In production there is no file: variables come from the real environment.
const ROOT_ENV_PATH = fileURLToPath(new URL('../../../../.env', import.meta.url));

export function loadRootEnv(): void {
  if (existsSync(ROOT_ENV_PATH)) {
    process.loadEnvFile(ROOT_ENV_PATH);
  }
}
