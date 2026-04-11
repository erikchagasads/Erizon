import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'storageState.json',
    headless: true,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  retries: 1,
  reporter: [['html', { open: 'never' }]],
});
