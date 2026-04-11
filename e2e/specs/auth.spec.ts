import { test, expect } from '../core/baseTest';

test('Login', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[type=email]', 'teste@email.com');
  await page.fill('input[type=password]', '123456');

  await page.click('button');

  await expect(page).toHaveURL(/dashboard|admin/);
});
