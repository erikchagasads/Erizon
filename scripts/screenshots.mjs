import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "src", "app");
const CONTENT_BLOG_DIR = path.join(ROOT, "src", "content", "blog");
const OUTPUT_DIR = path.join(ROOT, "screenshots");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const ROUTE_MAP_PATH = path.join(OUTPUT_DIR, "routes.json");
const SERVER_LOG_PATH = path.join(OUTPUT_DIR, "next-server.log");
const BASE_URL = process.env.ERIZON_SCREENSHOT_BASE_URL || "http://127.0.0.1:3000";
const LOGIN_EMAIL = process.env.ERIZON_SCREENSHOT_EMAIL || "erikmatheus@outlook.com.br";
const LOGIN_PASSWORD = process.env.ERIZON_SCREENSHOT_PASSWORD || "ntn7fxb4";
const START_TIMEOUT_MS = 120000;
const ENV_FILES = [path.join(ROOT, ".env.local"), path.join(ROOT, ".env")];

const PUBLIC_ROUTES = new Set([
  "/",
  "/billing",
  "/blog",
  "/funil-publico",
  "/login",
  "/lp/diagnostico",
  "/lp/formulario",
  "/lp/gestores",
  "/lp/pamela",
  "/onboarding",
  "/privacidade",
  "/signup",
  "/sobre",
  "/sucesso",
  "/termos",
]);

const FILE_NAME_OVERRIDES = {
  "/blog/[slug]": "blog-artigo",
  "/campanhas/[id]": "campanhas-detalhe",
  "/clientes/[id]": "clientes-detalhe",
  "/crm/cliente/[token]": "crm-cliente-portal",
  "/crm/cliente/login/[token]": "crm-cliente-login",
  "/lp/[codigo]": "lp-codigo",
  "/lp/formulario/[userId]/[clienteId]": "lp-formulario-parametrizado",
  "/share/portal/[clienteId]": "share-portal",
};

const FAKE_DATA = {
  agencies: [
    "Rocket Media",
    "Tráfego Norte",
    "Agência Pixel",
    "UpScale Digital",
    "Click Certo",
    "Performance BR",
    "Mídias Pro",
    "Conversão Digital",
  ],
  names: [
    "Carlos Mendonça",
    "Fernanda Lopes",
    "Rafael Souza",
    "Juliana Martins",
    "Bruno Alves",
    "Patrícia Costa",
    "Diego Ferreira",
    "Camila Rocha",
  ],
  emails: [
    "contato@rocketmedia.com.br",
    "ads@trafegonorte.com.br",
    "clientes@pixelagencia.com.br",
  ],
  phones: [
    "(11) 94523-8812",
    "(21) 98741-3305",
    "(31) 97632-1490",
    "(47) 93854-7721",
  ],
  campaigns: [
    "Conversão - Produto Principal - Público Frio",
    "Remarketing 7D - Visitantes",
    "TOF - Vídeo - Lookalike 2%",
    "BOF - Carrinho Abandonado",
    "Teste Criativo - UGC vs Static",
    "Escala - Público Quente - Verba Alta",
  ],
  metrics: {
    roas: ["2,8x", "3,1x", "3,8x", "4,6x", "5,2x", "6,4x"],
    cpm: ["R$ 18,00", "R$ 21,40", "R$ 26,80", "R$ 31,20", "R$ 36,50", "R$ 42,00"],
    ctr: ["1,2%", "1,6%", "2,1%", "2,7%", "3,2%", "3,8%"],
    cpc: ["R$ 0,85", "R$ 1,05", "R$ 1,32", "R$ 1,68", "R$ 1,94", "R$ 2,40"],
    investment: ["R$ 4.200", "R$ 7.900", "R$ 12.800", "R$ 18.400", "R$ 24.600", "R$ 38.500"],
    conversions: ["42", "78", "126", "214", "436", "890"],
    genericMoney: ["R$ 9.999", "R$ 12.480", "R$ 18.720", "R$ 26.300", "R$ 33.900"],
  },
  cpfs: ["183.456.920-10", "274.681.530-42", "319.802.740-15", "402.771.650-08"],
  ids: ["DEMO-001", "DEMO-002", "DEMO-003", "DEMO-004"],
};

function ensureOutputDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function readEnvValue(name) {
  if (process.env[name]) {
    return process.env[name];
  }

  for (const envFile of ENV_FILES) {
    if (!fs.existsSync(envFile)) continue;
    const content = fs.readFileSync(envFile, "utf8");
    const match = content.match(new RegExp(`^${name}=(.*)$`, "m"));
    if (!match) continue;
    return match[1].trim().replace(/^['"]|['"]$/g, "");
  }

  return "";
}

function walkRoutes(dir, routes = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "api" || entry.name === "hooks" || entry.name === "lib" || entry.name.startsWith("_")) {
        continue;
      }
      walkRoutes(fullPath, routes);
      continue;
    }
    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push(fullPath);
    }
  }
  return routes;
}

function getBlogSlug() {
  if (!fs.existsSync(CONTENT_BLOG_DIR)) {
    return "__auto__";
  }
  return "__auto__";
}

function resolveDynamicRoute(routePattern) {
  const blogSlug = getBlogSlug();
  const defaults = {
    "/blog/[slug]": `/blog/${blogSlug}`,
    "/campanhas/[id]": "/campanhas/demo-campanha",
    "/clientes/[id]": "/clientes/demo-cliente",
    "/crm/cliente/[token]": "/crm/cliente/crm-demo-001",
    "/crm/cliente/login/[token]": "/crm/cliente/login/crm-demo-001",
    "/lp/[codigo]": "/lp/ERZ-DEMO-2026",
    "/lp/formulario/[userId]/[clienteId]": "/lp/formulario/11111111-2222-3333-4444-555555555555/demo-cliente",
    "/share/portal/[clienteId]": "/share/portal/demo-cliente?crm=crm-demo-001",
  };
  return defaults[routePattern] || null;
}

function routePatternFromFile(filePath) {
  const relative = path.relative(APP_DIR, path.dirname(filePath)).replace(/\\/g, "/");
  if (!relative) return "/";
  return `/${relative}`;
}

