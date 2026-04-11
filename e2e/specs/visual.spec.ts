import { test, expect } from '../core/baseTest';

test('Visual', async ({ page }) => {
  await page.goto('/');
  expect(await page.screenshot()).toMatchSnapshot('home.png');
});
