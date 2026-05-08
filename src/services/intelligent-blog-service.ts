import Groq from "groq-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BlogContentType =
  | "seo_educational"
  | "anonymous_case_study"
  | "market_news"
  | "weekly_report"
  | "monthly_report"
  | "performance_insight";

export type BlogPostStatus =
  | "draft"
  | "waiting_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published";

export type IdentificationRiskLevel = "Baixo" | "Médio" | "Alto";

export type FreshnessLevel = "Hoje" | "Esta semana" | "Este mês" | "Atemporal" | "Dados internos";

type SafeCampaignData = {
  anonymized_client_label: string;
  period_start: string;
  period_end: string;
  niche_generic: string;
  region_generic: string;
  investment_range: string;
  main_problem: string;
  detected_signals: string[];
  recommended_actions: string[];
  observed_outcomes: string[];
  anonymized_summary: string;
  identification_risk_level: IdentificationRiskLevel;
};

type ArticleDraft = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  content_type: BlogContentType;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  source_name?: string | null;
  source_url?: string | null;
  source_published_at?: string | null;
  source_checked_at?: string | null;
  freshness_level: FreshnessLevel;
  anonymized: boolean;
  campaign_data_summary?: string | null;
  internal_data_period_start?: string | null;
  internal_data_period_end?: string | null;
};

type MarketSource = {
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  source_published_at?: string | null;
  checked_at: string;
};

type DailyBlogOptions = {
  forcePublish?: boolean;
  preferMarketNews?: boolean;
  skipIfPublishedRecently?: boolean;
};

type GeneratePostOptions = {
  forcePublish?: boolean;
  usedSourceUrls?: Set<string>;
};

type InternalMetricRow = {
  snapshot_date?: string | null;
  spend?: number | string | null;
  ctr?: number | string | null;
  cpl?: number | string | null;
  cpa?: number | string | null;
  roas?: number | string | null;
  frequency?: number | string | null;
  leads?: number | string | null;
  clicks?: number | string | null;
  purchases?: number | string | null;
  revenue?: number | string | null;
};

const MIN_REAL_INTERNAL_ROWS = 3;
const BLOG_CONTENT_YEAR = 2026;
const NO_REAL_DATA_MESSAGE = "Sem dados reais suficientes para gerar estudo anônimo com segurança.";
const DEFAULT_MARKET_RSS_FEEDS = [
  "OpenAI News|https://openai.com/news/rss.xml",
  "Meta Newsroom|https://about.fb.com/news/category/product-news/feed/",
  "Google Ads & Commerce|https://blog.google/products/ads-commerce/rss/",
  "Google Search Central|https://developers.google.com/search/blog/atom.xml",
  "Search Engine Land|https://searchengineland.com/feed",
  "HubSpot Marketing Blog|https://blog.hubspot.com/marketing/rss.xml",
  "Social Media Today|https://www.socialmediatoday.com/feeds/news/",
];

const CONTENT_TYPE_LABELS: Record<BlogContentType, string> = {
  seo_educational: "Conteúdo educativo de SEO",
  anonymous_case_study: "Estudo anônimo",
  market_news: "Notícia do mercado",
  weekly_report: "Relatório semanal",
  monthly_report: "Relatório mensal",
  performance_insight: "Insight de performance",
};

const CATEGORY_BY_TYPE: Record<BlogContentType, string> = {
  seo_educational: "Automação com IA",
  anonymous_case_study: "Estudos anônimos",
  market_news: "Notícias do mercado",
  weekly_report: "Relatórios semanais",
  monthly_report: "Relatórios mensais",
  performance_insight: "Performance",
};

const SAFE_KEYWORDS = [
  "automação de marketing com IA",
  "inteligência artificial para marketing",
  "análise de campanhas",
  "otimização de campanhas",
  "gestão de tráfego com IA",
  "reduzir desperdício de verba",
  "criativo saturado",
  "campanha com CPA alto",
  "escalar campanhas",
  "decisão baseada em dados",
  "performance de marketing",
  "marketing com inteligência artificial",
];

const PROHIBITED_COPY = [
  "resultado garantido",
  "dobre seu faturamento",
  "roas garantido",
  "lucro automático",
  "cresça sem risco",
  "fique rico",
  "ganhe dinheiro dormindo",
];

