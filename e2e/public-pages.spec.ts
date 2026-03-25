import { test, expect } from "@playwright/test";

test.describe("Páginas públicas — carregam sem erros", () => {
  test("/ — landing page tem texto Erizon", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Erizon").first()).toBeVisible();
  });

  test("/login — formulário com campo email visível", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
    await expect(
      page.locator('input[type="email"], input[name="email"]').first()
    ).toBeVisible();
  });

  test("/signup — formulário de cadastro presente", async ({ page }) => {
    const response = await page.goto("/signup");
    expect(response?.status()).toBe(200);
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("/blog — carrega", async ({ page }) => {
    const response = await page.goto("/blog");
    expect(response?.status()).toBe(200);
  });

  test("/privacidade — carrega", async ({ page }) => {
    const response = await page.goto("/privacidade");
    expect(response?.status()).toBe(200);
  });

  test("/termos — carrega", async ({ page }) => {
    const response = await page.goto("/termos");
    expect(response?.status()).toBe(200);
  });
});
