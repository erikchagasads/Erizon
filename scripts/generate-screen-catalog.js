const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "src", "app");
const OUTPUT_DIR = path.join(ROOT, "artifacts", "erizon-telas");
const IMAGE_DIR = path.join(OUTPUT_DIR, "images");
const HTML_FILE = path.join(OUTPUT_DIR, "index.html");
const BASE_URL = process.env.ERIZON_SCREENSHOT_BASE_URL || "http://localhost:3000";

const PUBLIC_ROUTES = new Set([
  "/",
  "/blog",
  "/billing",
  "/funil-publico",
  "/login",
  "/onboarding",
  "/privacidade",
  "/signup",
  "/sobre",
  "/sucesso",
  "/termos",
]);

const ROUTE_OVERRIDES = {
  "docs/api/benchmarks": "/docs/api/benchmarks",
  "lp/pamela": "/lp/formulario",
};

const LOGIN_EMAIL = process.env.ERIZON_SCREENSHOT_EMAIL || "erikmatheus@outlook.com.br";
const LOGIN_PASSWORD = process.env.ERIZON_SCREENSHOT_PASSWORD || "ntn7fxb4";

function walkPages(dir, pages = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "api" || entry.name === "hooks" || entry.name === "lib" || entry.name.startsWith("_")) {
        continue;
      }
      walkPages(fullPath, pages);
      continue;
    }
    if (entry.isFile() && entry.name === "page.tsx") {
      pages.push(fullPath);
    }
  }
  return pages;
}

function routeFromPage(filePath) {
  const relativeDir = path.relative(APP_DIR, path.dirname(filePath)).replace(/\\/g, "/");
  if (!relativeDir) return "/";
  if (ROUTE_OVERRIDES[relativeDir]) return ROUTE_OVERRIDES[relativeDir];
  return `/${relativeDir}`;
}