const IDENTIFIABLE_KEYS = [
  "client_id",
  "account_id",
  "ad_account_id",
  "campaign_id",
  "adset_id",
  "ad_id",
  "platform_account_id",
  "platform_campaign_id",
  "name",
  "nome",
  "nome_campanha",
  "campaign_name",
  "creative_name",
  "url",
  "email",
  "phone",
  "telefone",
  "cnpj",
  "cpf",
  "address",
  "endereco",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 86);
}

function getBrazilDate(input = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.BLOG_TIMEZONE || "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(input);
}

function getDayOfWeek(input = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: process.env.BLOG_TIMEZONE || "America/Sao_Paulo",
    weekday: "long",
  }).format(input);
}

function getMonth(input = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: process.env.BLOG_TIMEZONE || "America/Sao_Paulo",
    month: "long",
  }).format(input);
}

function getBrazilDateTime(input = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: process.env.BLOG_TIMEZONE || "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(input);
}

function freshnessFromDate(value?: string | null): FreshnessLevel {
  if (!value) return "Esta semana";
  const published = new Date(value).getTime();
  if (!Number.isFinite(published)) return "Esta semana";
  const diffDays = Math.floor((Date.now() - published) / 86400000);
  if (diffDays <= 1) return "Hoje";
  if (diffDays <= 7) return "Esta semana";
  return "Este mês";
}

function isSourceFromCurrentBlogYear(source: MarketSource) {
  const date = source.source_published_at || source.checked_at;
  return new Date(date).getFullYear() >= BLOG_CONTENT_YEAR;
}

