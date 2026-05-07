import { chromium, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carrega variáveis de ambiente do .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ─── Configuração ─────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');

// Credenciais Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ─── Dados Fake Realistas ─────────────────────────────────────────────────────
const FAKE_DATA = {
  agencias: [
    'Rocket Media', 'Tráfego Norte', 'Agência Pixel', 'UpScale Digital',
    'Click Certo', 'Performance BR', 'Mídias Pro', 'Conversão Digital',
    'Impulso Ads', 'Escala Digital', 'Vértice Marketing', 'Focus Tráfego'
  ],
  nomes: [
    'Carlos Mendonça', 'Fernanda Lopes', 'Rafael Souza', 'Juliana Martins',
    'Bruno Alves', 'Patrícia Costa', 'Diego Ferreira', 'Camila Rocha',
    'Lucas Henrique', 'Mariana Silva', 'Pedro Augusto', 'Ana Beatriz'
  ],
  emails: [
    'contato@rocketmedia.com.br', 'ads@trafegonorte.com.br', 'clientes@pixelagencia.com.br',
    'marketing@upscaledigital.com.br', 'contato@clickcerto.com.br', 'performance@br.com',
    'midias@midiaspro.com.br', 'conversao@digital.com.br'
  ],
  telefones: [
    '(11) 94523-8812', '(21) 98741-3305', '(31) 97632-1490', '(47) 93854-7721',
    '(51) 99123-4567', '(61) 98888-7777', '(85) 97777-6666', '(92) 96666-5555'
  ],
  campanhas: [
    'Conversão - Produto Principal - Público Frio',
    'Remarketing 7D - Visitantes',
    'TOF - Vídeo - Lookalike 2%',
    'BOF - Carrinho Abandonado',
    'Teste Criativo - UGC vs Static',
    'Escala - Público Quente - Verba Alta',
    'Prospecting - Interesses - Ecom',
    'MOF - Engajamento - Instagram',
    'Lançamento - Lista de Espera',
    'Retenção - Base Ativa'
  ],
  metricas: {
    roas: [2.8, 3.1, 3.4, 3.7, 4.2, 4.5, 4.8, 5.1, 5.4, 5.8, 6.1, 6.4],
    cpm: [18.0, 22.0, 25.0, 28.0, 31.0, 34.0, 37.0, 40.0, 42.0],
    ctr: [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 3.3, 3.5, 3.8],
    cpc: [0.85, 1.10, 1.35, 1.60, 1.85, 2.10, 2.40],
    investimento: [4200, 8500, 12000, 15800, 22000, 28500, 33000, 38500],
    conversoes: [42, 89, 156, 234, 312, 445, 567, 689, 756, 890]
  },
  cidades: [
    'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba',
    'Porto Alegre', 'Salvador', 'Fortaleza', 'Brasília'
  ],
  nichos: [
    'E-commerce', 'Infoproduto', 'Serviços Locais', 'SaaS B2B',
    'Saúde e Bem-estar', 'Educação', 'Imobiliário', 'Automotivo'
  ]
};

// ─── Rotas do Projeto ─────────────────────────────────────────────────────────
const AUTH_ROUTES = [
  { path: '/app', name: 'dashboard' },
  { path: '/campanhas', name: 'campanhas' },
  { path: '/campanhas/nova', name: 'campanhas-nova' },
  { path: '/clientes', name: 'clientes' },
  { path: '/pulse', name: 'pulse' },
  { path: '/decision-feed', name: 'decision-feed' },
  { path: '/settings', name: 'settings' },
  { path: '/settings/conta', name: 'settings-conta' },
  { path: '/settings/notificacoes', name: 'settings-notificacoes' },
  { path: '/settings/seguranca', name: 'settings-seguranca' },
  { path: '/settings/integracoes', name: 'settings-integracoes' },
  { path: '/settings/white-label', name: 'settings-white-label' },
  { path: '/settings/plano', name: 'settings-plano' },
  { path: '/billing', name: 'billing' },
  { path: '/crm', name: 'crm' },
  { path: '/crm/dashboard', name: 'crm-dashboard' },
  { path: '/crm/agencia', name: 'crm-agencia' },
  { path: '/risk-radar', name: 'risk-radar' },
  { path: '/funil-publico', name: 'funil-publico' },
  { path: '/insights', name: 'insights' },
  { path: '/benchmarks', name: 'benchmarks' },
  { path: '/creative-lab', name: 'creative-lab' },
  { path: '/analytics', name: 'analytics' },
  { path: '/automacoes', name: 'automacoes' },
  { path: '/relatorios', name: 'relatorios' },
  { path: '/inteligencia', name: 'inteligencia' },
  { path: '/inteligencia/ena', name: 'inteligencia-ena' },
  { path: '/copiloto', name: 'copiloto' },
  { path: '/api-keys', name: 'api-keys' },
  { path: '/relatorio-dna', name: 'relatorio-dna' },
  { path: '/referral', name: 'referral' },
  { path: '/onboarding', name: 'onboarding' },
  { path: '/portal', name: 'portal' },
];

const PUBLIC_ROUTES = [
  { path: '/login', name: 'login' },
  { path: '/signup', name: 'signup' },
  { path: '/sobre', name: 'sobre' },
  { path: '/sucesso', name: 'sucesso' },
  { path: '/privacidade', name: 'privacidade' },
  { path: '/termos', name: 'termos' },
  { path: '/blog', name: 'blog' },
];

// ─── Funções Auxiliares ───────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function randomDateLast30Days(): string {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString('pt-BR');
}

