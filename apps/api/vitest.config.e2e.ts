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
    // Silent logs: request lines would drown out the test output.
    env: { DATABASE_URL: process.env['DATABASE_URL_TEST'] ?? '', LOG_LEVEL: 'silent' },
  },
});