function slugifyRoute(route) {
  if (route === "/") return "home";
  return route.replace(/^\//, "").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "") || "route";
}

function ensureDirs() {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

async function waitForApp(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);
}

async function dismissChrome(page) {
  const candidates = [
    page.getByRole("button", { name: /aceitar|ok|entendi|fechar|continuar/i }).first(),
    page.getByText(/aceitar/i).first(),
  ];

  for (const locator of candidates) {
    try {
      if (await locator.isVisible({ timeout: 500 })) {
        await locator.click({ timeout: 500 });
        await page.waitForTimeout(300);
        return;
      }
    } catch {
      // Ignore non-blocking UI.
    }
  }
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await waitForApp(page);

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  if (!(await emailInput.isVisible({ timeout: 3000 }))) {
    return { ok: false, message: "Campo de email não encontrado." };
  }

  await emailInput.fill(LOGIN_EMAIL);
  await passwordInput.fill(LOGIN_PASSWORD);

  const submitButton = page.locator("button").filter({ hasText: /entrar|login|continuar|acessar/i }).first();
  if (await submitButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await submitButton.click();
  } else {
    await passwordInput.press("Enter");
  }

  await page.waitForTimeout(2500);

  const currentUrl = page.url();
  if (/\/login(?:\?|$)/.test(currentUrl)) {
    return { ok: false, message: "Login não saiu da tela /login." };
  }

  return { ok: true, message: `Sessão iniciada em ${currentUrl}` };
}

function buildHtml(results, skipped, loginResult) {
  const cards = results.map((result) => {
    const imageMarkup = result.image
      ? `<a href="./images/${result.image}" target="_blank" rel="noreferrer"><img src="./images/${result.image}" alt="${escapeHtml(result.route)}" loading="lazy" /></a>`
      : `<div class="empty">Sem screenshot</div>`;

    return `
      <article class="card">
        <div class="meta">
          <div>
            <h2>${escapeHtml(result.route)}</h2>
            <p>${escapeHtml(result.status)}</p>
          </div>
          <span class="pill ${result.ok ? "ok" : "warn"}">${result.ok ? "capturada" : "atenção"}</span>
        </div>
        ${imageMarkup}
        <dl>
          <div><dt>URL final</dt><dd>${escapeHtml(result.finalUrl)}</dd></div>
          <div><dt>Título</dt><dd>${escapeHtml(result.title || "Sem título")}</dd></div>
          <div><dt>Observação</dt><dd>${escapeHtml(result.note || "-")}</dd></div>
        </dl>
      </article>
    `;
  }).join("\n");

  const skippedMarkup = skipped.length
    ? skipped.map((item) => `<li><code>${escapeHtml(item.route)}</code> <span>${escapeHtml(item.reason)}</span></li>`).join("\n")
    : "<li>Nenhuma rota dinâmica foi pulada.</li>";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Erizon - Catálogo de Telas</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0a0c10;
      --panel: #11161d;
      --panel-2: #171d26;
      --text: #edf2f7;
      --muted: #95a3b8;
      --line: #243041;
      --accent: #60a5fa;
      --ok: #22c55e;
      --warn: #f59e0b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      background:
        radial-gradient(circle at top, rgba(96,165,250,0.16), transparent 28%),
        linear-gradient(180deg, #0a0c10 0%, #10151d 100%);
      color: var(--text);
    }
    main { max-width: 1440px; margin: 0 auto; padding: 32px 24px 64px; }
    header {
      display: grid;
      gap: 12px;
      margin-bottom: 28px;
      padding: 24px;
      border: 1px solid var(--line);
      border-radius: 20px;
      background: rgba(17, 22, 29, 0.86);
      backdrop-filter: blur(12px);
    }
    h1, h2, p { margin: 0; }
    h1 { font-size: 34px; }
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      color: var(--muted);
      font-size: 14px;
    }
    .summary code {
      color: var(--text);
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 6px 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 18px;
    }
    .card {
      background: rgba(17, 22, 29, 0.92);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px;
      display: grid;
      gap: 14px;
      box-shadow: 0 18px 40px rgba(0,0,0,0.24);
    }
    .meta {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
    }
    .meta p {
      margin-top: 6px;
      color: var(--muted);
      font-size: 14px;
    }
    .pill {
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border: 1px solid currentColor;
    }
    .pill.ok { color: var(--ok); }
    .pill.warn { color: var(--warn); }
    img {
      width: 100%;
      display: block;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: #0b1016;
    }
    .empty {
      min-height: 220px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      border: 1px dashed var(--line);
      color: var(--muted);
      background: rgba(9, 12, 17, 0.6);
    }
    dl {
      display: grid;
      gap: 10px;
      margin: 0;
    }
    dl div {
      display: grid;
      gap: 4px;
      padding-top: 10px;
      border-top: 1px solid rgba(36,48,65,0.75);
    }
    dt {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    dd {
      margin: 0;
      word-break: break-word;
      line-height: 1.45;
    }
    section.skipped {
      margin-top: 24px;
      padding: 18px;
      border-radius: 18px;
      background: rgba(17, 22, 29, 0.92);
      border: 1px solid var(--line);
    }
    section.skipped ul {
      margin: 12px 0 0;
      padding-left: 18px;
      color: var(--muted);
    }
    section.skipped li { margin: 8px 0; }
    code { color: #bfdbfe; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Catálogo de telas da Erizon</h1>
      <p>Arquivo gerado automaticamente com screenshots locais da aplicação.</p>
      <div class="summary">
        <span><code>Base URL</code> ${escapeHtml(BASE_URL)}</span>
        <span><code>Telas capturadas</code> ${results.length}</span>
        <span><code>Login</code> ${escapeHtml(loginResult.message)}</span>
      </div>
    </header>
    <section class="grid">
      ${cards}
    </section>
    <section class="skipped">
      <h2>Rotas dinâmicas ou puladas</h2>
      <ul>${skippedMarkup}</ul>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function captureRoute(page, route) {
  const url = `${BASE_URL}${route}`;
  const screenshotName = `${slugifyRoute(route)}.png`;
  const screenshotPath = path.join(IMAGE_DIR, screenshotName);
  let status = "Carregada";
  let ok = true;
  let note = "";

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForApp(page);
    await dismissChrome(page);

    const finalUrl = page.url();
    if (response && response.status() >= 400) {
      status = `HTTP ${response.status()}`;
      ok = false;
    }
    if (finalUrl.includes("/login") && route !== "/login") {
      status = "Redirecionada para /login";
      note = "A rota pediu autenticação ou sessão válida.";
      ok = false;
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });

    return {
      route,
      image: screenshotName,
      title: await page.title(),
      finalUrl,
      status,
      note,
      ok,
    };
  } catch (error) {
    return {
      route,
      image: "",
      title: "",
      finalUrl: url,
      status: "Falha ao capturar",
      note: error instanceof Error ? error.message : "Erro desconhecido",
      ok: false,
    };
  }
}

async function main() {
  ensureDirs();

  const pageFiles = walkPages(APP_DIR);
  const routes = [];
  const skipped = [];

  for (const filePath of pageFiles) {
    const route = routeFromPage(filePath);
    if (route.includes("[")) {
      skipped.push({ route, reason: "Rota dinâmica sem parâmetro padrão para captura automática." });
      continue;
    }
    routes.push(route);
  }

  routes.sort((a, b) => a.localeCompare(b, "pt-BR"));

  const browser = await chromium.launch({ headless: true });
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const authContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const publicPage = await publicContext.newPage();
  const authPage = await authContext.newPage();
  const loginResult = await login(authPage);

  const results = [];
  for (const route of routes) {
    const page = PUBLIC_ROUTES.has(route) ? publicPage : authPage;
    results.push(await captureRoute(page, route));
  }

  await browser.close();

  fs.writeFileSync(HTML_FILE, buildHtml(results, skipped, loginResult), "utf8");

  console.log(`Catálogo gerado em ${HTML_FILE}`);
  console.log(`Telas capturadas: ${results.length}`);
  console.log(`Rotas puladas: ${skipped.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
