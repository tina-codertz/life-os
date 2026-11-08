import { execFileSync } from 'node:child_process';
import {
  assertTestDatabaseName,
  assertTestEnvironment,
  databaseNameFromUrl,
} from './utils/test-db.js';

// Runs once before all e2e files: brings the test database up to the latest migration,
// so a new migration never makes the tests fail with "table does not exist".
export default function setup(): void {
  assertTestEnvironment(process.env['NODE_ENV']);
  const url = process.env['DATABASE_URL_TEST'];
  if (!url) {
    throw new Error('DATABASE_URL_TEST is not set. See .env.example at the repo root.');
  }
  assertTestDatabaseName(databaseNameFromUrl(url));

  try {
    execFileSync('bun', ['run', 'prisma:deploy'], {
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
    });
  } catch (err) {
    // execFileSync attaches the child's output to the error; Prisma's message is in stderr.
    const stderr =
      err instanceof Error && 'stderr' in err && Buffer.isBuffer(err.stderr)
        ? err.stderr.toString()
        : '';
    throw new Error(`Applying migrations to the test database failed:\n${stderr}`, {
      cause: err,
    });
  }
}
