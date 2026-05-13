import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  retries: 1,
  reporter: [['list']],
  projects: [
    {
      name: 'setup',
      testMatch: /e2e[\\/]auth\.setup\.test\.ts/,
      use: {
        storageState: undefined,
      },
    },
    {
      name: 'e2e',
      testDir: './e2e/specs',
      dependencies: ['setup'],
      use: {
        storageState: 'storageState.json',
      },
    },
  ],
  webServer: {
    command: 'npm run start -- -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