function toIsoDateOrNull(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function calculateReadingTime(content: string) {
  const words = content.replace(/[#*_`>-]/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(3, Math.ceil(words / 210))} min`;
}

function normalizeStringArray(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return fallback;
}

function rangeCurrency(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Sem faixa segura suficiente";
  if (value < 1000) return "até R$ 1 mil";
  if (value < 5000) return "entre R$ 1 mil e R$ 5 mil";
  if (value < 15000) return "entre R$ 5 mil e R$ 15 mil";
  if (value < 50000) return "entre R$ 15 mil e R$ 50 mil";
  return "acima de R$ 50 mil, sem valor exato";
}

function approximatePercent(value: number) {
  if (!Number.isFinite(value)) return "sem variação segura";
  const rounded = Math.round(value / 5) * 5;
  const sign = rounded > 0 ? "alta" : "queda";
  return `${sign} próxima de ${Math.abs(rounded)}%`;
}

function stripSensitiveStrings(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[removido]")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[removido]")
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[removido]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[removido]")
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[removido]");
}

export function anonymizeCampaignData(rawData: Record<string, unknown> | Record<string, unknown>[]): SafeCampaignData {
  const rows = Array.isArray(rawData) ? rawData : [rawData];
  const firstRawRow = rows[0] ?? {};
  const lastRawRow = rows[rows.length - 1] ?? firstRawRow;
  const safeRows = rows.map((row) => {
    const clean: Record<string, unknown> = {};
    Object.entries(row ?? {}).forEach(([key, value]) => {
      if (IDENTIFIABLE_KEYS.includes(key.toLowerCase())) return;
      clean[key] = typeof value === "string" ? stripSensitiveStrings(value) : value;
    });
    return clean;
  });

  const totalSpend = safeRows.reduce((sum, row) => sum + Number(row.spend ?? row.investimento ?? 0), 0);
  const avgCtr = safeRows.reduce((sum, row) => sum + Number(row.ctr ?? 0), 0) / Math.max(1, safeRows.length);
  const avgCpa = safeRows.reduce((sum, row) => sum + Number(row.cpa ?? row.cpl ?? 0), 0) / Math.max(1, safeRows.length);
  const avgFrequency = safeRows.reduce((sum, row) => sum + Number(row.frequency ?? row.frequencia ?? 0), 0) / Math.max(1, safeRows.length);
  const avgRoas = safeRows.reduce((sum, row) => sum + Number(row.roas ?? 0), 0) / Math.max(1, safeRows.length);

  const detectedSignals = [
    avgFrequency >= 3 ? "Frequência acima da zona confortável para leitura criativa." : "Frequência em faixa controlada.",
    avgCtr > 0 && avgCtr < 1 ? "CTR abaixo do patamar desejado para a etapa analisada." : "CTR sem queda crítica nos dados agregados.",
    avgCpa > 0 ? "CPA/CPL exige acompanhamento por tendência, não por valor isolado." : "Volume de conversão insuficiente para leitura de CPA/CPL.",
    avgRoas > 0 && avgRoas < 1.5 ? "Retorno agregado abaixo da meta de eficiência observada." : "Retorno agregado sem sinal extremo.",
  ];

  const mainProblem = avgFrequency >= 3
    ? "Saturação criativa em formação"
    : avgCtr > 0 && avgCtr < 1
      ? "Perda de atratividade no clique"
      : avgCpa > 0
        ? "Eficiência de aquisição sob pressão"
        : "Necessidade de leitura por dados agregados";

  const today = getBrazilDate();

  return {
    anonymized_client_label: `Conta anonimizada ${Math.max(3, safeRows.length)}`,
    period_start: String(firstRawRow.snapshot_date ?? firstRawRow.period_start ?? today),
    period_end: String(lastRawRow.snapshot_date ?? lastRawRow.period_end ?? today),
    niche_generic: String(safeRows[0]?.niche_generic ?? safeRows[0]?.nicho ?? "Negócio digital ou serviço recorrente"),
    region_generic: "Brasil, sem recorte local identificável",
    investment_range: rangeCurrency(totalSpend),
    main_problem: mainProblem,
    detected_signals: detectedSignals,
    recommended_actions: [
      "Revisar criativos por fadiga antes de ampliar verba.",
      "Comparar tendência de CTR, frequência e CPA/CPL em conjunto.",
      "Redistribuir orçamento apenas quando houver sinal consistente.",
    ],
    observed_outcomes: [
      "Melhor clareza sobre gargalos de campanha.",
      "Menos decisões baseadas em um único indicador.",
      "Priorização de testes com menor risco operacional.",
    ],
    anonymized_summary: `Dados agregados de campanha com ${rangeCurrency(totalSpend)}, ${approximatePercent(avgCtr)} em CTR relativo e frequência média em faixa aproximada de ${Math.round(avgFrequency * 10) / 10}.`,
    identification_risk_level: "Baixo",
  };
}

export function calculateIdentificationRisk(content: string): {
  level: IdentificationRiskLevel;
  notes: string[];
  suggestions: string[];
  correctedContent: string;
} {
  const notes: string[] = [];
  const suggestions: string[] = [];
  let correctedContent = content;

  const checks: Array<[RegExp, string, string]> = [
    [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "E-mail encontrado.", "Remover e-mails do conteúdo público."],
    [/https?:\/\/\S+|www\.\S+/gi, "URL encontrada.", "Substituir URLs de clientes por referência genérica."],
    [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "CNPJ encontrado.", "Remover documentos empresariais."],
    [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "CPF encontrado.", "Remover documentos pessoais."],
    [/\+?\d[\d\s().-]{8,}\d/g, "Telefone ou número longo encontrado.", "Remover telefones, IDs e números rastreáveis."],
    [/\b(?:id|account|campanha|adset|ad|criativo)[\s:_-]*[a-z0-9-]{6,}\b/gi, "Possível ID ou nome técnico rastreável.", "Trocar identificadores por categorias genéricas."],
    [/\bR\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?\b/g, "Valor monetário exato encontrado.", "Usar faixas de investimento ou percentuais aproximados."],
    [/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "Data exata encontrada.", "Usar período genérico quando houver risco."],
  ];

  checks.forEach(([regex, note, suggestion]) => {
    if (regex.test(content)) {
      notes.push(note);
      suggestions.push(suggestion);
      correctedContent = correctedContent.replace(regex, "[informação removida]");
    }
  });

  PROHIBITED_COPY.forEach((term) => {
    const regex = new RegExp(term, "gi");
    if (regex.test(content)) {
      notes.push(`Promessa ou copy proibida encontrada: ${term}.`);
      suggestions.push("Trocar promessas por linguagem de clareza, controle e decisão baseada em dados.");
      correctedContent = correctedContent.replace(regex, "mais clareza para decidir");
    }
  });

  const properNameMatches = content.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+){1,3}\b/g) ?? [];
  const allowed = new Set(["Equipe Erizon", "Erizon AI", "Meta Ads", "Google Ads", "Brasil"]);
  const suspiciousNames = properNameMatches.filter((name) => !allowed.has(name));
  if (suspiciousNames.length > 2) {
    notes.push("Há muitos nomes próprios ou entidades no conteúdo.");
    suggestions.push("Revisar nomes próprios e substituir por setor, canal ou perfil genérico.");
  }

  const level: IdentificationRiskLevel = notes.length >= 4 ? "Alto" : notes.length >= 2 ? "Médio" : "Baixo";

  return {
    level,
    notes: notes.length ? notes : ["Nenhum identificador sensível óbvio foi encontrado."],
    suggestions: suggestions.length ? suggestions : ["Manter revisão humana antes da publicação."],
    correctedContent,
  };
}

