import { test as base, expect } from '@playwright/test';

export { expect };

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    page.on('pageerror', err => {
      errors.push(err.message);
    });

    page.on('response', res => {
      if (res.status() >= 400) {
        errors.push(`API error: ${res.url()} - ${res.status()}`);
      }
    });

    await use(page);

    if (errors.length) {
      throw new Error(errors.join('\n'));
    }
  },
});