function fileNameFromRoute(routePattern, resolvedRoute) {
  const override = FILE_NAME_OVERRIDES[routePattern];
  if (override) return `${override}.png`;
  const source = routePattern === "/" ? "home" : routePattern;
  const normalized = source
    .replace(/^\//, "")
    .replace(/\?.*$/, "")
    .replace(/\[(.+?)\]/g, "$1")
    .replace(/[^\w/-]+/g, "")
    .replace(/\//g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (normalized) return `${normalized}.png`;
  return `${resolvedRoute === "/" ? "home" : "rota"}.png`;
}

function buildRouteEntries() {
  const pageFiles = walkRoutes(APP_DIR);
  const entries = [];

  for (const filePath of pageFiles) {
    const routePattern = routePatternFromFile(filePath);
    const resolvedRoute = routePattern.includes("[") ? resolveDynamicRoute(routePattern) : routePattern;

    if (!resolvedRoute) {
      entries.push({
        filePath,
        routePattern,
        route: null,
        kind: "skipped",
        reason: "Rota dinâmica sem padrão seguro para demo automática.",
      });
      continue;
    }

    entries.push({
      filePath,
      routePattern,
      route: resolvedRoute,
      access: PUBLIC_ROUTES.has(routePattern) || PUBLIC_ROUTES.has(resolvedRoute) ? "public" : "private",
      fileName: fileNameFromRoute(routePattern, resolvedRoute),
      kind: "capture",
    });
  }

  entries.sort((a, b) => {
    const routeA = a.route || a.routePattern;
    const routeB = b.route || b.routePattern;
    return routeA.localeCompare(routeB, "pt-BR");
  });
  return entries;
}

async function fetchOk(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.ok || [301, 302, 307, 308].includes(response.status);
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fetchOk(url)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return false;
}

function spawnLocalServer() {
  const hasBuild = fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"));
  const script = hasBuild ? "start" : "dev";
  const out = fs.createWriteStream(SERVER_LOG_PATH, { flags: "w" });
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", `npm run ${script}`] : ["run", script];
  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, PORT: "3000", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => out.write(chunk));
  child.stderr.on("data", (chunk) => out.write(chunk));
  child.on("exit", () => out.end());
  return child;
}

async function ensureServerRunning() {
  if (await fetchOk(`${BASE_URL}/login`)) {
    return { child: null, started: false };
  }

  const child = spawnLocalServer();
  const ready = await waitForServer(`${BASE_URL}/login`, START_TIMEOUT_MS);
  if (!ready) {
    child.kill();
    throw new Error(`Servidor local não respondeu em ${BASE_URL} dentro de ${START_TIMEOUT_MS / 1000}s.`);
  }

  return { child, started: true };
}

function toBase64Url(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createSupabaseSession() {
  const supabaseUrl = readEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = readEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY não foram encontrados no ambiente local.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    const message = payload?.msg || payload?.error_description || payload?.error || `HTTP ${response.status}`;
    throw new Error(`Não foi possível criar uma sessão Supabase para screenshots: ${message}`);
  }

  const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  return {
    session: payload,
    storageKey,
  };
}

async function hydrateAuthContext(context, sessionInfo) {
  const serialized = JSON.stringify(sessionInfo.session);

  // Usa addInitScript para injetar localStorage antes de qualquer página carregar
  await context.addInitScript(({ storageKey, value }) => {
    window.localStorage.setItem(storageKey, value);
  }, {
    storageKey: sessionInfo.storageKey,
    value: serialized,
  });
}

async function waitForAppReady(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);

  const loadingSelectors = [
    ".animate-spin",
    "[aria-busy='true']",
    "[data-loading='true']",
    "[role='progressbar']",
  ];

  for (const selector of loadingSelectors) {
    const locator = page.locator(selector);
    if (await locator.count()) {
      await locator.first().waitFor({ state: "hidden", timeout: 6000 }).catch(() => {});
    }
  }

  await page.waitForFunction(() => {
    const bodyText = document.body?.innerText || "";
    return !/(carregando|loading)/i.test(bodyText.slice(0, 300));
  }, null, { timeout: 5000 }).catch(() => {});
}

async function dismissOverlays(page) {
  const candidates = [
    page.getByRole("button", { name: /aceitar|entendi|ok|fechar|continuar|prosseguir/i }).first(),
    page.getByText(/aceitar/i).first(),
  ];

  for (const locator of candidates) {
    try {
      if (await locator.isVisible({ timeout: 500 })) {
        await locator.click({ timeout: 500 });
        await page.waitForTimeout(300);
      }
    } catch {
      // Ignora overlays não encontrados.
    }
  }
}