export class MarketNewsService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getLatestVerifiedSource(excludedUrls = new Set<string>()): Promise<MarketSource | null> {
    const [manualSource, rssSource] = await Promise.all([
      this.getLatestManualSources(),
      this.getLatestRssSources(),
    ]);

    const sources = [...manualSource, ...rssSource]
      .filter(isSourceFromCurrentBlogYear)
      .filter((source) => !excludedUrls.has(normalizeSourceUrl(source.source_url)))
      .sort((a, b) => new Date(b.source_published_at ?? b.checked_at).getTime() - new Date(a.source_published_at ?? a.checked_at).getTime());

    return sources[0] ?? null;
  }

  private async getLatestManualSources(): Promise<MarketSource[]> {
    const { data, error } = await this.supabase
      .from("blog_market_sources")
      .select("title, summary, source_name, source_url, source_published_at, checked_at, approved")
      .eq("approved", true)
      .order("source_published_at", { ascending: false })
      .limit(10);

    if (error) return [];
    return (data ?? [])
      .filter((row) => row.source_url && row.source_name)
      .map((row) => ({
        title: row.title,
        summary: row.summary,
        source_name: row.source_name,
        source_url: row.source_url,
        source_published_at: row.source_published_at,
        checked_at: row.checked_at ?? new Date().toISOString(),
      }));
  }

  private async getLatestRssSources(): Promise<MarketSource[]> {
    const feeds = getConfiguredRssFeeds();
    if (feeds.length === 0) return [];

    const results = await Promise.allSettled(feeds.map((feed) => fetchRssFeed(feed)));
    const sources = results
      .filter((result): result is PromiseFulfilledResult<MarketSource[]> => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .sort((a, b) => new Date(b.source_published_at ?? b.checked_at).getTime() - new Date(a.source_published_at ?? a.checked_at).getTime());

    return sources;
  }
}

function normalizeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

