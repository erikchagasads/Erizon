import { test, expect } from '../core/baseTest';
import { crawlSite } from '../core/crawler';

test('Sistema completo', async ({ page }) => {
  const pages = await crawlSite(page);

  for (const path of pages) {
    await page.goto(path);

    const botoes = await page.locator('button').all();

    for (const botao of botoes) {
      try {
        if (await botao.isEnabled()) {
          await botao.click({ timeout: 2000 });
        }
      } catch {}
    }

    await expect(page.locator('body')).toBeVisible();
  }
});