/**
 * Script de injeção de dados fake via page.evaluate()
 */
async function injectFakeData(page: Page): Promise<void> {
  const fakeData = FAKE_DATA;

  await page.evaluate((data) => {
    // Helper para pegar item aleatório
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // Formatações
    const formatMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatPct = (n: number) => n.toFixed(1) + '%';

    // Gera data aleatória
    const randomDate = () => {
      const now = new Date();
      const days = Math.floor(Math.random() * 30);
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
    };

    // 1. Emails
    document.querySelectorAll('[class*="email"], input[type="email"]').forEach((el) => {
      if (el instanceof HTMLElement) el.textContent = pick(data.emails);
    });

    // 2. Telefones
    document.querySelectorAll('[class*="phone"], [class*="telefone"], [class*="whatsapp"]').forEach((el) => {
      if (el instanceof HTMLElement && el.textContent?.match(/\(\d{2}\)/)) {
        el.textContent = pick(data.telefones);
      }
    });

    // 3. Nomes em tabelas e cards
    document.querySelectorAll('td, th, [class*="name"], [class*="cliente"], [class*="agency"]').forEach((el) => {
      if (el instanceof HTMLElement) {
        const text = el.textContent?.trim() || '';
        if (/^[A-Z][a-z]+/.test(text) && !/\d/.test(text) && text.length > 3) {
          el.textContent = pick(data.nomes);
        }
        if (/(agência|agencia|media|mídia)/i.test(text)) {
          el.textContent = pick(data.agencias);
        }
      }
    });

    // 4. Campanhas
    document.querySelectorAll('[class*="campaign"], [class*="campanha"], [class*="adset"]').forEach((el) => {
      if (el instanceof HTMLElement) {
        const text = el.textContent?.trim() || '';
        if (text.length > 10 && /[A-Z]/.test(text)) {
          el.textContent = pick(data.campanhas);
        }
      }
    });

    // 5. Métricas
    document.querySelectorAll('[class*="roas"], [class*="ROAS"]').forEach((el) => {
      if (el instanceof HTMLElement) el.textContent = pick(data.metricas.roas).toFixed(1) + 'x';
    });

    document.querySelectorAll('[class*="cpm"], [class*="CPM"]').forEach((el) => {
      if (el instanceof HTMLElement) el.textContent = formatMoney(pick(data.metricas.cpm));
    });

    document.querySelectorAll('[class*="ctr"], [class*="CTR"]').forEach((el) => {
      if (el instanceof HTMLElement) el.textContent = formatPct(pick(data.metricas.ctr));
    });

    document.querySelectorAll('[class*="cpc"], [class*="CPC"]').forEach((el) => {
      if (el instanceof HTMLElement) el.textContent = formatMoney(pick(data.metricas.cpc));
    });

    document.querySelectorAll('[class*="invest"], [class*="verba"], [class*="spend"]').forEach((el) => {
      if (el instanceof HTMLElement) el.textContent = formatMoney(pick(data.metricas.investimento));
    });

    document.querySelectorAll('[class*="convers"], [class*="result"], [class*="lead"]').forEach((el) => {
      if (el instanceof HTMLElement) el.textContent = pick(data.metricas.conversoes).toString();
    });

    // 6. Valores monetários
    document.querySelectorAll('[class*="value"], [class*="price"], [class*="total"]').forEach((el) => {
      if (el instanceof HTMLElement && el.textContent?.includes('R$')) {
        el.textContent = formatMoney(pick(data.metricas.investimento));
      }
    });

    // 7. Datas
    document.querySelectorAll('[class*="date"], [class*="data"], [class*="created"]').forEach((el) => {
      if (el instanceof HTMLElement) {
        const text = el.textContent?.trim() || '';
        if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text) || /\d{4}-\d{2}-\d{2}/.test(text)) {
          el.textContent = randomDate();
        }
      }
    });

    // 8. Cidades
    document.querySelectorAll('[class*="city"], [class*="cidade"], [class*="location"]').forEach((el) => {
      if (el instanceof HTMLElement) el.textContent = pick(data.cidades);
    });

    // 9. Nichos
    document.querySelectorAll('[class*="nicho"], [class*="niche"], [class*="segment"]').forEach((el) => {
      if (el instanceof HTMLElement) el.textContent = pick(data.nichos);
    });

    // 10. CPFs/CNPJs
    document.querySelectorAll('[class*="cpf"], [class*="cnpj"], [class*="document"]').forEach((el) => {
      if (el instanceof HTMLElement) {
        const text = el.textContent?.trim() || '';
        if (/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(text)) {
          el.textContent = '000.000.000-00';
        } else if (/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(text)) {
          el.textContent = '00.000.000/0000-00';
        }
      }
    });

    // 11. IDs sensíveis
    document.querySelectorAll('[class*="id"], [class*="ID"]').forEach((el) => {
      if (el instanceof HTMLElement && !el.querySelector('input')) {
        const text = el.textContent?.trim() || '';
        if (/^\d{6,}$/.test(text) || /^[0-9a-f]{8}-/i.test(text)) {
          el.textContent = 'DEMO-' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        }
      }
    });
  }, fakeData);

  await page.waitForTimeout(500);
}

