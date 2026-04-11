import { test, expect } from '../core/baseTest';

test('performance básica', async ({ page }) => {
  const start = Date.now();

  await page.goto('/');

  const loadTime = Date.now() - start;

  expect(loadTime).toBeLessThan(3000);
});
