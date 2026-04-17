const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const ROOT = process.cwd();
const BASE_URL = process.env.ERIZON_SCREENSHOT_BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.join(ROOT, "artifacts", "erizon-telas-com-dados");
const IMAGE_DIR = path.join(OUTPUT_DIR, "images");
const HTML_FILE = path.join(OUTPUT_DIR, "index.html");

const MOCK_CLIENTS = [
  {
    id: "cli_taty",
    nome: "tatyalbieri",
    nome_cliente: "Taty Albieri",
    cor: "#8b5cf6",
    meta_account_id: "act_1203984501",
    ticket_medio: 390,
    ativo: true,
    total_campanhas: 6,
    campanhas_ativas: 4,
    campanhas_criticas: 1,
    gasto_total: 4083,
    total_leads: 364,
    cpl_medio: 11.22,
    score: 81,
    ultima_atualizacao: "2026-04-17T11:08:00.000Z",
  },
  {
    id: "cli_marcel",
    nome: "marcel",
    nome_cliente: "Marcel",
    cor: "#3b82f6",
    meta_account_id: "act_4432109987",
    ticket_medio: 280,
    ativo: true,
    total_campanhas: 4,
    campanhas_ativas: 2,
    campanhas_criticas: 0,
    gasto_total: 1670,
    total_leads: 81,
    cpl_medio: 20.62,
    score: 74,
    ultima_atualizacao: "2026-04-17T10:55:00.000Z",
  },
  {
    id: "cli_vanessa",
    nome: "vanessa",
    nome_cliente: "Vanessa",
    cor: "#f59e0b",
    meta_account_id: null,
    ticket_medio: 520,
    ativo: true,
    total_campanhas: 0,
    campanhas_ativas: 0,
    campanhas_criticas: 0,
    gasto_total: 0,
    total_leads: 0,
    cpl_medio: 0,
    score: 50,
    ultima_atualizacao: null,
  },
  {
    id: "cli_clinica",
    nome: "clinicavisao",
    nome_cliente: "Clínica Visão Prime",
    cor: "#10b981",
    meta_account_id: "act_9021004455",
    ticket_medio: 850,
    ativo: true,
    total_campanhas: 7,
    campanhas_ativas: 6,
    campanhas_criticas: 2,
    gasto_total: 5320,
    total_leads: 129,
    cpl_medio: 41.24,
    score: 46,
    ultima_atualizacao: "2026-04-17T07:22:00.000Z",
  },
];

const MOCK_META_ACCOUNTS = [
  {
    id: "act_1203984501",
    name: "Taty Albieri | Captação",
    status: 1,
    status_label: "Ativa",
    ativo: true,
    currency: "BRL",
    business_name: "Erizon Performance",
  },
  {
    id: "act_2233445566",
    name: "Vanessa | Loja Principal",
    status: 1,
    status_label: "Ativa",
    ativo: true,
    currency: "BRL",
    business_name: "Vanessa Beauty",
  },
  {
    id: "act_9988776655",
    name: "Vanessa | Remarketing",
    status: 1,
    status_label: "Ativa",
    ativo: true,
    currency: "BRL",
    business_name: "Vanessa Beauty",
  },
  {
    id: "act_1231231231",
    name: "Conta Antiga Desativada",
    status: 2,
    status_label: "Desativada",
    ativo: false,
    currency: "BRL",
    business_name: "Legacy BM",
  },
];

const MOCK_PORTAL = {
  cli_taty: {
    nome: "Taty Albieri",
    cor: "#8b5cf6",
    campanhas: [
      {
        nome_campanha: "Captação Leads | Harmonização | Abril",
        gasto_total: 1520,
        total_leads: 138,
        cpl: 11.01,
        ctr: 2.74,
        score: 84,
        recomendacao: "Escalar",
      },
      {
        nome_campanha: "Campanha de Remarketing | WhatsApp",
        gasto_total: 840,
        total_leads: 71,
        cpl: 11.83,
        ctr: 3.12,
        score: 79,
        recomendacao: "Manter",
      },
      {
        nome_campanha: "Teste de Criativo | Público Frio",
        gasto_total: 620,
        total_leads: 34,
        cpl: 18.24,
        ctr: 1.41,
        score: 58,
        recomendacao: "Otimizar",
      },
    ],
    total_leads: 243,
    gasto_total: 2980,
    cpl_medio: 12.26,
    campanhas_ativas: 3,
    ultima_atualizacao: "2026-04-17T11:05:00.000Z",
  },
};

function ensureDirs() {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

async function waitForApp(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1800);
}

async function dismissOverlays(page) {
  const buttons = [
    page.getByRole("button", { name: /aceitar|entendi|ok|fechar/i }).first(),
    page.getByText(/aceitar/i).first(),
  ];
  for (const locator of buttons) {
    try {
      if (await locator.isVisible({ timeout: 500 })) {
        await locator.click({ timeout: 500 });
      }
    } catch {}
  }
}