async function detectBlogArticleRoute(page) {
  await page.goto(`${BASE_URL}/blog`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForAppReady(page);
  const href = await page
    .locator('a[href^="/blog/"]')
    .filter({ hasNotText: /^Blog$/i })
    .first()
    .getAttribute("href")
    .catch(() => null);

  if (href && href !== "/blog") {
    return href;
  }

  const fallbackSlug = fs.existsSync(CONTENT_BLOG_DIR)
    ? fs.readdirSync(CONTENT_BLOG_DIR).find((file) => file.endsWith(".md"))?.replace(/\.md$/, "") || "ctr-acima-da-media"
    : "ctr-acima-da-media";
  return `/blog/${fallbackSlug}`;
}

async function login(page) {
  const sessionInfo = await createSupabaseSession();
  await hydrateAuthContext(page.context(), sessionInfo);
  await page.goto(`${BASE_URL}/pulse`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForAppReady(page);

  if (!/\/login(?:\?|$)/.test(page.url())) {
    return { ok: true, message: `Sessão autenticada via Supabase em ${page.url()}` };
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForAppReady(page);

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  if (!(await emailInput.isVisible({ timeout: 5000 }).catch(() => false))) {
    return { ok: false, message: "Campo de email não apareceu na tela de login." };
  }

  const setValue = async (locator, value) => {
    await locator.click({ force: true });
    await locator.evaluate((element, nextValue) => {
      const prototype = window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      descriptor?.set?.call(element, nextValue);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
    }, value);
  };

  await setValue(emailInput, LOGIN_EMAIL);
  await setValue(passwordInput, LOGIN_PASSWORD);

  const submit = page.locator("button").filter({ hasText: /entrar|login|continuar|acessar/i }).first();
  if (await submit.isVisible({ timeout: 1000 }).catch(() => false)) {
    await submit.click();
  } else {
    await passwordInput.press("Enter");
  }

  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2500);

  if (/\/login(?:\?|$)/.test(page.url())) {
    const debugPath = path.join(OUTPUT_DIR, "login-debug.png");
    await page.screenshot({ path: debugPath, fullPage: true }).catch(() => {});
    const visibleText = await page.locator("body").innerText().catch(() => "");
    const emailValue = await emailInput.inputValue().catch(() => "");
    const passwordLength = (await passwordInput.inputValue().catch(() => "")).length;
    const snippet = visibleText.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 10).join(" | ");
    const twoFactorVisible = await page.locator('input[id^="lotp-"]').count();
    if (twoFactorVisible > 0) {
      return { ok: false, message: `Login exigiu 2FA; configure ERIZON_SCREENSHOT_EMAIL/SENHA com uma conta sem OTP para automação. Debug: ${debugPath}` };
    }
    return { ok: false, message: `Login não saiu da rota /login. Email preenchido: ${emailValue || "(vazio)"}. Senha chars: ${passwordLength}. Trecho visível: ${snippet}. Debug: ${debugPath}` };
  }

  return { ok: true, message: `Sessão autenticada em ${page.url()}` };
}

async function sanitizePage(page) {
  await page.evaluate((data) => {
    const cycle = (items, index) => items[index % items.length];
    const recentDate = (index) => {
      const date = new Date();
      date.setDate(date.getDate() - (index % 30));
      return date.toLocaleDateString("pt-BR");
    };

    const sanitizeText = (value, index) => {
      if (!value) return value;

      let output = value;
      const lower = value.toLowerCase();
      const fakeCampaign = cycle(data.campaigns, index);
      const fakeAgency = cycle(data.agencies, index);
      const fakeName = cycle(data.names, index);
      const fakeEmail = cycle(data.emails, index);
      const fakePhone = cycle(data.phones, index);
      const fakeCpf = cycle(data.cpfs, index);
      const fakeId = cycle(data.ids, index);
      const fakeDate = recentDate(index);

      output = output.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, fakeEmail);
      output = output.replace(/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4})-?\d{4}/g, fakePhone);
      output = output.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, fakeCpf);
      output = output.replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, fakeId);
      output = output.replace(/\bact[_-]?\d+\b/gi, "act_demo_001");
      output = output.replace(/\b(?:usr|user|cli|crm|sub|ws)[_-][a-z0-9-]+\b/gi, fakeId);
      output = output.replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, fakeDate);
      output = output.replace(/\b\d{4}-\d{2}-\d{2}\b/g, fakeDate);

      if (/roas/i.test(lower)) {
        output = output.replace(/\b\d+(?:[.,]\d+)?x\b/gi, cycle(data.metrics.roas, index));
      }
      if (/ctr/i.test(lower)) {
        output = output.replace(/\b\d+(?:[.,]\d+)?%/g, cycle(data.metrics.ctr, index));
      }
      if (/cpm/i.test(lower)) {
        output = output.replace(/R\$\s?[\d.]+(?:,\d{2})?/g, cycle(data.metrics.cpm, index));
      }
      if (/cpc|cpl/i.test(lower)) {
        output = output.replace(/R\$\s?[\d.]+(?:,\d{2})?/g, cycle(data.metrics.cpc, index));
      }
      if (/invest|gasto|receita|fatur|ticket|orcamento|orçamento|lucro|saldo/i.test(lower)) {
        output = output.replace(/R\$\s?[\d.]+(?:,\d{2})?/g, cycle(data.metrics.investment, index));
      }
      if (/convers|lead|venda|fechamento|clique|resultado/i.test(lower)) {
        output = output.replace(/\b\d{2,5}\b/g, cycle(data.metrics.conversions, index));
      }
      if (/campanha|remarketing|lookalike|criativo|ugc|público|publico|carrinho/i.test(lower)) {
        output = fakeCampaign;
      }
      if (/ag[eê]ncia|empresa|rocket|pixel|m[ií]dias|performance/i.test(lower)) {
        output = fakeAgency;
      }
      if (/cliente demo|cliente|contato|respons[aá]vel|gestor/i.test(lower) && output.length < 80 && !output.includes("@")) {
        output = fakeName;
      }
      if (/^[A-ZÀ-Ý][\p{L}'-]+(?:\s+[A-ZÀ-Ý][\p{L}'-]+){1,3}$/u.test(output)) {
        output = fakeName;
      }
      if (/^\d{6,}$/.test(output.trim())) {
        output = fakeId;
      }
      if (/R\$\s?[\d.]+(?:,\d{2})?/.test(output)) {
        output = output.replace(/R\$\s?[\d.]+(?:,\d{2})?/g, cycle(data.metrics.genericMoney, index));
      }

      return output;
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let currentNode;
    let counter = 0;

    while ((currentNode = walker.nextNode())) {
      const parent = currentNode.parentElement;
      if (!parent) continue;
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;

      const original = currentNode.nodeValue || "";
      const trimmed = original.trim();
      if (!trimmed) continue;
      if (trimmed.length > 180 && !/@|R\$|\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\b\d{2}\/\d{2}\/\d{4}\b/.test(trimmed)) continue;

      const next = sanitizeText(original, counter);
      if (next !== original) {
        currentNode.nodeValue = next;
      }
      counter += 1;
    }

    document.querySelectorAll("input, textarea").forEach((element, index) => {
      const lower = `${element.getAttribute("name") || ""} ${element.getAttribute("placeholder") || ""}`.toLowerCase();
      if (/email/.test(lower)) element.value = cycle(data.emails, index);
      else if (/telefone|phone|whatsapp|celular/.test(lower)) element.value = cycle(data.phones, index);
      else if (/nome|cliente|contato/.test(lower)) element.value = cycle(data.names, index);
      else if (/empresa|agencia|agência/.test(lower)) element.value = cycle(data.agencies, index);
    });

    document.querySelectorAll("table tbody tr").forEach((row, rowIndex) => {
      row.querySelectorAll("td").forEach((cell, colIndex) => {
        const text = (cell.textContent || "").trim();
        if (!text) return;
        const idx = rowIndex + colIndex;
        const replacement = sanitizeText(text, idx);
        if (replacement !== text) {
          cell.textContent = replacement;
        }
      });
    });

    document.querySelectorAll("svg text").forEach((node, index) => {
      const text = node.textContent || "";
      const next = sanitizeText(text, index);
      if (next !== text) {
        node.textContent = next;
      }
    });
  }, FAKE_DATA);
}

