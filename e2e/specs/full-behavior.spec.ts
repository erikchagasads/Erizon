import { test, expect } from "../core/baseTest";
import { crawlSite } from "../core/crawler";

const NAVIGATION_TIMEOUT_MS = 15_000;

test("Teste total ponta a ponta (sem mocks)", async ({ page }) => {
  test.setTimeout(180_000);

  async function gotoPath(path: string) {
    try {
      await page.goto(path, {
        waitUntil: "commit",
        timeout: NAVIGATION_TIMEOUT_MS * 2,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (!message.includes("ERR_ABORTED") && !message.includes("frame was detached")) {
        throw error;
      }

      await page.waitForLoadState("domcontentloaded", {
        timeout: NAVIGATION_TIMEOUT_MS * 2,
      }).catch(() => null);
    }
  }

  const pages = await crawlSite(page);

  for (const path of pages) {
    await gotoPath(path);
    await expect(page.locator("body")).toBeVisible();

    const errosVisuais = await page.locator("text=Unexpected error").count();
    expect(errosVisuais).toBe(0);

    const botoes = page.locator("button:visible:enabled");
    const count = await botoes.count();

    for (let i = 0; i < count; i++) {
      try {
        await botoes.nth(i).click({ timeout: 1500 });
        await page.waitForTimeout(200);
      } catch {
        // Alguns botões navegam, abrem modais ou desmontam a árvore; seguimos o crawl.
      }
    }
  }
});