async function setupMockAPIs(page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === "/api/clientes" && method === "GET") {
      return route.fulfill(jsonResponse({ clientes: MOCK_CLIENTS }));
    }

    if (pathname === "/api/clientes" && method === "PATCH") {
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (pathname === "/api/clientes" && method === "POST") {
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (pathname === "/api/clientes" && method === "DELETE") {
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (pathname === "/api/meta-accounts") {
      return route.fulfill(jsonResponse({ accounts: MOCK_META_ACCOUNTS }));
    }

    if (pathname === "/api/ads-sync") {
      return route.fulfill(jsonResponse({ count: 18, ok: true }));
    }

    if (pathname.startsWith("/api/cliente-publico/")) {
      const clientId = pathname.split("/").pop();
      const payload = MOCK_PORTAL[clientId] || MOCK_PORTAL.cli_taty;
      return route.fulfill(jsonResponse(payload));
    }

    return route.continue();
  });
}

function jsonResponse(body) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

async function captureMainDashboard(page) {
  await page.goto(`${BASE_URL}/campanhas/novas`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await waitForApp(page);
  await dismissOverlays(page);
  await page.screenshot({
    path: path.join(IMAGE_DIR, "01-central-clientes.png"),
    fullPage: true,
  });
}

async function captureMetaModal(page) {
  await page.goto(`${BASE_URL}/campanhas/novas`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await waitForApp(page);
  await dismissOverlays(page);

  const connectButton = page.getByRole("button", { name: /conectar meta ads/i }).first();
  await connectButton.scrollIntoViewIfNeeded();
  await connectButton.click();
  await page.waitForTimeout(1200);

  await page.screenshot({
    path: path.join(IMAGE_DIR, "02-modal-conectar-meta.png"),
    fullPage: true,
  });
}

async function capturePortal(page) {
  await page.goto(`${BASE_URL}/portal`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await waitForApp(page);
  await dismissOverlays(page);
  await page.screenshot({
    path: path.join(IMAGE_DIR, "03-portal-cliente.png"),
    fullPage: true,
  });
}

function buildHtml() {
  const cards = [
    {
      title: "Central de Clientes",
      route: "/campanhas/novas",
      image: "01-central-clientes.png",
      note: "Tela principal com cards preenchidos, métricas agregadas, alertas e clientes com scores variados.",
    },
    {
      title: "Modal Conectar Meta Ads",
      route: "/campanhas/novas",
      image: "02-modal-conectar-meta.png",
      note: "Exibe a lista de contas Meta Ads fake para vincular um cliente sem integração.",
    },
    {
      title: "Portal do Cliente",
      route: "/portal",
      image: "03-portal-cliente.png",
      note: "Versão pública com investimento, leads, CPL e campanhas que o cliente veria.",
    },
  ];

  const items = cards.map((card) => `
    <article class="card">
      <div class="meta">
        <div>
          <h2>${escapeHtml(card.title)}</h2>
          <p><code>${escapeHtml(card.route)}</code></p>
        </div>
        <span class="pill">dados fake</span>
      </div>
      <a href="./images/${card.image}" target="_blank" rel="noreferrer">
        <img src="./images/${card.image}" alt="${escapeHtml(card.title)}" />
      </a>
      <p class="note">${escapeHtml(card.note)}</p>
    </article>
  `).join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Erizon - Prints com Dados Fake</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07090d;
      --panel: #11161d;
      --line: #243041;
      --text: #eef2f7;
      --muted: #93a0b5;
      --accent: #c084fc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top, rgba(192,132,252,0.15), transparent 28%),
        linear-gradient(180deg, #07090d 0%, #0d1219 100%);
    }
    main {
      max-width: 1320px;
      margin: 0 auto;
      padding: 32px 24px 56px;
    }
    header {
      padding: 24px;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: rgba(17, 22, 29, 0.88);
      backdrop-filter: blur(14px);
      margin-bottom: 24px;
    }
    h1, h2, p { margin: 0; }
    h1 { font-size: 32px; margin-bottom: 10px; }
    header p {
      color: var(--muted);
      line-height: 1.5;
      max-width: 840px;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }
    .chips span, .chips code {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 6px 10px;
      background: rgba(255,255,255,0.03);
      color: var(--text);
      font-size: 13px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 18px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 16px;
      background: rgba(17, 22, 29, 0.92);
      box-shadow: 0 18px 40px rgba(0,0,0,0.24);
    }
    .meta {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    .meta p { color: var(--muted); margin-top: 6px; }
    .pill {
      border: 1px solid rgba(192,132,252,0.35);
      background: rgba(192,132,252,0.12);
      color: #e9d5ff;
      border-radius: 999px;
      padding: 6px 10px;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.12em;
      font-weight: 700;
    }
    img {
      width: 100%;
      display: block;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: #090d13;
    }
    .note {
      margin-top: 12px;
      color: var(--muted);
      line-height: 1.5;
      font-size: 14px;
    }
    code {
      color: #ddd6fe;
      font-family: Consolas, monospace;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Prints da Erizon com dados fake</h1>
      <p>Este catálogo foi gerado com interceptação de API no navegador para preencher as telas com dados de demonstração. Serve para apresentação visual sem depender de dados reais da conta.</p>
      <div class="chips">
        <span>Base URL: <code>${escapeHtml(BASE_URL)}</code></span>
        <span>3 capturas principais</span>
        <span>Dados 100% demonstrativos</span>
      </div>
    </header>
    <section class="grid">
      ${items}
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

async function main() {
  ensureDirs();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  await setupMockAPIs(page);

  await captureMainDashboard(page);
  await captureMetaModal(page);
  await capturePortal(page);

  fs.writeFileSync(HTML_FILE, buildHtml(), "utf8");

  await browser.close();

  console.log(`Catálogo mock gerado em ${HTML_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
