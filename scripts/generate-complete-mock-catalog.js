const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const ROOT = process.cwd();
const BASE_URL = process.env.ERIZON_SCREENSHOT_BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.join(ROOT, "artifacts", "erizon-telas-completas-fake");
const IMAGE_DIR = path.join(OUTPUT_DIR, "images");
const HTML_FILE = path.join(OUTPUT_DIR, "index.html");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://izzicljdpjpbfluyxlul.supabase.co";
const SUPABASE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

const FAKE_USER = {
  id: "11111111-2222-3333-4444-555555555555",
  aud: "authenticated",
  role: "authenticated",
  email: "demo@erizon.fake",
  email_confirmed_at: "2026-04-17T10:00:00.000Z",
  phone: "",
  confirmed_at: "2026-04-17T10:00:00.000Z",
  last_sign_in_at: "2026-04-17T10:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "Taty Albieri" },
  identities: [],
  created_at: "2026-04-17T10:00:00.000Z",
  updated_at: "2026-04-17T10:00:00.000Z",
};

const FAKE_SESSION = {
  access_token: "fake-access-token",
  refresh_token: "fake-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: FAKE_USER,
};

const CLIENTS = [
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
    crm_token: "crm-taty-001",
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
    crm_token: "crm-marcel-002",
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
    crm_token: "crm-vanessa-003",
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
    crm_token: "crm-clinica-004",
  },
];

const CAMPAIGNS = [
  {
    id: "camp_1",
    user_id: FAKE_USER.id,
    cliente_id: "cli_taty",
    cliente_nome: "Taty Albieri",
    nome_campanha: "Captação Leads | Harmonização | Abril",
    status: "ATIVO",
    gasto_total: 1520,
    contatos: 138,
    receita_estimada: 14500,
    ctr: 2.74,
    cpm: 18.4,
    cpc: 1.92,
    impressoes: 82540,
    cliques: 3690,
    dias_ativo: 21,
    orcamento: 120,
    data_inicio: "2026-03-25",
    score: 84,
    plataforma: "meta",
  },
  {
    id: "camp_2",
    user_id: FAKE_USER.id,
    cliente_id: "cli_taty",
    cliente_nome: "Taty Albieri",
    nome_campanha: "Remarketing WhatsApp | Abril",
    status: "ATIVO",
    gasto_total: 840,
    contatos: 71,
    receita_estimada: 7100,
    ctr: 3.12,
    cpm: 14.8,
    cpc: 1.44,
    impressoes: 56820,
    cliques: 2011,
    dias_ativo: 18,
    orcamento: 80,
    data_inicio: "2026-03-30",
    score: 79,
    plataforma: "meta",
  },
  {
    id: "camp_3",
    user_id: FAKE_USER.id,
    cliente_id: "cli_marcel",
    cliente_nome: "Marcel",
    nome_campanha: "Leads Imobiliária | Público Frio",
    status: "ATIVO",
    gasto_total: 1160,
    contatos: 47,
    receita_estimada: 6200,
    ctr: 1.62,
    cpm: 21.2,
    cpc: 2.28,
    impressoes: 54750,
    cliques: 832,
    dias_ativo: 22,
    orcamento: 65,
    data_inicio: "2026-03-28",
    score: 66,
    plataforma: "google",
  },
  {
    id: "camp_4",
    user_id: FAKE_USER.id,
    cliente_id: "cli_clinica",
    cliente_nome: "Clínica Visão Prime",
    nome_campanha: "Conversões Consulta Premium",
    status: "ATIVO",
    gasto_total: 2490,
    contatos: 38,
    receita_estimada: 7800,
    ctr: 1.21,
    cpm: 28.9,
    cpc: 3.1,
    impressoes: 86110,
    cliques: 948,
    dias_ativo: 24,
    orcamento: 150,
    data_inicio: "2026-03-24",
    score: 43,
    plataforma: "meta",
  },
  {
    id: "camp_5",
    user_id: FAKE_USER.id,
    cliente_id: "cli_clinica",
    cliente_nome: "Clínica Visão Prime",
    nome_campanha: "Vídeo Prova Social | TikTok",
    status: "ACTIVE",
    gasto_total: 1730,
    contatos: 54,
    receita_estimada: 9200,
    ctr: 2.42,
    cpm: 16.7,
    cpc: 1.61,
    impressoes: 72820,
    cliques: 1803,
    dias_ativo: 19,
    orcamento: 95,
    data_inicio: "2026-03-31",
    score: 71,
    plataforma: "tiktok",
  },
  {
    id: "camp_6",
    user_id: FAKE_USER.id,
    cliente_id: "cli_clinica",
    cliente_nome: "Clínica Visão Prime",
    nome_campanha: "Recuperação de Leads | LinkedIn",
    status: "ATIVO",
    gasto_total: 1100,
    contatos: 26,
    receita_estimada: 4100,
    ctr: 0.94,
    cpm: 32.6,
    cpc: 3.91,
    impressoes: 33790,
    cliques: 321,
    dias_ativo: 14,
    orcamento: 70,
    data_inicio: "2026-04-03",
    score: 52,
    plataforma: "linkedin",
  },
  {
    id: "camp_7",
    user_id: FAKE_USER.id,
    cliente_id: "cli_taty",
    cliente_nome: "Taty Albieri",
    nome_campanha: "Teste de Criativo | Público Frio",
    status: "PAUSADA",
    gasto_total: 620,
    contatos: 12,
    receita_estimada: 1500,
    ctr: 0.88,
    cpm: 24.3,
    cpc: 3.44,
    impressoes: 25540,
    cliques: 180,
    dias_ativo: 10,
    orcamento: 45,
    data_inicio: "2026-04-05",
    score: 35,
    plataforma: "meta",
  },
];

const DECISION_HISTORY = [
  { id: "dec_hist_1", campanha_nome: "Conversões Consulta Premium", acao: "reduzir_budget", impacto: "-R$180/dia", created_at: "2026-04-17T08:10:00.000Z" },
  { id: "dec_hist_2", campanha_nome: "Captação Leads | Harmonização | Abril", acao: "escalar", impacto: "+R$420/dia", created_at: "2026-04-16T15:42:00.000Z" },
  { id: "dec_hist_3", campanha_nome: "Remarketing WhatsApp | Abril", acao: "manter", impacto: "estável", created_at: "2026-04-16T11:05:00.000Z" },
];