/**
 * Verifica se a página carregou completamente
 */
async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');

  // Espera loaders desaparecerem
  try {
    await page.waitForFunction(() => {
      const loaders = document.querySelectorAll(
        '[class*="loading"], [class*="spinner"], [class*="loader"], .animate-pulse'
      );
      return loaders.length === 0;
    }, { timeout: 5000 });
  } catch {
    // Timeout ok, continua mesmo assim
  }

  await page.waitForTimeout(1000);
}

/**
 * Realiza login via injeção de token no localStorage
 */
async function loginWithSupabase(page: Page): Promise<boolean> {
  const supabaseUrl = SUPABASE_URL;
  const supabaseKey = SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('  ⚠️  Credenciais Supabase não encontradas');
    return false;
  }

  try {
    // Tenta login direto via fetch
    const email = 'teste@erizon.com.br';
    const password = 'teste123';

    const response = await page.evaluate(
      async ({ url, key, email, password }) => {
        try {
          const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': key,
              'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({ email, password }),
          });
          return await res.json();
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
      { url: supabaseUrl, key: supabaseKey, email, password }
    );

    if (response.access_token) {
      // Injeta token no localStorage
      await page.evaluate(
        ({ url, token }) => {
          const storageKey = `sb-${new URL(url).hostname.replace('.', '-')}-auth-token`;
          localStorage.setItem(storageKey, JSON.stringify({
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            expires_in: token.expires_in,
            expires_at: Date.now() + token.expires_in * 1000,
            token_type: 'bearer',
            user: token.user,
          }));
        },
        { url: supabaseUrl, token: response }
      );

      // Recarrega para aplicar autenticação
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      console.log('  ✅ Login realizado!');
      return true;
    }

    console.log('  ⚠️  Login falhou, tentando continuar sem autenticação...');
    return false;
  } catch (err) {
    console.log(`  ⚠️  Erro no login: ${err}`);
    return false;
  }
}