function getConfiguredRssFeeds() {
  const raw = process.env.BLOG_MARKET_RSS_FEEDS?.trim();
  const entries = raw ? raw.split(",") : DEFAULT_MARKET_RSS_FEEDS;
  return entries
    .map((entry) => {
      const [name, url] = entry.split("|").map((part) => part.trim());
      return name && url ? { name, url } : null;
    })
    .filter((entry): entry is { name: string; url: string } => Boolean(entry));
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function pickTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

async function fetchRssFeed(feed: { name: string; url: string }): Promise<MarketSource[]> {
  const response = await fetch(feed.url, {
    headers: {
      accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      "user-agent": "ErizonAI-BlogIntelligence/1.0",
    },
    next: { revalidate: 1800 },
  });

  if (!response.ok) return [];

  const xml = await response.text();
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  const parsed: Array<MarketSource | null> = items.map((item) => {
    const title = pickTag(item, "title");
    const link = pickTag(item, "link") || item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || "";
    const summary = pickTag(item, "description") || pickTag(item, "summary") || pickTag(item, "content");
    const published = pickTag(item, "pubDate") || pickTag(item, "published") || pickTag(item, "updated");
    const publishedAt = toIsoDateOrNull(published);

    return title && link
      ? {
          title,
          summary: summary || title,
          source_name: feed.name,
          source_url: link,
          source_published_at: publishedAt,
          checked_at: new Date().toISOString(),
        }
      : null;
  });

  return parsed
    .filter((source): source is MarketSource => Boolean(source))
    .sort((a, b) => new Date(b.source_published_at ?? b.checked_at).getTime() - new Date(a.source_published_at ?? a.checked_at).getTime())
    .slice(0, 5);
}

function fallbackArticle(type: BlogContentType, safeData?: SafeCampaignData, source?: MarketSource | null): ArticleDraft {
  const today = getBrazilDate();
  const category = CATEGORY_BY_TYPE[type];
  const titleByType: Record<BlogContentType, string> = {
    seo_educational: "Como usar inteligência artificial para reduzir desperdício de verba em campanhas",
    anonymous_case_study: `Estudo anônimo: ${safeData?.main_problem ?? "sinais de campanha que pedem atenção"}`,
    market_news: source ? `O que ${source.title} muda para campanhas de performance` : "Como acompanhar tendências de marketing sem inventar notícias",
    weekly_report: "Resumo da semana: principais sinais observados em campanhas",
    monthly_report: "Relatório mensal: padrões de performance e decisões com mais controle",
    performance_insight: "Como decidir o próximo movimento quando CPA, CTR e verba contam histórias diferentes",
  };
  const title = titleByType[type];
  const intro = type === "market_news" && source
    ? `Este artigo parte de uma fonte verificada: ${source.source_name}. A análise abaixo evita extrapolações e foca no impacto prático para marketing, campanhas e dados.`
    : "Este artigo foi preparado para apoiar decisões de marketing com mais clareza, menos desperdício de verba e leitura mais consistente dos sinais.";

  const dataBlock = safeData
    ? `\n\n## Sinais anonimizados observados\n\n- Setor genérico: ${safeData.niche_generic}\n- Região: ${safeData.region_generic}\n- Faixa de investimento: ${safeData.investment_range}\n- Problema principal: ${safeData.main_problem}\n- Resumo seguro: ${safeData.anonymized_summary}\n\n### Ações recomendadas\n\n${safeData.recommended_actions.map((item) => `- ${item}`).join("\n")}`
    : "";

  const sourceBlock = source
    ? `\n\n## O que mudou\n\n${source.summary}\n\n## Por que isso importa\n\nMudanças de mercado afetam leitura de dados, qualidade dos sinais e ritmo de testes. A melhor resposta não é reagir com pressa, mas revisar hipóteses, segmentação, criativos e mensuração com base em evidências.`
    : "";

  const content = `# ${title}\n\n${intro}\n\n## Leitura estratégica\n\nCampanhas saudáveis dependem de decisões que combinam contexto, métrica e tempo. Um CPA alto isolado pode indicar problema de oferta, criativo, público ou mensuração. Um CTR em queda pode apontar fadiga, mas também pode ser reflexo de mudança de audiência ou etapa do funil.\n\n### O que observar antes de agir\n\n- Tendência de CTR, frequência e custo ao longo do período.\n- Relação entre volume de cliques, leads e compras.\n- Mudanças recentes em criativos, verba ou etapa do funil.\n- Sinais de saturação antes de decisões bruscas.\n${dataBlock}${sourceBlock}\n\n## Aprendizado prático\n\nO ponto central é evitar decisões automáticas baseadas em uma métrica isolada. A Erizon organiza sinais de campanha para que gestores e empresas enxerguem gargalos, priorizem testes e decidam o próximo movimento com mais segurança.\n\n## Conclusão\n\nMarketing com inteligência artificial funciona melhor quando combina automação, revisão humana e cuidado com dados. Use a IA para ampliar leitura e velocidade, mas mantenha privacidade, precisão e critério editorial no centro.\n\nConheça a Erizon AI para transformar dados de campanha em decisões com mais controle.`;

  return {
    title,
    slug: `${slugify(title)}-${today}`,
    excerpt: "Análise estratégica da Erizon AI para melhorar leitura de campanha, reduzir desperdício de verba e apoiar decisões baseadas em dados.",
    content,
    category,
    content_type: type,
    seo_title: `${title} | Erizon AI`,
    seo_description: "Conteúdo da Erizon AI sobre IA, marketing de performance, dados de campanhas e decisões com mais controle.",
    seo_keywords: SAFE_KEYWORDS.slice(0, 6),
    source_name: source?.source_name ?? null,
    source_url: source?.source_url ?? null,
    source_published_at: source?.source_published_at ?? null,
    source_checked_at: source?.checked_at ?? null,
    freshness_level: type === "market_news" ? freshnessFromDate(source?.source_published_at) : type.includes("report") ? "Dados internos" : "Atemporal",
    anonymized: type === "anonymous_case_study" || type === "weekly_report" || type === "monthly_report",
    campaign_data_summary: safeData?.anonymized_summary ?? null,
    internal_data_period_start: safeData?.period_start ?? null,
    internal_data_period_end: safeData?.period_end ?? null,
  };
}

async function generateWithGroq(type: BlogContentType, safeData?: SafeCampaignData, source?: MarketSource | null): Promise<ArticleDraft | null> {
  if (!process.env.GROQ_API_KEY) return null;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const sourceText = source ? JSON.stringify(source, null, 2) : "Nenhuma fonte verificada disponível.";
  const safeDataText = safeData ? JSON.stringify(safeData, null, 2) : "Sem dados internos seguros para este rascunho.";

  const prompt = `Você é especialista em marketing de performance, inteligência artificial, SEO e análise de campanhas.

Crie um artigo em português do Brasil para o blog da Erizon AI.

Tipo de conteúdo:
${CONTENT_TYPE_LABELS[type]}

Dia da semana:
${getDayOfWeek()}

Mês:
${getMonth()}

Data atual:
${getBrazilDateTime()}

Dados disponíveis:
${safeDataText}

Fontes disponíveis, se houver:
${sourceText}

Regras obrigatórias:
- Use somente contexto de ${BLOG_CONTENT_YEAR}. Não use notícias, datas ou tendências de 2025 como se fossem atuais.
- Não invente notícias sem fonte.
- Não exponha nomes de clientes.
- Não cite marcas, empresas, campanhas, cidades específicas ou dados sensíveis.
- Não use valores exatos se houver risco.
- Use dados anonimizados, tendências, percentuais aproximados e aprendizados.
- Não prometa resultado garantido.
- Todo texto deve estar em português do Brasil.
- A copy deve ser direta, clara e estratégica.
- O conteúdo deve gerar autoridade para a Erizon.
- O conteúdo deve ter CTA final para conhecer a Erizon.

Retorne apenas JSON válido com:
title, slug, excerpt, content, category, seo_title, seo_description, seo_keywords.`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.45,
    max_tokens: 3200,
    messages: [
      { role: "system", content: "Você escreve em português do Brasil e obedece regras de privacidade, LGPD e SEO. Retorne apenas JSON válido." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    const fallback = fallbackArticle(type, safeData, source);
    return {
      ...fallback,
      ...parsed,
      slug: slugify(parsed.slug || parsed.title || fallback.title),
      content_type: type,
      source_name: source?.source_name ?? null,
      source_url: source?.source_url ?? null,
      source_published_at: source?.source_published_at ?? null,
      source_checked_at: source?.checked_at ?? null,
      freshness_level: fallback.freshness_level,
      anonymized: fallback.anonymized,
      campaign_data_summary: fallback.campaign_data_summary,
      internal_data_period_start: fallback.internal_data_period_start,
      internal_data_period_end: fallback.internal_data_period_end,
    };
  } catch {
    return null;
  }
}

function hasEnoughRealSignal(rows: InternalMetricRow[] | null | undefined) {
  if (!rows || rows.length < MIN_REAL_INTERNAL_ROWS) return false;
  const rowsWithSignal = rows.filter((row) =>
    Number(row.spend ?? 0) > 0 ||
    Number(row.clicks ?? 0) > 0 ||
    Number(row.leads ?? 0) > 0 ||
    Number(row.purchases ?? 0) > 0 ||
    Number(row.revenue ?? 0) > 0
  );
  return rowsWithSignal.length >= MIN_REAL_INTERNAL_ROWS;
}

function rowsWithRealSignal(rows: InternalMetricRow[]) {
  return rows.filter((row) =>
    Number(row.spend ?? 0) > 0 ||
    Number(row.clicks ?? 0) > 0 ||
    Number(row.leads ?? 0) > 0 ||
    Number(row.purchases ?? 0) > 0 ||
    Number(row.revenue ?? 0) > 0
  );
}

async function getDailySnapshotRows(supabase: SupabaseClient, since: string): Promise<InternalMetricRow[] | null> {
  const { data, error } = await supabase
    .from("campaign_snapshots_daily")
    .select("snapshot_date, spend, ctr, cpl, cpa, roas, frequency, leads, clicks, purchases, revenue")
    .gte("snapshot_date", since)
    .order("snapshot_date", { ascending: true })
    .limit(60);

  if (error || !data) return null;
  return data as InternalMetricRow[];
}

async function getPerfSnapshotRows(supabase: SupabaseClient, since: string): Promise<InternalMetricRow[] | null> {
  const { data, error } = await supabase
    .from("campaign_perf_snapshots")
    .select("snapshot_date, spend, ctr, cpl, roas, frequency, leads, clicks, revenue")
    .gte("snapshot_date", since)
    .order("snapshot_date", { ascending: true })
    .limit(60);

  if (error || !data) return null;
  return (data as InternalMetricRow[]).map((row) => ({
    ...row,
    cpa: row.cpl ?? 0,
    purchases: 0,
  }));
}

async function getInternalSafeData(supabase: SupabaseClient, daysBack: number): Promise<SafeCampaignData | null> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dailyRows = await getDailySnapshotRows(supabase, since);

  if (hasEnoughRealSignal(dailyRows)) {
    return anonymizeCampaignData(rowsWithRealSignal(dailyRows ?? []));
  }

  const perfRows = await getPerfSnapshotRows(supabase, since);
  if (!hasEnoughRealSignal(perfRows)) return null;

  return anonymizeCampaignData(rowsWithRealSignal(perfRows ?? []));
}

function typeForToday(date = new Date()): BlogContentType {
  const day = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.BLOG_TIMEZONE || "America/Sao_Paulo",
    weekday: "short",
  }).format(date).replace(/Sun|Mon|Tue|Wed|Thu|Fri|Sat/, (match) => String(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(match))));

  const map: Record<number, BlogContentType> = {
    0: "weekly_report",
    1: "seo_educational",
    2: "anonymous_case_study",
    3: "market_news",
    4: "anonymous_case_study",
    5: "performance_insight",
    6: "seo_educational",
  };
  return map[day] ?? "seo_educational";
}

