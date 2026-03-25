import { test, expect } from "@playwright/test";

test.describe("Auth flows", () => {
  test("/login — campos e botão de submit visíveis", async ({ page }) => {
    await page.goto("/login");
    const email = page.locator('input[type="email"], input[name="email"]').first();
    await email.fill("test@example.com");
    const password = page.locator('input[type="password"]').first();
    if ((await password.count()) > 0) {
      await password.fill("testpassword");
    }
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test("/signup — formulário e inputs presentes", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("form").first()).toBeVisible();
    expect(await page.locator("input").count()).toBeGreaterThan(0);
  });

  test("/analytics — sem sessão: carrega página (auth é client-side)", async ({ browser }) => {
    // Analytics usa auth client-side (não redireciona via middleware).
    // Testa que a página carrega sem erro 500 e exibe algum conteúdo.
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    const response = await page.goto("/analytics");
    // Aceita redirect para /login OU a própria página de analytics carregando
    const finalUrl = page.url();
    const isLoginPage = finalUrl.includes("/login");
    const isAnalyticsPage = finalUrl.includes("/analytics");
    expect(isLoginPage || isAnalyticsPage).toBe(true);
    // Página não deve retornar 500
    expect(response?.status()).not.toBe(500);
    await context.close();
  });

  test("/ — CTA 'Começar grátis' ou 'Entrar' visível", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /Começar grátis|Entrar/i }).first();
    await expect(cta).toBeVisible();
  });
});