/**
 * Tira screenshot de uma página
 */
async function takeScreenshot(page: Page, route: { path: string; name: string }): Promise<boolean> {
  try {
    console.log(`📸 Capturando: ${route.path}...`);

    const url = `${BASE_URL}${route.path}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Verifica se foi redirecionado para login
    const currentUrl = page.url();
    if (currentUrl.includes('/login') && !route.path.includes('/login')) {
      console.log(`  ⚠️  Redirecionado para login...`);
      await loginWithSupabase(page);
      // Tenta navegar novamente
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    }

    // Aguarda carregamento
    await waitForPageLoad(page);

    // Injeta dados fake
    console.log(`  🎭 Injetando dados fake...`);
    await injectFakeData(page);
    await page.waitForTimeout(500);

    // Configura viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${route.name}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png',
    });

    console.log(`  ✅ Salvo: ${screenshotPath}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Erro: ${error}`);
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando script de screenshots...\n');

  // Cria diretório
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    console.log(`📁 Diretório criado: ${SCREENSHOTS_DIR}\n`);
  }

  // Browser
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  const results = { success: [] as string[], failed: [] as string[] };

  // Login inicial
  console.log('🔐 Realizando login...\n');
  await loginWithSupabase(page);

  // Páginas públicas
  console.log('\n📷 === PÁGINAS PÚBLICAS ===\n');
  for (const route of PUBLIC_ROUTES) {
    const success = await takeScreenshot(page, route);
    if (success) results.success.push(route.name);
    else results.failed.push(route.name);
  }

  // Páginas autenticadas
  console.log('\n📷 === PÁGINAS AUTENTICADAS ===\n');
  for (const route of AUTH_ROUTES) {
    const success = await takeScreenshot(page, route);
    if (success) results.success.push(route.name);
    else results.failed.push(route.name);
  }

  await browser.close();

  // Relatório
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL\n');
  console.log(`✅ Sucesso: ${results.success.length}`);
  console.log(`❌ Falhas: ${results.failed.length}`);
  console.log(`📁 Total: ${results.success.length + results.failed.length}\n`);

  if (results.failed.length > 0) {
    console.log('Falhas:');
    results.failed.forEach((name) => console.log(`  - ${name}`));
    console.log();
  }

  // Arquivos gerados
  console.log('📁 ARQUIVOS GERADOS:\n');
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith('.png'));

  const fileDetails = files.map((file) => {
    const filePath = path.join(SCREENSHOTS_DIR, file);
    const stats = fs.statSync(filePath);
    return { name: file, sizeFormatted: (stats.size / 1024).toFixed(2) + ' KB' };
  });

  fileDetails.sort((a, b) => a.name.localeCompare(b.name));

  fileDetails.forEach(({ name, sizeFormatted }) => {
    console.log(`  ${name.padEnd(35)} ${sizeFormatted}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Finalizado!\n');
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