async function captureRoute(page, entry) {
  const destination = `${BASE_URL}${entry.route}`;
  const filePath = path.join(OUTPUT_DIR, entry.fileName);

  try {
    const response = await page.goto(destination, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await waitForAppReady(page);
    await dismissOverlays(page);
    await sanitizePage(page);
    await page.waitForTimeout(400);

    const finalUrl = page.url();
    const title = await page.title();
    const status = response ? response.status() : null;
    const redirectedToLogin = /\/login(?:\?|$)/.test(finalUrl) && entry.route !== "/login";

    await page.screenshot({
      path: filePath,
      fullPage: true,
      animations: "disabled",
    });

    const size = fs.statSync(filePath).size;

    return {
      routePattern: entry.routePattern,
      route: entry.route,
      fileName: entry.fileName,
      filePath,
      title,
      finalUrl,
      httpStatus: status,
      sizeBytes: size,
      ok: !redirectedToLogin && (!status || status < 400),
      note: redirectedToLogin ? "Rota redirecionou para login mesmo após autenticação." : "Captura gerada com sanitização fake via page.evaluate().",
    };
  } catch (error) {
    return {
      routePattern: entry.routePattern,
      route: entry.route,
      fileName: entry.fileName,
      filePath,
      title: "",
      finalUrl: destination,
      httpStatus: null,
      sizeBytes: 0,
      ok: false,
      note: error instanceof Error ? error.message : "Falha desconhecida ao capturar a rota.",
    };
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function formatBytes(value) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

async function main() {
  ensureOutputDir();

  const routes = buildRouteEntries();
  const capturable = routes.filter((entry) => entry.kind === "capture");
  const skipped = routes.filter((entry) => entry.kind === "skipped");

  const server = await ensureServerRunning();
  const browser = await chromium.launch({ headless: true });

  try {
    const publicContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const authContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const publicPage = await publicContext.newPage();
    const authPage = await authContext.newPage();

    const loginResult = await login(authPage);
    if (!loginResult.ok) {
      throw new Error(loginResult.message);
    }

    const blogArticleEntry = capturable.find((entry) => entry.routePattern === "/blog/[slug]");
    if (blogArticleEntry && /__auto__/.test(blogArticleEntry.route)) {
      blogArticleEntry.route = await detectBlogArticleRoute(publicPage);
    }

    writeJson(ROUTE_MAP_PATH, {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      capturableRoutes: capturable.map((entry) => ({
        routePattern: entry.routePattern,
        route: entry.route,
        access: entry.access,
        fileName: entry.fileName,
        source: path.relative(ROOT, entry.filePath).replace(/\\/g, "/"),
      })),
      skippedRoutes: skipped.map((entry) => ({
        routePattern: entry.routePattern,
        reason: entry.reason,
        source: path.relative(ROOT, entry.filePath).replace(/\\/g, "/"),
      })),
    });

    const results = [];
    for (const entry of capturable) {
      const page = entry.access === "public" ? publicPage : authPage;
      results.push(await captureRoute(page, entry));
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      login: loginResult,
      serverStartedByScript: server.started,
      totalMappedRoutes: routes.length,
      totalCapturableRoutes: capturable.length,
      totalSkippedRoutes: skipped.length,
      capturedOk: results.filter((item) => item.ok).length,
      capturedWithIssues: results.filter((item) => !item.ok).length,
      files: results.map((item) => ({
        routePattern: item.routePattern,
        route: item.route,
        fileName: item.fileName,
        sizeBytes: item.sizeBytes,
        note: item.note,
        ok: item.ok,
      })),
      skippedRoutes: skipped.map((entry) => ({
        routePattern: entry.routePattern,
        reason: entry.reason,
      })),
    };

    writeJson(MANIFEST_PATH, manifest);

    console.log(`Rotas mapeadas: ${routes.length}`);
    console.log(`Rotas capturáveis: ${capturable.length}`);
    console.log(`Rotas puladas: ${skipped.length}`);
    console.log(`Screenshots gerados: ${results.filter((item) => item.sizeBytes > 0).length}`);
    for (const item of results) {
      console.log(`${item.ok ? "OK " : "ERR"} ${item.fileName} - ${formatBytes(item.sizeBytes)} bytes - ${item.route}`);
    }
  } finally {
    await browser.close();
    if (server.child) {
      server.child.kill();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
