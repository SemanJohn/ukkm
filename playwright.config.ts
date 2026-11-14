import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3100', viewport: { width: 1366, height: 768 } },
  webServer: {
    command: 'node server/index.mjs 3100',
    env: { DATA_DIR: 'memory', SYNC_TOKEN: '', DATABASE_URL: '', ANTHROPIC_API_KEY: '', ANTHROPIC_AUTH_TOKEN: '' },
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
