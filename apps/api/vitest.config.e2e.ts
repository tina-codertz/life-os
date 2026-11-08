import { defineConfig } from 'vitest/config';
import { loadRootEnv } from './src/config/load-env.js';

// e2e tests hit a real database: always the separate test DB, never lifeos_dev.
loadRootEnv();

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // All files share one test database, and resetDatabase() empties every table. Running files
    // in parallel would let one file wipe another's data mid-test, so they run one at a time.
    fileParallelism: false,
    // Silent logs: request lines would drown out the test output.
    env: { DATABASE_URL: process.env['DATABASE_URL_TEST'] ?? '', LOG_LEVEL: 'silent' },
  },
});