const SNAPSHOTS = [
  { campanha_id: "camp_1", cpl_ontem: 10.5, cpl_semana: 11.2, ctr_ontem: 2.9, ctr_semana: 2.6, leads_ontem: 8, gasto_ontem: 96, created_at: "2026-04-17T03:00:00.000Z" },
  { campanha_id: "camp_2", cpl_ontem: 12.2, cpl_semana: 11.9, ctr_ontem: 3.0, ctr_semana: 3.1, leads_ontem: 5, gasto_ontem: 62, created_at: "2026-04-17T03:00:00.000Z" },
  { campanha_id: "camp_4", cpl_ontem: 66.4, cpl_semana: 61.7, ctr_ontem: 1.1, ctr_semana: 1.2, leads_ontem: 1, gasto_ontem: 140, created_at: "2026-04-17T03:00:00.000Z" },
];

const AUTOMATION_RULES = [
  { id: "rule_1", user_id: FAKE_USER.id, nome: "Pausar sem leads com gasto alto", condicao_tipo: "gasto_sem_leads", condicao_valor: 100, acao_tipo: "pausar", ativa: true, criada_em: "2026-04-10T10:00:00.000Z" },
  { id: "rule_2", user_id: FAKE_USER.id, nome: "Alertar CPL elevado", condicao_tipo: "cpl_acima", condicao_valor: 80, acao_tipo: "alertar", ativa: true, criada_em: "2026-04-10T11:00:00.000Z" },
];

const LEADS = [
  { id: "lead_1", nome: "Amanda Rocha", telefone: "11999887766", email: "amanda@fake.com", anotacao: "Quer fechar essa semana", estagio: "proposta", valor_fechado: null, margem_lucro: 35, motivo_perda: null, campanha_nome: "Captação Leads | Harmonização | Abril", campanha_id: "camp_1", plataforma: "meta", utm_source: "facebook", utm_medium: "cpc", utm_campaign: "harmonizacao", utm_content: "video_01", utm_term: null, cliente_id: "cli_taty", score: 78, created_at: "2026-04-16T14:10:00.000Z", updated_at: "2026-04-16T14:10:00.000Z" },
  { id: "lead_2", nome: "Roberto Silva", telefone: "11997776655", email: "roberto@fake.com", anotacao: "Precisando de retorno no WhatsApp", estagio: "contato", valor_fechado: null, margem_lucro: 40, motivo_perda: null, campanha_nome: "Leads Imobiliária | Público Frio", campanha_id: "camp_3", plataforma: "google", utm_source: "google", utm_medium: "cpc", utm_campaign: "imobiliaria", utm_content: "search_01", utm_term: "apartamento studio", cliente_id: "cli_marcel", score: 61, created_at: "2026-04-15T09:40:00.000Z", updated_at: "2026-04-16T08:30:00.000Z" },
  { id: "lead_3", nome: "Fernanda Costa", telefone: "11996665544", email: "fernanda@fake.com", anotacao: "Fechou consulta premium", estagio: "fechado", valor_fechado: 2400, margem_lucro: 48, motivo_perda: null, campanha_nome: "Conversões Consulta Premium", campanha_id: "camp_4", plataforma: "meta", utm_source: "instagram", utm_medium: "paid", utm_campaign: "consulta-premium", utm_content: "reels_03", utm_term: null, cliente_id: "cli_clinica", score: 89, created_at: "2026-04-13T11:25:00.000Z", updated_at: "2026-04-16T17:15:00.000Z" },
  { id: "lead_4", nome: "Paula Menezes", telefone: "21999887766", email: "paula@fake.com", anotacao: "Não respondeu proposta final", estagio: "perdido", valor_fechado: null, margem_lucro: 0, motivo_perda: "Sem timing", campanha_nome: "Teste de Criativo | Público Frio", campanha_id: "camp_7", plataforma: "meta", utm_source: "facebook", utm_medium: "cpc", utm_campaign: "teste-criativo", utm_content: "image_02", utm_term: null, cliente_id: "cli_taty", score: 22, created_at: "2026-04-12T13:00:00.000Z", updated_at: "2026-04-14T15:00:00.000Z" },
  { id: "lead_5", nome: "João Pedro", telefone: "11995554433", email: "joao@fake.com", anotacao: "Pedindo proposta detalhada", estagio: "novo", valor_fechado: null, margem_lucro: 30, motivo_perda: null, campanha_nome: "Vídeo Prova Social | TikTok", campanha_id: "camp_5", plataforma: "tiktok", utm_source: "tiktok", utm_medium: "paid", utm_campaign: "prova-social", utm_content: "ugc_05", utm_term: null, cliente_id: "cli_clinica", score: 70, created_at: "2026-04-17T08:20:00.000Z", updated_at: "2026-04-17T08:20:00.000Z" },
];

const META_ACCOUNTS = [
  { id: "act_1203984501", name: "Taty Albieri | Captação", status: 1, status_label: "Ativa", ativo: true, currency: "BRL", business_name: "Erizon Performance" },
  { id: "act_2233445566", name: "Vanessa | Loja Principal", status: 1, status_label: "Ativa", ativo: true, currency: "BRL", business_name: "Vanessa Beauty" },
  { id: "act_9988776655", name: "Vanessa | Remarketing", status: 1, status_label: "Ativa", ativo: true, currency: "BRL", business_name: "Vanessa Beauty" },
  { id: "act_1231231231", name: "Conta Antiga Desativada", status: 2, status_label: "Desativada", ativo: false, currency: "BRL", business_name: "Legacy BM" },
];

const REFERRAL = {
  code: "ERZ-FAKE2026",
  referralLink: `${BASE_URL}?ref=ERZ-FAKE2026`,
  stats: {
    clicks: 129,
    signups: 18,
    conversions: 6,
    creditBRL: 60,
  },
};

const API_KEYS = [
  { id: "key_1", name: "Painel BI", key_prefix: "erz_live_x1", plan: "pro", active: true, last_used_at: "2026-04-17T10:11:00.000Z", requests_total: 12440, created_at: "2026-04-05T09:00:00.000Z" },
  { id: "key_2", name: "Zapier Workflow", key_prefix: "erz_live_x2", plan: "pro", active: true, last_used_at: "2026-04-17T08:02:00.000Z", requests_total: 3820, created_at: "2026-04-07T13:20:00.000Z" },
  { id: "key_3", name: "Sandbox Demo", key_prefix: "erz_test_x3", plan: "free", active: false, last_used_at: null, requests_total: 120, created_at: "2026-04-09T15:00:00.000Z" },
];

const WEBHOOK_INTEGRATIONS = [
  { id: "int_1", platform: "hotmart", ativo: true, shop_domain: null, created_at: "2026-04-01T12:00:00.000Z" },
  { id: "int_2", platform: "shopify", ativo: true, shop_domain: "loja-demo.myshopify.com", created_at: "2026-04-03T12:00:00.000Z" },
];