function canAutoPublish(risk: IdentificationRiskLevel, content: string, forcePublish = false) {
  const autoPublishEnabled = process.env.BLOG_AUTO_PUBLISH === "true" || process.env.auto_publish_enabled === "true";
  if (!autoPublishEnabled && !forcePublish) return false;
  if (risk === "Alto") return false;
  return !PROHIBITED_COPY.some((term) => content.toLowerCase().includes(term));
}

async function getPublishedSourceUrls(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("source_url")
    .not("source_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) return new Set<string>();
  return new Set((data ?? []).map((row) => normalizeSourceUrl(String(row.source_url ?? ""))).filter(Boolean));
}

async function getRecentPublishedAutoPost(supabase: SupabaseClient) {
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, published_at, source_name, source_url")
    .eq("published", true)
    .eq("gerado_por_ia", true)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}

async function saveGenerationLog(supabase: SupabaseClient, payload: Record<string, unknown>) {
  await supabase.from("blog_generation_logs").insert(payload);
}

export class IntelligentBlogService {
  constructor(private readonly supabase: SupabaseClient) {}

  async generateDailyBlogDraft(options: DailyBlogOptions = {}) {
    if (options.skipIfPublishedRecently) {
      const recent = await getRecentPublishedAutoPost(this.supabase);
      if (recent) {
        return {
          post: recent,
          skipped: true,
          reason: "Ja existe post automatico publicado nas ultimas 20 horas.",
        };
      }
    }

    const usedSourceUrls = await getPublishedSourceUrls(this.supabase);
    if (options.preferMarketNews) {
      const news = await this.generateMarketNewsPost({
        forcePublish: options.forcePublish,
        usedSourceUrls,
      });
      if (news?.post) return news;
    }

    const requestedType = typeForToday();
    if (requestedType === "market_news") {
      const news = await this.generateMarketNewsPost({
        forcePublish: options.forcePublish,
        usedSourceUrls,
      });
      if (news?.post) return news;
      return this.generatePost("seo_educational", 14, null, { forcePublish: options.forcePublish });
    }
    if (requestedType === "anonymous_case_study") {
      const study = await this.generateAnonymousCaseStudy({ forcePublish: options.forcePublish });
      if (study?.post) return study;
      return this.generatePost("seo_educational", 14, null, { forcePublish: options.forcePublish });
    }
    const generated = await this.generatePost(requestedType, 14, null, { forcePublish: options.forcePublish });
    if (generated?.post || requestedType === "seo_educational" || requestedType === "performance_insight") return generated;
    return this.generatePost("seo_educational", 14, null, { forcePublish: options.forcePublish });
  }

  async generateAnonymousCaseStudy(options: GeneratePostOptions = {}) {
    return this.generatePost("anonymous_case_study", 14, null, options);
  }

  async generateWeeklyReport(options: GeneratePostOptions = {}) {
    return this.generatePost("weekly_report", 7, null, options);
  }

  async generateMonthlyReport(options: GeneratePostOptions = {}) {
    return this.generatePost("monthly_report", 31, null, options);
  }

  async generateMarketNewsPost(options: GeneratePostOptions = {}) {
    const newsService = new MarketNewsService(this.supabase);
    const source = await newsService.getLatestVerifiedSource(options.usedSourceUrls);
    if (!source) {
      await saveGenerationLog(this.supabase, {
        action: "generate_market_news",
        status: "skipped",
        content_type: "market_news",
        notes: "Nenhuma fonte real aprovada disponível. Notícia não gerada para evitar informação falsa.",
      });
      return { post: null, skipped: true, reason: "Nenhuma fonte real aprovada disponível." };
    }
    return this.generatePost("market_news", 7, source, options);
  }

  private async generatePost(type: BlogContentType, daysBack = 14, source?: MarketSource | null, options: GeneratePostOptions = {}) {
    const safeData = ["anonymous_case_study", "weekly_report", "monthly_report", "performance_insight"].includes(type)
      ? await getInternalSafeData(this.supabase, daysBack)
      : undefined;

    if (["anonymous_case_study", "weekly_report", "monthly_report"].includes(type) && !safeData) {
      await saveGenerationLog(this.supabase, {
        action: `generate_${type}`,
        status: "skipped",
        content_type: type,
        notes: NO_REAL_DATA_MESSAGE,
      });

      return {
        post: null,
        skipped: true,
        reason: NO_REAL_DATA_MESSAGE,
      };
    }

    if (type === "performance_insight" && !safeData) {
      return this.generatePost("seo_educational", 14, null, options);
    }

    let aiDraft: ArticleDraft | null = null;
    try {
      aiDraft = await generateWithGroq(type, safeData, source);
    } catch (error) {
      console.error(`[blog/groq/${type}]`, error);
    }
    const draft = aiDraft ?? fallbackArticle(type, safeData, source);
    const risk = calculateIdentificationRisk(`${draft.title}\n${draft.excerpt}\n${draft.content}`);
    const publish = canAutoPublish(risk.level, draft.content, options.forcePublish);
    const status: BlogPostStatus = publish ? "published" : "waiting_review";
    const now = new Date().toISOString();
    const slug = `${slugify(draft.slug || draft.title)}-${Date.now().toString(36)}`;

    const seoKeywords = normalizeStringArray(draft.seo_keywords, SAFE_KEYWORDS.slice(0, 6));

    const insertPayload = {
      title: draft.title,
      slug,
      excerpt: draft.excerpt,
      description: draft.excerpt,
      content: risk.level === "Alto" ? risk.correctedContent : draft.content,
      category: draft.category,
      content_type: draft.content_type,
      status,
      published: status === "published",
      featured: false,
      author_name: "Equipe Erizon",
      author: "Equipe Erizon",
      reading_time: calculateReadingTime(draft.content),
      read_time: calculateReadingTime(draft.content),
      seo_title: draft.seo_title,
      seo_description: draft.seo_description,
      seo_keywords: seoKeywords,
      tags: seoKeywords,
      source_name: draft.source_name,
      source_url: draft.source_url,
      source_published_at: draft.source_published_at,
      source_checked_at: draft.source_checked_at,
      freshness_level: draft.freshness_level,
      anonymized: draft.anonymized,
      identification_risk_level: risk.level,
      identification_risk_notes: `${risk.notes.join("\n")} Sugestões: ${risk.suggestions.join(" ")}`,
      campaign_data_summary: draft.campaign_data_summary,
      internal_data_period_start: draft.internal_data_period_start,
      internal_data_period_end: draft.internal_data_period_end,
      published_at: status === "published" ? now : null,
      publicado_em: now,
      created_at: now,
      updated_at: now,
      atualizado_em: now,
      gerado_por_ia: true,
    };

    const { data, error } = await this.supabase.from("blog_posts").insert(insertPayload).select("*").single();
    if (error) throw error;

    if (safeData && type === "anonymous_case_study") {
      await this.supabase.from("anonymous_campaign_insights").insert(safeData);
    }

    await saveGenerationLog(this.supabase, {
      blog_post_id: data.id,
      action: `generate_${type}`,
      status,
      content_type: type,
      identification_risk_level: risk.level,
      notes: risk.notes.join("\n"),
    });

    return { post: data, skipped: false, risk };
  }
}
