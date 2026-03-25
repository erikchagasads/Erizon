import { test, expect } from "@playwright/test";

test.describe("Blog — páginas públicas", () => {
  test("blog index carrega e exibe título", async ({ page }) => {
    await page.goto("/blog");
    await expect(page).toHaveTitle(/Blog|Erizon/i);
  });

  test("blog index: logo Erizon visível no nav", async ({ page }) => {
    await page.goto("/blog");
    const logo = page.locator("nav").filter({ hasText: "Erizon" }).first();
    await expect(logo).toBeVisible();
  });

  test("blog index: exibe artigos ou estado vazio", async ({ page }) => {
    await page.goto("/blog");
    const cards = page.locator('a[href^="/blog/"]');
    const empty = page.getByText(/breve|Nenhum artigo/i);

    if ((await cards.count()) > 0) {
      await expect(cards.first()).toBeVisible();
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test("blog index: clique no artigo navega para /blog/slug", async ({ page }) => {
    await page.goto("/blog");
    const cards = page.locator('a[href^="/blog/"]');
    if ((await cards.count()) > 0) {
      const href = await cards.first().getAttribute("href");
      if (href && href !== "/blog") {
        await Promise.all([
          page.waitForURL(/\/blog\/.+/, { timeout: 15000 }),
          cards.first().click(),
        ]);
        await expect(page).toHaveURL(/\/blog\/.+/);
      }
    }
  });

  test("artigo: conteúdo e link voltar visíveis", async ({ page }) => {
    await page.goto("/blog");
    const cards = page.locator('a[href^="/blog/"]');
    if ((await cards.count()) > 0) {
      const href = await cards.first().getAttribute("href");
      if (href && href !== "/blog") {
        await Promise.all([
          page.waitForURL(/\/blog\/.+/, { timeout: 15000 }),
          cards.first().click(),
        ]);
        // Conteúdo do artigo (article ou main)
        const content = page.locator("article, main").first();
        await expect(content).toBeVisible();
        const backLink = page.getByRole("link", { name: /Blog/i }).first();
        await expect(backLink).toBeVisible();
      }
    }
  });
});