const WHITE_LABEL_CONFIG = {
  id: "wl_cfg_1",
  user_id: FAKE_USER.id,
  nome_plataforma: "Erizon White Label",
  logo_url: "https://placehold.co/320x96/111827/f8fafc?text=Erizon+WL",
  dominio_customizado: "demo.erizon.fake",
  primaria: "#8b5cf6",
  secundaria: "#0f172a",
  descricao: "Workspace demonstrativo para capturas sem clientes reais.",
};

const WHITE_LABEL_CLIENTES = [
  {
    id: "wl_client_1",
    white_label_owner_id: FAKE_USER.id,
    nome: "Agencia Horizonte",
    email: "horizonte@fake.com",
    status: "ativo",
    convidado_em: "2026-04-11T10:00:00.000Z",
  },
  {
    id: "wl_client_2",
    white_label_owner_id: FAKE_USER.id,
    nome: "Studio Solar",
    email: "solar@fake.com",
    status: "pendente",
    convidado_em: "2026-04-13T16:10:00.000Z",
  },
];

const MFA_CONFIG = {
  id: "mfa_1",
  user_id: FAKE_USER.id,
  ativo: true,
  metodo: "email",
  updated_at: "2026-04-16T19:00:00.000Z",
};

const ROUTES = [
  { id: "01-landing", title: "Landing Page", route: "/" },
  { id: "02-sobre", title: "Sobre", route: "/sobre" },
  { id: "03-billing-publico", title: "Billing Público", route: "/billing" },
  { id: "04-login", title: "Login", route: "/login" },
  { id: "05-signup", title: "Signup", route: "/signup" },
  { id: "06-central-clientes", title: "Central de Clientes", route: "/campanhas/novas" },
  { id: "07-gerenciador-anuncios", title: "Gerenciador de Anúncios", route: "/campanhas" },
  { id: "09-clientes", title: "Gestão de Clientes", route: "/clientes" },
  { id: "08-preflight", title: "Pre-flight de Campanha", route: "/campanhas/nova" },
  { id: "10-portal", title: "Portal do Cliente", route: "/portal" },
  { id: "11-relatorios", title: "Relatórios", route: "/relatorios" },
  { id: "12-crm", title: "CRM", route: "/crm" },
  { id: "13-pulse", title: "Pulse Cockpit", route: "/pulse" },
  { id: "14-analytics", title: "Analytics", route: "/analytics" },
  { id: "15-decision-feed", title: "Decision Feed", route: "/decision-feed" },
  { id: "16-automacoes", title: "Automações", route: "/automacoes" },
  { id: "17-settings-plano", title: "Plano & Billing", route: "/settings/plano" },
  { id: "18-settings-integracoes", title: "Integrações", route: "/settings/integracoes" },
  { id: "19-settings-notificacoes", title: "Notificações", route: "/settings/notificacoes" },
  { id: "20-api-keys", title: "API Keys", route: "/api-keys" },
  { id: "21-referral", title: "Referral", route: "/referral" },
  { id: "22-settings-home", title: "Settings Home", route: "/settings" },
  { id: "23-settings-conta", title: "Conta", route: "/settings/conta" },
  { id: "24-settings-seguranca", title: "Seguranca", route: "/settings/seguranca" },
  { id: "25-settings-white-label", title: "White Label", route: "/settings/white-label" },
  { id: "26-cliente-home", title: "Painel Cliente", route: "/cliente" },
  { id: "27-cliente-detalhe", title: "Cliente Detalhe", route: "/clientes/cli_taty" },
  { id: "28-crm-agencia", title: "CRM Agencia", route: "/crm/agencia" },
  { id: "29-crm-dashboard", title: "CRM Dashboard", route: "/crm/dashboard" },
  { id: "30-crm-cliente-login", title: "CRM Cliente Login", route: "/crm/cliente/login/crm-taty-001" },
  { id: "31-crm-cliente-portal", title: "CRM Cliente Portal", route: "/crm/cliente/crm-taty-001" },
  { id: "32-admin", title: "Admin", route: "/admin" },
  { id: "33-benchmarks", title: "Benchmarks", route: "/benchmarks" },
  { id: "34-insights", title: "Insights", route: "/insights" },
  { id: "35-inteligencia", title: "Inteligencia", route: "/inteligencia" },
  { id: "36-inteligencia-ena", title: "Inteligencia ENA", route: "/inteligencia/ena" },
  { id: "37-copiloto", title: "Copiloto", route: "/copiloto" },
  { id: "38-creative-lab", title: "Creative Lab", route: "/creative-lab" },
  { id: "39-blog", title: "Blog", route: "/blog" },
  { id: "40-blog-artigo", title: "Blog Artigo", route: "/blog/ctr-acima-da-media" },
  { id: "41-docs-benchmarks", title: "Docs API Benchmarks", route: "/docs/api/benchmarks" },
  { id: "42-onboarding", title: "Onboarding", route: "/onboarding" },
  { id: "43-risk-radar", title: "Risk Radar", route: "/risk-radar" },
  { id: "44-privacidade", title: "Privacidade", route: "/privacidade" },
  { id: "45-termos", title: "Termos", route: "/termos" },
  { id: "46-sucesso", title: "Sucesso", route: "/sucesso?session_id=mock_checkout_session" },
  { id: "47-funil-publico", title: "Funil Publico", route: "/funil-publico" },
  { id: "48-lp-diagnostico", title: "LP Diagnostico", route: "/lp/diagnostico" },
  { id: "49-lp-formulario", title: "LP Formulario", route: "/lp/formulario" },
  { id: "50-lp-formulario-user", title: "LP Formulario Parametrizado", route: `/lp/formulario/${FAKE_USER.id}/cli_taty` },
  { id: "51-lp-gestores", title: "LP Gestores", route: "/lp/gestores" },
  { id: "52-lp-pamela", title: "LP Pamela", route: "/lp/pamela" },
  { id: "53-lp-codigo", title: "LP Codigo", route: "/lp/ERZ-FAKE2026" },
  { id: "54-share-portal", title: "Share Portal", route: "/share/portal/cli_taty?crm=crm-taty-001" },
];

