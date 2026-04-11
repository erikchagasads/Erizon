import { test as setup } from '@playwright/test';

setup('login e salvar sessão', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[type=email]', 'erikmatheus@outlook.com.br');
  await page.fill('input[type=password]', 'ntn7fxb4');

  await page.click('button');

  await page.waitForURL(/dashboard|admin/);

  await page.context().storageState({ path: 'storageState.json' });
});
