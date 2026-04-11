import { test, expect } from '../core/baseTest';
import { crawlSite } from '../core/crawler';
import { mockAPIs } from '../core/mock';

test('Teste total inteligente', async ({ page }) => {

  await mockAPIs(page);

  const pages = await crawlSite(page);

  for (const path of pages) {
    await page.goto(path);

    await expect(page.locator('body')).toBeVisible();

    const errosVisuais = await page.locator('text=error').count();
    expect(errosVisuais).toBe(0);

    const botoes = page.locator('button');
    const count = await botoes.count();

    for (let i = 0; i < count; i++) {
      const botao = botoes.nth(i);

      try {
        if (await botao.isVisible() && await botao.isEnabled()) {
          await botao.click({ timeout: 1500 });
          await page.waitForTimeout(200);
        }
      } catch {}
    }

    const inputs = page.locator('input');
    const inputsCount = await inputs.count();

    for (let i = 0; i < inputsCount; i++) {
      try {
        await inputs.nth(i).fill('teste');
      } catch {}
    }
  }
});