function ensureDirs() {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

function fmtCurrency(v) {
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildReport(clienteId) {
  const cliente = CLIENTS.find((item) => item.id === clienteId) || CLIENTS[0];
  const campanhas = CAMPAIGNS.filter((item) => item.cliente_id === cliente.id);
  const investimento = campanhas.reduce((sum, item) => sum + item.gasto_total, 0);
  const leads = campanhas.reduce((sum, item) => sum + item.contatos, 0);
  const receita = campanhas.reduce((sum, item) => sum + item.receita_estimada, 0);
  const cplMedio = leads > 0 ? investimento / leads : 0;
  const roasMedio = investimento > 0 ? receita / investimento : 0;

  return {
    ok: true,
    relatorio: {
      titulo: `Relatório Executivo · ${cliente.nome_cliente}`,
      cliente: cliente.nome_cliente,
      dataGeracao: "17/04/2026 10:30",
      totais: {
        campanhas: campanhas.length,
        investimento,
        leads,
        receita,
        cplMedio,
        roasMedio,
      },
      campanhas: campanhas.map((item) => ({
        id: item.id,
        nome: item.nome_campanha,
        status: item.status,
        gasto: item.gasto_total,
        leads: item.contatos,
        receita: item.receita_estimada,
        cpl: item.contatos > 0 ? item.gasto_total / item.contatos : 0,
        roas: item.gasto_total > 0 ? item.receita_estimada / item.gasto_total : 0,
        ctr: item.ctr,
        score: item.score,
      })),
    },
  };
}

function buildPortal(clienteId) {
  const cliente = CLIENTS.find((item) => item.id === clienteId) || CLIENTS[0];
  const campanhas = CAMPAIGNS.filter((item) => item.cliente_id === cliente.id && item.status !== "PAUSADA").slice(0, 4);
  const gasto = campanhas.reduce((sum, item) => sum + item.gasto_total, 0);
  const leads = campanhas.reduce((sum, item) => sum + item.contatos, 0);
  return {
    nome: cliente.nome_cliente,
    cor: cliente.cor,
    campanhas: campanhas.map((item) => ({
      nome_campanha: item.nome_campanha,
      gasto_total: item.gasto_total,
      total_leads: item.contatos,
      cpl: item.contatos > 0 ? item.gasto_total / item.contatos : 0,
      ctr: item.ctr,
      score: item.score,
      recomendacao: item.score >= 75 ? "Escalar" : item.score >= 55 ? "Manter" : item.score >= 40 ? "Otimizar" : "Pausar",
    })),
    total_leads: leads,
    gasto_total: gasto,
    cpl_medio: leads > 0 ? gasto / leads : 0,
    campanhas_ativas: campanhas.length,
    ultima_atualizacao: "2026-04-17T11:05:00.000Z",
  };
}

function buildCrmAnalytics(clienteId) {
  const leads = LEADS.filter((lead) => !clienteId || lead.cliente_id === clienteId);
  const totalFechados = leads.filter((lead) => lead.estagio === "fechado");
  const valorTotal = totalFechados.reduce((sum, lead) => sum + (lead.valor_fechado || 0), 0);
  const porCampanhaMap = new Map();
  for (const lead of leads) {
    const key = lead.campanha_id || lead.campanha_nome || "manual";
    const entry = porCampanhaMap.get(key) || {
      campanha_id: lead.campanha_id || null,
      campanha_nome: lead.campanha_nome || "Manual",
      plataforma: lead.plataforma || "manual",
      total: 0,
      fechados: 0,
      perdidos: 0,
      valor: 0,
      taxa_conversao: 0,
    };
    entry.total += 1;
    if (lead.estagio === "fechado") {
      entry.fechados += 1;
      entry.valor += lead.valor_fechado || 0;
    }
    if (lead.estagio === "perdido") {
      entry.perdidos += 1;
    }
    entry.taxa_conversao = entry.total > 0 ? (entry.fechados / entry.total) * 100 : 0;
    porCampanhaMap.set(key, entry);
  }

  const porPlataformaMap = new Map();
  for (const lead of leads) {
    const plataforma = lead.plataforma || "manual";
    porPlataformaMap.set(plataforma, (porPlataformaMap.get(plataforma) || 0) + 1);
  }

  const stages = { novo: 0, contato: 0, proposta: 0, fechado: 0, perdido: 0 };
  for (const lead of leads) {
    stages[lead.estagio] += 1;
  }

  return {
    total_leads: leads.length,
    total_fechados: totalFechados.length,
    valor_total: valorTotal,
    taxa_conversao: leads.length > 0 ? Math.round((totalFechados.length / leads.length) * 100) : 0,
    ticket_medio: totalFechados.length > 0 ? valorTotal / totalFechados.length : 0,
    leads_atrasados: leads.filter((lead) => ["novo", "contato", "proposta"].includes(lead.estagio)).length,
    funil: stages,
    por_campanha: Array.from(porCampanhaMap.values()),
    por_plataforma: Array.from(porPlataformaMap.entries()).map(([plataforma, count]) => ({ plataforma, count })),
    evolucao_diaria: [
      { data: "10/04", leads: 4 },
      { data: "11/04", leads: 6 },
      { data: "12/04", leads: 5 },
      { data: "13/04", leads: 7 },
      { data: "14/04", leads: 8 },
      { data: "15/04", leads: 6 },
      { data: "16/04", leads: 9 },
      { data: "17/04", leads: 5 },
    ],
  };
}

function buildDailyDigest() {
  return {
    hero: {
      greeting: "Bom dia",
      headline: "Seu cockpit abriu com oportunidade clara de ganho hoje.",
      summary: "A operação amanheceu com duas decisões críticas, benchmark acima da média em CTR e um potencial de receita adicional estimado se as ações forem aprovadas ainda nesta janela.",
    },
    period: {
      current: { spend: 10840, revenue: 39800, leads: 381, campaigns: 6, avgCpl: 28.45, avgRoas: 3.67 },
      previous: { spend: 9640, revenue: 35200, leads: 330, avgCpl: 29.21, avgRoas: 3.45 },
      changes: { spend: 12, revenue: 13, leads: 15, avgCpl: -3, avgRoas: 6 },
    },
    decisions: {
      count: 4,
      urgentCount: 2,
      pendingImpactBrl: 6200,
      pending: [
        { id: "pd_1", action_type: "reduce_budget", title: "Reduzir verba em campanha crítica", confidence: "high" },
        { id: "pd_2", action_type: "scale_budget", title: "Escalar melhor campanha da conta", confidence: "medium" },
      ],
    },
    alerts: {
      count: 3,
      criticalCount: 1,
      pausedCampaigns: [{ campaign_name: "Teste de Criativo | Público Frio", status: "PAUSADA" }],
    },
    topCampaign: { campaign_name: "Captação Leads | Harmonização | Abril", leads: 138, spend: 1520, ctr: 2.74 },
    benchmark: {
      niche: "Saúde estética",
      cpl: { my: 28.45, benchmark: 31.2, status: "winning" },
      roas: { my: 3.67, benchmark: 3.12, status: "winning" },
      insight: "Seu CPL está abaixo da mediana da rede e o ROAS acima do benchmark do nicho.",
    },
    learning: {
      approvedCount: 18,
      rejectedCount: 4,
      measuredCount: 13,
      accuracyPct: 81,
      confidenceScore: 84,
      retrainingTriggers: 1,
      topWinningActions: ["Escala gradual em remarketing", "Redução de verba em campanha crítica"],
      topRejectedActions: ["Pausar campanha de prova social"],
      memoryLine: "A conta responde melhor quando escala remarketing em ciclos curtos e segura criativos com CTR abaixo de 1.2%.",
    },
    business: {
      spend30d: 28400,
      closedRevenue30d: 97300,
      pipelineValue: 48100,
      weightedPipelineValue: 26350,
      conversionRate: 21,
      ticketMedio: 1780,
      roiMultiple: 3.42,
      summary: "O CRM já está convertendo investimento em receita fechada e mostrando pipeline real projetado para os próximos 30 dias.",
    },
    collective: {
      niche: "Saúde estética",
      peers: 48,
      position: "top 22%",
      marketTrend: "CTR acima da média da rede esta semana",
      topPattern: "Criativos com prova social em vídeo curto",
      trendNote: "A rede está favorecendo narrativas antes/depois com CTA rápido.",
      insight: "Sua operação está performando acima da média da rede e ganhando vantagem de execução.",
    },
    forecast: {
      campaignName: "Captação Leads | Harmonização | Abril",
      score: 84,
      confidenceLabel: "alta",
      estimatedLeads7d: 46,
      estimatedRevenue7d: 12800,
      estimatedCplRange: [10, 13],
      estimatedRoas: 3.8,
      recommendation: "Escalar em 15% com monitoramento de frequência.",
      createdAt: "2026-04-17T09:00:00.000Z",
    },
    dna: {
      bestFormats: ["UGC", "Antes e depois", "Oferta objetiva"],
      keyLearnings: ["Vídeos curtos convertem melhor", "Remarketing responde com CPL menor"],
      goldenAudience: "Mulheres 28-44 com intenção alta de procedimento",
      confidenceScore: 86,
    },
    progress: {
      wastedBudgetRecoveredBrl: 2100,
      revenueOpportunityBrl: 6200,
      efficiencyDelta: 14,
      habitScore: 78,
    },
    dataQuality: {
      operationalWindow: "30 dias",
      revenueSource: "crm",
      benchmarkSource: "network_weekly_insights",
      benchmarkPeers: 48,
    },
    actions: [
      "Aprovar a redução de verba na campanha clínica premium.",
      "Escalar remarketing da Taty em 15%.",
      "Manter atenção no LinkedIn com CTR abaixo de 1%.",
    ],
    insights: [
      "Oportunidade de receita adicional estimada em R$ 6.2k.",
      "CTR acima do benchmark da rede no nicho.",
      "Há 1 criativo que deve ser pausado até o próximo sync.",
    ],
  };
}

function buildStrategicSnapshot() {
  return {
    moat: {
      dependencyScore: 82,
      lockInLine: "A operação já depende do loop entre CRM, cockpit de decisão, benchmarking de rede e memória estratégica da Erizon.",
      reasons: ["Decisões estão sendo retroalimentadas por outcomes medidos e benchmark de nicho."],
    },
    learning: {
      accuracyPct: 81,
      measuredCount: 13,
      memoryLine: "A conta aprende rápido quando ciclos de aprovação e outcome são fechados semanalmente.",
    },
    business: {
      closedRevenue30d: 97300,
      weightedPipelineValue: 26350,
      roiMultiple: 3.42,
      projectedRevenue30d: 118000,
      projectedMarginPct: 34,
    },
    collective: {
      niche: "Saúde estética",
      position: "top 22%",
      insight: "Seu CPL está mais eficiente que a rede e o CRM mostra captura de valor acima da média.",
    },
    dna: {
      goldenAudience: "Mulheres 28-44 com interesse em estética e decisão rápida por WhatsApp.",
      keyLearnings: ["Vídeo curto com prova social", "Oferta direta converte melhor"],
    },
  };
}

function buildDecisionItems() {
  return [
    {
      id: "pd_1",
      workspace_id: "ws_demo",
      campaign_id: "camp_4",
      campaign_name: "Conversões Consulta Premium",
      action_type: "reduce_budget",
      title: "Reduzir orçamento da campanha clínica premium",
      rationale: "CPL derivado acima de R$60 e score em queda por 3 dias. Há capital em risco nessa janela.",
      estimated_impact_brl: 1800,
      confidence: "high",
      status: "pending",
      meta_payload: { suggested_daily_budget: 110 },
      created_at: "2026-04-17T09:30:00.000Z",
      expires_at: "2026-04-18T09:30:00.000Z",
      decided_at: null,
      decided_by: null,
      execution_result: null,
    },
    {
      id: "pd_2",
      workspace_id: "ws_demo",
      campaign_id: "camp_1",
      campaign_name: "Captação Leads | Harmonização | Abril",
      action_type: "scale_budget",
      title: "Escalar campanha vencedora da Taty",
      rationale: "ROAS derivado de 9.54x, CPL baixo e frequência controlada sugerem espaço de escala segura.",
      estimated_impact_brl: 3200,
      confidence: "medium",
      status: "pending",
      meta_payload: { suggested_daily_budget: 140 },
      created_at: "2026-04-17T09:35:00.000Z",
      expires_at: "2026-04-18T09:35:00.000Z",
      decided_at: null,
      decided_by: null,
      execution_result: null,
    },
    {
      id: "pd_3",
      workspace_id: "ws_demo",
      campaign_id: "camp_6",
      campaign_name: "Recuperação de Leads | LinkedIn",
      action_type: "alert",
      title: "Monitorar CTR abaixo do benchmark",
      rationale: "A campanha segue ativa, mas o CTR caiu para 0.94%. Se mantiver essa trajetória, o custo por lead deve subir.",
      estimated_impact_brl: 1200,
      confidence: "medium",
      status: "pending",
      meta_payload: null,
      created_at: "2026-04-17T09:40:00.000Z",
      expires_at: "2026-04-18T09:40:00.000Z",
      decided_at: null,
      decided_by: null,
      execution_result: null,
    },
  ];
}

function buildPredAlerts() {
  return {
    alerts: [
      { campaign_name: "Conversões Consulta Premium", alert_type: "cpl_spike", confidence: 0.81, preventive_action: "Trocar criativo e limitar verba até o próximo sync." },
      { campaign_name: "Recuperação de Leads | LinkedIn", alert_type: "ctr_drop", confidence: 0.67, preventive_action: "Avaliar novo hook e resegmentar anúncio de topo." },
    ],
  };
}

function buildNetwork() {
  return {
    ok: true,
    nicheInsight: {
      niche: "Saúde estética",
      cplP25: 24,
      cplP50: 31,
      cplP75: 44,
      roasP25: 2.4,
      roasP50: 3.1,
      roasP75: 3.9,
      ctrP50: 1.9,
    },
    position: {
      suaRoas: 3.67,
      suaPosicao: "top 22%",
    },
  };
}

function buildBilling() {
  return {
    ativo: true,
    plano: "pro",
    status: "active",
    trial_ends_at: null,
    current_period_end: "2026-05-17T00:00:00.000Z",
    cancel_at_period_end: false,
  };
}

function buildWhatsappConfig() {
  return {
    config: {
      phone_number: "5511999998888",
      instance_name: "erizon-demo",
      api_base_url: "https://api.whatsapp.fake",
      api_key_masked: "wa_****_demo",
      has_api_key: true,
      ativo: true,
      briefing_hora: 7,
    },
  };
}

function buildIntegrationsApiKey() {
  return { has_key: true, masked: "erz_live_****_demo" };
}

function buildBlog(limit = 3) {
  return {
    posts: [
      { slug: "ctr-acima-da-media", title: "CTR acima da média: o que isso muda na operação", excerpt: "Como ler criativos vencedores e dobrar orçamento sem quebrar aprendizado.", publishedAt: "2026-04-15", coverImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80", category: "Performance" },
      { slug: "crm-fecha-loop", title: "CRM fecha o loop entre mídia e receita", excerpt: "Por que medir lead sem medir receita fechada distorce a decisão da conta.", publishedAt: "2026-04-12", coverImage: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=1200&q=80", category: "CRM" },
      { slug: "cockpit-humano-no-loop", title: "Cockpit humano no loop: quando aprovar ou ignorar", excerpt: "Como usar fila de decisões sem cair no piloto automático cego.", publishedAt: "2026-04-10", coverImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80", category: "Ops" },
    ].slice(0, limit),
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function buildSingleOrArray(data, request) {
  const accept = request.headers().accept || "";
  return accept.includes("vnd.pgrst.object+json") ? (Array.isArray(data) ? (data[0] || null) : data) : data;
}

async function setupContext(context) {
  await context.addInitScript(({ key, session }) => {
    window.localStorage.setItem(key, JSON.stringify(session));
  }, { key: SUPABASE_KEY, session: FAKE_SESSION });

  await context.route("**/auth/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/user")) {
      return route.fulfill(jsonResponse({ user: FAKE_USER }));
    }
    if (pathname.endsWith("/token")) {
      return route.fulfill(jsonResponse(FAKE_SESSION));
    }
    return route.fulfill(jsonResponse({}));
  });

  await context.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = decodeURIComponent(url.pathname.split("/rest/v1/")[1] || "");
    const method = request.method();

    let payload = [];

    if (table.startsWith("metricas_ads")) payload = CAMPAIGNS;
    else if (table.startsWith("decisoes_historico")) payload = DECISION_HISTORY;
    else if (table.startsWith("metricas_snapshot_diario")) payload = SNAPSHOTS;
    else if (table.startsWith("user_settings")) payload = [{
      user_id: FAKE_USER.id,
      meta_access_token: "meta_fake_token",
      meta_ad_account_id: "act_1203984501",
      google_ads_access_token: "google_fake_token",
      tiktok_ads_access_token: "tiktok_fake_token",
      linkedin_ads_access_token: "linkedin_fake_token",
      telegram_chat_id: "12345678",
      autopilot_enabled: true,
    }];
    else if (table.startsWith("workspace_members")) payload = [{ workspace_id: "ws_demo", user_id: FAKE_USER.id }];
    else if (table.startsWith("automacao_regras")) payload = AUTOMATION_RULES;
    else if (table.startsWith("user_configs")) payload = [{ user_id: FAKE_USER.id, telegram_chat_id: "12345678", limite_cpl: 42 }];
    else if (table.startsWith("telegram_copilot_sessions")) payload = [{ user_id: FAKE_USER.id, ativo: true, briefing_hora: 7 }];
    else if (table.startsWith("clientes")) payload = CLIENTS.map((client) => ({ ...client, ig_user_id: "ig_demo_123" }));
    else if (table.startsWith("white_label_configs")) payload = [WHITE_LABEL_CONFIG];
    else if (table.startsWith("white_label_clientes")) payload = WHITE_LABEL_CLIENTES;
    else if (table.startsWith("user_mfa_config")) payload = [MFA_CONFIG];
    else if (table.startsWith("trusted_devices")) payload = [{ id: "trusted_1", user_id: FAKE_USER.id, device_name: "Chrome Demo", trusted_until: "2026-07-01T00:00:00.000Z" }];
    else if (table.startsWith("leads")) payload = LEADS;

    if (method !== "GET") {
      return route.fulfill(jsonResponse(buildSingleOrArray(payload, request)));
    }

    return route.fulfill(jsonResponse(buildSingleOrArray(payload, request)));
  });

  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === "/api/blog") {
      const limit = Number(url.searchParams.get("limit") || 3);
      return route.fulfill(jsonResponse(buildBlog(limit)));
    }

    if (pathname === "/api/admin/stats") {
      return route.fulfill(jsonResponse({
        ok: true,
        stats: {
          mrr: 28490,
          clientesAtivos: CLIENTS.filter((item) => item.ativo).length,
          campanhasAtivas: CAMPAIGNS.filter((item) => String(item.status).toUpperCase() === "ATIVO" || String(item.status).toUpperCase() === "ACTIVE").length,
          leadsMes: LEADS.length * 18,
        },
      }));
    }

    if (pathname === "/api/clientes" && method === "GET") {
      const requestedId = url.searchParams.get("id");
      if (requestedId) {
        return route.fulfill(jsonResponse({ cliente: CLIENTS.find((item) => item.id === requestedId) || CLIENTS[0] }));
      }
      return route.fulfill(jsonResponse({ clientes: CLIENTS }));
    }

    if (pathname === "/api/clientes" && ["POST", "PATCH", "DELETE"].includes(method)) {
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (pathname === "/api/clientes/campanhas") {
      const clienteId = url.searchParams.get("cliente_id");
      const campaigns = CAMPAIGNS.filter((item) => !clienteId || item.cliente_id === clienteId);
      return route.fulfill(jsonResponse(campaigns));
    }

    if (pathname.startsWith("/api/cliente-publico/")) {
      const parts = pathname.split("/");
      const clienteId = parts[3];
      if (parts[4] === "leads") {
        return route.fulfill(jsonResponse(LEADS.filter((lead) => lead.cliente_id === clienteId)));
      }
      return route.fulfill(jsonResponse(buildPortal(clienteId)));
    }

    if (pathname === "/api/meta-accounts") {
      return route.fulfill(jsonResponse({ accounts: META_ACCOUNTS }));
    }

    if (pathname === "/api/campaigns/preflight") {
      return route.fulfill(jsonResponse({
        ok: true,
        summary: {
          readinessScore: 86,
          audience: "Aprovado",
          creative: "Ajuste leve",
          tracking: "Ok",
        },
        checklist: [
          { label: "Oferta clara", status: "ok" },
          { label: "Criativo com hook forte", status: "warning" },
          { label: "Pixel e UTMs configurados", status: "ok" },
        ],
      }));
    }

    if (pathname === "/api/ads-sync") {
      return route.fulfill(jsonResponse({ ok: true, count: CAMPAIGNS.length }));
    }

    if (["/api/google-ads-sync", "/api/tiktok-ads-sync", "/api/linkedin-ads-sync"].includes(pathname)) {
      return route.fulfill(jsonResponse({ ok: true, synced: true }));
    }

    if (pathname === "/api/relatorio-pdf") {
      const clienteId = url.searchParams.get("cliente_id") || CLIENTS[0].id;
      return route.fulfill(jsonResponse(buildReport(clienteId)));
    }

    if (pathname === "/api/referral") {
      return route.fulfill(jsonResponse(REFERRAL));
    }

    if (pathname === "/api/billing") {
      if (method === "POST") {
        return route.fulfill(jsonResponse({ ok: true, url: `${BASE_URL}/billing?mock=1` }));
      }
      return route.fulfill(jsonResponse(buildBilling()));
    }

    if (pathname === "/api/settings/integrations") {
      if (method === "GET") return route.fulfill(jsonResponse({ integrations: WEBHOOK_INTEGRATIONS }));
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (pathname.startsWith("/api/settings/integrations/")) {
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (pathname === "/api/settings/api-key") {
      if (method === "POST") return route.fulfill(jsonResponse({ api_key: "erz_live_demo_full_mock_key" }));
      return route.fulfill(jsonResponse(buildIntegrationsApiKey()));
    }

    if (pathname === "/api/settings/api-key-management") {
      if (method === "POST") return route.fulfill(jsonResponse({ key: "erz_live_new_demo_key" }));
      return route.fulfill(jsonResponse(API_KEYS));
    }

    if (/^\/api\/settings\/api-key-management\/[^/]+$/.test(pathname)) {
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (pathname === "/api/training-data/export") {
      return route.fulfill(jsonResponse({ total: 16380, today: 482 }));
    }

    if (pathname === "/api/settings/whatsapp") {
      return route.fulfill(jsonResponse(buildWhatsappConfig()));
    }

    if (pathname === "/api/telegram" || pathname === "/api/push/test" || pathname === "/api/meta/pause-campaign") {
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (pathname === "/api/snapshot") {
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (pathname === "/api/instagram") {
      return route.fulfill(jsonResponse({
        ok: true,
        profile: { username: "erizon.demo", followers: 18420, engagement_rate: 3.8 },
        posts: [
          { id: "ig_1", caption: "Criativo vencedor da semana", likes: 812, comments: 43 },
          { id: "ig_2", caption: "Bastidores da operação", likes: 544, comments: 21 },
        ],
      }));
    }

    if (pathname === "/api/clientes/vincular-campanhas" || pathname === "/api/campanhas-vincular") {
      return route.fulfill(jsonResponse({ ok: true, campanhas: CAMPAIGNS, vinculadas: CAMPAIGNS.length }));
    }

    if (pathname === "/api/crm/leads") {
      const clienteId = url.searchParams.get("cliente_id");
      const leads = LEADS.filter((lead) => !clienteId || lead.cliente_id === clienteId);
      return route.fulfill(jsonResponse(leads));
    }

    if (/^\/api\/crm\/leads\/[^/]+$/.test(pathname)) {
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (pathname === "/api/crm/analytics") {
      const clienteId = url.searchParams.get("cliente_id");
      return route.fulfill(jsonResponse(buildCrmAnalytics(clienteId)));
    }

    if (pathname === "/api/me") {
      return route.fulfill(jsonResponse({ id: FAKE_USER.id, email: FAKE_USER.email }));
    }

    if (pathname === "/api/crm-cliente/auth/me") {
      return route.fulfill(jsonResponse({ ok: true, autenticado: true, token: CLIENTS[0].crm_token, cliente: CLIENTS[0] }));
    }

    if (pathname === "/api/crm-cliente/auth/logout" || pathname === "/api/crm-cliente/auth/check") {
      return route.fulfill(jsonResponse({ ok: true, authenticated: true }));
    }

    if (/^\/api\/crm-cliente\/[^/]+\/leads\/[^/]+$/.test(pathname)) {
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (/^\/api\/crm-cliente\/[^/]+\/leads$/.test(pathname)) {
      return route.fulfill(jsonResponse({ ok: true, leads: LEADS.filter((lead) => lead.cliente_id === CLIENTS[0].id) }));
    }

    if (pathname === "/api/cockpit/decisions" && method === "GET") {
      return route.fulfill(jsonResponse({
        mode: "DECISÃO",
        pending: buildDecisionItems(),
        history: buildDecisionItems().map((item, index) => ({ ...item, id: `${item.id}_hist`, status: index === 0 ? "approved" : "executed" })),
        total_impact_brl: 6200,
        counts: { pause: 0, resume: 0, scale_budget: 1, reduce_budget: 1, alert: 1 },
      }));
    }

    if (pathname === "/api/cockpit/decisions" && method === "POST") {
      return route.fulfill(jsonResponse({ ok: true, generated: true }));
    }

    if (/^\/api\/cockpit\/decisions\/[^/]+\/approve$/.test(pathname) || /^\/api\/cockpit\/decisions\/[^/]+\/reject$/.test(pathname)) {
      return route.fulfill(jsonResponse({ ok: true }));
    }

    if (pathname === "/api/cockpit/settings") {
      return route.fulfill(jsonResponse({
        workspace_id: "ws_demo",
        autopilot_enabled: true,
        auto_pause: true,
        auto_resume: false,
        auto_scale_budget: true,
        auto_reduce_budget: true,
        shield_max_spend_brl: 500,
        max_auto_actions_day: 3,
        updated_at: "2026-04-17T09:00:00.000Z",
      }));
    }

    if (pathname === "/api/intelligence/predict-anomalies") {
      return route.fulfill(jsonResponse(buildPredAlerts()));
    }

    if (pathname === "/api/daily-digest") {
      return route.fulfill(jsonResponse(buildDailyDigest()));
    }

    if (pathname === "/api/strategic-snapshot") {
      return route.fulfill(jsonResponse(buildStrategicSnapshot()));
    }

    if (pathname === "/api/intelligence/network") {
      return route.fulfill(jsonResponse(buildNetwork()));
    }

    if (pathname.startsWith("/api/ena/")) {
      return route.fulfill(jsonResponse({ ok: true, data: [], score: 78, summary: "Dados mock de ENA." }));
    }

    if (pathname === "/api/corretores" || pathname === "/api/campanhas-vincular") {
      return route.fulfill(jsonResponse({ ok: true, corretores: [], campanhas: [] }));
    }

    if (pathname === "/api/public/benchmarks") {
      return route.fulfill(jsonResponse({
        ok: true,
        benchmarks: [
          { segmento: "Saude estetica", cpl_medio: 31, ctr_medio: 1.9, roas_medio: 3.1 },
          { segmento: "Imobiliario", cpl_medio: 39, ctr_medio: 1.5, roas_medio: 2.7 },
        ],
      }));
    }

    if (pathname === "/api/funil-publico") {
      return route.fulfill(jsonResponse({
        ok: true,
        etapas: [
          { nome: "Visitas", total: 1242 },
          { nome: "Leads", total: 164 },
          { nome: "Propostas", total: 52 },
          { nome: "Fechamentos", total: 11 },
        ],
      }));
    }

    if (pathname === "/api/diagnostico" || pathname === "/api/lead-gestor" || pathname === "/api/meta-validate") {
      return route.fulfill(jsonResponse({ ok: true, valid: true, score: 82 }));
    }

    if (pathname === "/api/ai-criativo" || pathname === "/api/ai-copywriter") {
      return route.fulfill(jsonResponse({
        ok: true,
        ideas: [
          { title: "Hook de prova social", copy: "Mostre antes e depois com CTA para WhatsApp." },
          { title: "Oferta com escassez", copy: "Teste criativo com urgencia e objecao quebrada." },
        ],
      }));
    }

    return route.continue();
  });
}

async function waitForApp(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2600);
}

async function dismissOverlays(page) {
  const locators = [
    page.getByRole("button", { name: /aceitar|entendi|ok|fechar|continuar/i }).first(),
    page.getByText(/aceitar/i).first(),
  ];
  for (const locator of locators) {
    try {
      if (await locator.isVisible({ timeout: 500 })) {
        await locator.click({ timeout: 500 });
      }
    } catch {}
  }
}

async function captureRoute(page, item) {
  const target = `${BASE_URL}${item.route}`;
  const filename = `${item.id}.png`;
  try {
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitForApp(page);
    await dismissOverlays(page);
    if (typeof item.action === "function") {
      await item.action(page);
      await page.waitForTimeout(1200);
    }
    await page.screenshot({ path: path.join(IMAGE_DIR, filename), fullPage: true });
    return {
      ...item,
      image: filename,
      finalUrl: page.url(),
      titleTag: await page.title(),
      ok: true,
      note: item.note || "Captura com dados fake.",
    };
  } catch (error) {
    return {
      ...item,
      image: "",
      finalUrl: target,
      titleTag: "",
      ok: false,
      note: error instanceof Error ? error.message : "Falha ao capturar.",
    };
  }
}

function buildHtml(results) {
  const cards = results.map((result) => {
    const body = result.image
      ? `<a href="./images/${result.image}" target="_blank" rel="noreferrer"><img src="./images/${result.image}" alt="${escapeHtml(result.title)}" /></a>`
      : `<div class="empty">Falha na captura</div>`;
    return `
      <article class="card">
        <div class="meta">
          <div>
            <h2>${escapeHtml(result.title)}</h2>
            <p><code>${escapeHtml(result.route)}</code></p>
          </div>
          <span class="pill ${result.ok ? "ok" : "warn"}">${result.ok ? "ok" : "erro"}</span>
        </div>
        ${body}
        <p class="note">${escapeHtml(result.note)}</p>
      </article>
    `;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Erizon - Catálogo Completo com Dados Fake</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07090d;
      --panel: #11161d;
      --line: #243041;
      --text: #eef2f7;
      --muted: #93a0b5;
      --accent: #c084fc;
      --ok: #22c55e;
      --warn: #f59e0b;
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
    main { max-width: 1440px; margin: 0 auto; padding: 32px 24px 64px; }
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
    header p { color: var(--muted); line-height: 1.5; max-width: 900px; }
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
      justify-content: space-between;
      align-items: start;
      gap: 12px;
      margin-bottom: 14px;
    }
    .meta p { color: var(--muted); margin-top: 6px; }
    .pill {
      border-radius: 999px;
      padding: 6px 10px;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.12em;
      font-weight: 700;
      border: 1px solid currentColor;
    }
    .pill.ok { color: var(--ok); }
    .pill.warn { color: var(--warn); }
    img {
      width: 100%;
      display: block;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: #090d13;
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
      <h1>Catálogo completo da Erizon com dados fake</h1>
      <p>Capturas automáticas das principais telas da plataforma usando sessão demonstrativa, Supabase mockado e APIs internas interceptadas. O objetivo é gerar material visual sem expor clientes reais.</p>
      <div class="chips">
        <span>Base URL: <code>${escapeHtml(BASE_URL)}</code></span>
        <span>${results.length} telas</span>
        <span>Dados demonstrativos consistentes</span>
      </div>
    </header>
    <section class="grid">
      ${cards}
    </section>
  </main>
</body>
</html>`;
}

async function main() {
  ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await setupContext(context);
  const page = await context.newPage();

  const results = [];
  for (const item of ROUTES) {
    results.push(await captureRoute(page, item));
  }

  fs.writeFileSync(HTML_FILE, buildHtml(results), "utf8");
  await browser.close();
  console.log(`Catálogo completo gerado em ${HTML_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
