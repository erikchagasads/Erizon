import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { test as setup, expect } from "@playwright/test";

loadEnv({ path: ".env.local" });

const E2E_LOGIN_EMAIL = process.env.E2E_LOGIN_EMAIL ?? "erikmatheus@outlook.com.br";
const E2E_LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? "ntn7fxb4";
const TRUSTED_DEVICE_TOKEN = "playwright-e2e-trusted-device";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function seedTrustedDevice() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  const user = data.users.find((candidate) => candidate.email === E2E_LOGIN_EMAIL);
  if (!user) {
    throw new Error(`Usuário E2E não encontrado: ${E2E_LOGIN_EMAIL}`);
  }

  await supabase
    .from("trusted_devices")
    .delete()
    .eq("user_id", user.id)
    .eq("token", TRUSTED_DEVICE_TOKEN);

  const { error: trustedDeviceError } = await supabase.from("trusted_devices").insert({
    user_id: user.id,
    token: TRUSTED_DEVICE_TOKEN,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (trustedDeviceError) {
    throw trustedDeviceError;
  }
}

setup("login e salvar sessao", async ({ page }) => {
  setup.setTimeout(90_000);

  await seedTrustedDevice();

  await page.goto("/", { waitUntil: "commit" });
  await page.evaluate((token) => {
    window.localStorage.setItem("erizon_td", token);
  }, TRUSTED_DEVICE_TOKEN);

  await page.goto("/login", { waitUntil: "commit" });
  await expect(page.locator('input[type="email"]').first()).toBeVisible();

  await page.fill('input[type="email"]', E2E_LOGIN_EMAIL);
  await page.fill('input[type="password"]', E2E_LOGIN_PASSWORD);

  await Promise.all([
    page.waitForURL(/\/(pulse|dashboard|admin)(\/|$)/, { timeout: 60_000 }),
    page.getByRole("button", { name: /entrar/i }).first().click(),
  ]);

  await page.context().storageState({ path: "storageState.json" });
});
