import { createServerSupabase } from "@/lib/supabase/server";

export type BenchmarkStatus = "winning" | "median" | "attention" | "unknown";

export type MetricBand = {
  p25: number | null;
  p50: number | null;
  p75: number | null;
  unit: "BRL" | "%" | "x";
};

export type MarketBenchmark = {
  niche: string;
  campaignType: string;
  platform: string;
  country: string;
  periodStart: string | null;
  periodEnd: string | null;
  sampleSize: number | null;
  confidence: number;
  sourceName: string;
  sourceUrl: string | null;
  sourceNote: string | null;
  metrics: {
    cpl: MetricBand;
    roas: MetricBand;
    ctr: MetricBand;
    cpm: MetricBand;
    cpc: MetricBand;
    frequency: MetricBand;
  };
};

export type CampaignClassification = {
  niche: string;
  campaignType: string;
  confidence: number;
  reasons: string[];
};

export type CampaignBenchmarkComparison = {
  id: string;
  nomeCampanha: string;
  niche: string;
  campaignType: string;
  confidence: number;
  metrics: {
    spend: number;
    leads: number;
    revenue: number;
    cpl: number | null;
    roas: number | null;
    ctr: number | null;
    cpm: number | null;
    cpc: number | null;
    frequency: number | null;
  };
  internal: {
    cplStatus: BenchmarkStatus;
    ctrStatus: BenchmarkStatus;
    roasStatus: BenchmarkStatus;
  };
  market: {
    available: boolean;
    benchmark: MarketBenchmark | null;
    cplStatus: BenchmarkStatus;
    ctrStatus: BenchmarkStatus;
    roasStatus: BenchmarkStatus;
    sourceLabel: string | null;
  };
};

type CampaignRow = {
  id: string;
  nome_campanha: string | null;
  cliente_id: string | null;
  meta_campaign_id: string | null;
  plataforma: string | null;
  objective: string | null;
  gasto_total: number | null;
  contatos: number | null;
  receita_estimada: number | null;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  frequencia: number | null;
  status: string | null;
};

type ClientRow = {
  id: string;
  niche: string | null;
  nome: string | null;
};

type OverrideRow = {
  campaign_metric_id: string | null;
  meta_campaign_id: string | null;
  niche: string;
  campaign_type: string | null;
};

type WorkspaceRow = {
  id: string;
  niche: string | null;
  owner_user_id: string | null;
};

const ACTIVE_STATUSES = ["ATIVO", "ACTIVE", "ATIVA"];

const NICHE_KEYWORDS: Record<string, string[]> = {
  ecommerce: ["ecommerce", "e-commerce", "loja", "shop", "produto", "catalogo", "checkout", "compra"],
  imobiliario: ["imovel", "imobiliario", "apartamento", "casa", "condominio", "lancamento", "mcmv", "alto padrao"],
  saude_beleza: ["clinica", "medico", "odont", "estetica", "beleza", "saude", "harmonizacao", "botox", "dermato"],
  educacao: ["curso", "escola", "faculdade", "ead", "mentoria", "aula", "treinamento", "formacao"],
  infoprodutos: ["infoproduto", "webinar", "lancamento", "plr", "ebook", "hotmart", "kiwify", "aula gratuita"],
  servicos_locais: ["servico", "orcamento", "agenda", "local", "bairro", "regiao", "delivery"],
  financeiro: ["financiamento", "credito", "seguro", "consorcio", "investimento", "emprestimo", "banco"],
  juridico: ["advogado", "juridico", "previdenciario", "trabalhista", "tributario", "divorcio"],
  turismo: ["hotel", "pousada", "viagem", "turismo", "pacote", "reserva"],
  automotivo: ["carro", "veiculo", "seminovo", "oficina", "auto", "concessionaria"],
  b2b_saas: ["saas", "software", "b2b", "demo", "crm", "erp", "plataforma"],
  restaurantes: ["restaurante", "bar", "hamburguer", "pizza", "cardapio", "ifood"],
};

const TYPE_KEYWORDS: Record<string, string[]> = {
  leads: ["lead", "cadastro", "formulario", "captacao", "contato", "orçamento", "orcamento"],
  vendas: ["venda", "compra", "purchase", "checkout", "catalogo", "produto"],
  mensagens: ["whatsapp", "wpp", "mensagem", "inbox", "direct", "chat"],
  trafego: ["trafego", "traffic", "visita", "clique", "link"],
  retargeting: ["remarketing", "retargeting", "retarget", "quente", "abandono"],
  video: ["video", "view", "reels", "stories", "visualizacao"],
  alcance: ["alcance", "reach", "awareness", "reconhecimento"],
  engajamento: ["engajamento", "curtida", "comentario", "post", "social"],
};

function normalize(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function lowerIsBetter(value: number | null, p25: number | null, p75: number | null): BenchmarkStatus {
  if (value === null || p25 === null || p75 === null) return "unknown";
  if (value <= p25) return "winning";
  if (value >= p75) return "attention";
  return "median";
}

function higherIsBetter(value: number | null, p25: number | null, p75: number | null): BenchmarkStatus {
  if (value === null || p25 === null || p75 === null) return "unknown";
  if (value >= p75) return "winning";
  if (value <= p25) return "attention";
  return "median";
}

function statusAgainstAverage(value: number | null, average: number | null, lowerBetter = false): BenchmarkStatus {
  if (value === null || average === null || average <= 0) return "unknown";
  if (lowerBetter) return value <= average ? "winning" : "attention";
  return value >= average ? "winning" : "attention";
}

export class BenchmarkMarketIntelligenceService {
  private db = createServerSupabase();

  async getCampaignComparisons(workspaceId: string): Promise<{
    marketBenchmark: MarketBenchmark | null;
    campaignComparisons: CampaignBenchmarkComparison[];
    detectedNiches: Array<{ niche: string; campaigns: number; confidence: number }>;
  }> {
    const workspace = await this.getWorkspace(workspaceId);
    const ownerUserId = workspace?.owner_user_id ?? workspaceId;
    const workspaceNiche = workspace?.niche ?? "geral";

    const { data: campaigns } = await this.db
      .from("metricas_ads")
      .select("id,nome_campanha,cliente_id,meta_campaign_id,plataforma,objective,gasto_total,contatos,receita_estimada,ctr,cpm,cpc,frequencia,status")
      .eq("user_id", ownerUserId)
      .in("status", ACTIVE_STATUSES);

    const rows = ((campaigns ?? []) as CampaignRow[]).filter((row) => Number(row.gasto_total ?? 0) > 0);
    const clientIds = Array.from(new Set(rows.map((row) => row.cliente_id).filter(Boolean))) as string[];

    const [clients, overrides] = await Promise.all([
      this.getClients(clientIds),
      this.getOverrides(workspaceId),
    ]);

    const clientMap = new Map(clients.map((client) => [client.id, client]));
    const overrideById = new Map(overrides.filter((item) => item.campaign_metric_id).map((item) => [String(item.campaign_metric_id), item]));
    const overrideByMetaId = new Map(overrides.filter((item) => item.meta_campaign_id).map((item) => [String(item.meta_campaign_id), item]));

    const metrics = this.internalMetrics(rows);
    const marketCache = new Map<string, MarketBenchmark | null>();
    const comparisons: CampaignBenchmarkComparison[] = [];

    for (const campaign of rows) {
      const override = overrideById.get(campaign.id) ?? overrideByMetaId.get(String(campaign.meta_campaign_id ?? ""));
      const client = campaign.cliente_id ? clientMap.get(campaign.cliente_id) : undefined;
      const classification = this.classifyCampaign(campaign, {
        workspaceNiche,
        clientNiche: client?.niche ?? null,
        overrideNiche: override?.niche ?? null,
        overrideType: override?.campaign_type ?? null,
      });
      const platform = normalize(campaign.plataforma || "meta") || "meta";
      const marketKey = `${classification.niche}:${classification.campaignType}:${platform}`;

      if (!marketCache.has(marketKey)) {
        marketCache.set(
          marketKey,
          await this.getMarketBenchmark({
            niche: classification.niche,
            campaignType: classification.campaignType,
            platform,
          })
        );
      }

      const market = marketCache.get(marketKey) ?? null;
      const spend = Number(campaign.gasto_total ?? 0);
      const leads = Number(campaign.contatos ?? 0);
      const revenue = Number(campaign.receita_estimada ?? 0);
      const cpl = spend > 0 && leads > 0 ? spend / leads : null;
      const roas = spend > 0 && revenue > 0 ? revenue / spend : null;
      const ctr = Number(campaign.ctr ?? 0) || null;
      const cpm = Number(campaign.cpm ?? 0) || null;
      const cpc = Number(campaign.cpc ?? 0) || null;
      const frequency = Number(campaign.frequencia ?? 0) || null;

      comparisons.push({
        id: campaign.id,
        nomeCampanha: campaign.nome_campanha ?? "Campanha",
        niche: classification.niche,
        campaignType: classification.campaignType,
        confidence: classification.confidence,
        metrics: { spend, leads, revenue, cpl, roas, ctr, cpm, cpc, frequency },
        internal: {
          cplStatus: statusAgainstAverage(cpl, metrics.avgCpl, true),
          ctrStatus: statusAgainstAverage(ctr, metrics.avgCtr, false),
          roasStatus: statusAgainstAverage(roas, metrics.avgRoas, false),
        },
        market: {
          available: Boolean(market),
          benchmark: market,
          cplStatus: market ? lowerIsBetter(cpl, market.metrics.cpl.p25, market.metrics.cpl.p75) : "unknown",
          ctrStatus: market ? higherIsBetter(ctr, market.metrics.ctr.p25, market.metrics.ctr.p75) : "unknown",
          roasStatus: market ? higherIsBetter(roas, market.metrics.roas.p25, market.metrics.roas.p75) : "unknown",
          sourceLabel: market ? `${market.sourceName}${market.periodEnd ? ` (${market.periodEnd.slice(0, 4)})` : ""}` : null,
        },
      });
    }

    const nicheAgg = new Map<string, { campaigns: number; confidenceSum: number }>();
    for (const item of comparisons) {
      const current = nicheAgg.get(item.niche) ?? { campaigns: 0, confidenceSum: 0 };
      nicheAgg.set(item.niche, {
        campaigns: current.campaigns + 1,
        confidenceSum: current.confidenceSum + item.confidence,
      });
    }

    const detectedNiches = [...nicheAgg.entries()]
      .map(([niche, value]) => ({
        niche,
        campaigns: value.campaigns,
        confidence: value.campaigns > 0 ? value.confidenceSum / value.campaigns : 0,
      }))
      .sort((a, b) => b.campaigns - a.campaigns);

    const primary = detectedNiches[0]?.niche ?? workspaceNiche;
    const marketBenchmark = await this.getMarketBenchmark({ niche: primary, campaignType: "all", platform: "meta" });

    return { marketBenchmark, campaignComparisons: comparisons, detectedNiches };
  }

  async getMarketBenchmark(params: {
    niche: string;
    campaignType?: string;
    platform?: string;
    country?: string;
  }): Promise<MarketBenchmark | null> {
    const niche = params.niche || "geral";
    const campaignType = params.campaignType || "all";
    const platform = params.platform || "meta";
    const country = params.country || "BR";

    const attempts = [
      { niche, campaign_type: campaignType },
      { niche, campaign_type: "all" },
      { niche: "geral", campaign_type: campaignType },
      { niche: "geral", campaign_type: "all" },
    ];

    for (const attempt of attempts) {
      const { data, error } = await this.db
        .from("market_benchmarks")
        .select("*")
        .eq("niche", attempt.niche)
        .eq("campaign_type", attempt.campaign_type)
        .eq("platform", platform)
        .eq("country", country)
        .order("period_end", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      if (data) return this.mapMarketBenchmark(data as Record<string, unknown>);
    }

    return null;
  }

  private classifyCampaign(
    campaign: CampaignRow,
    context: {
      workspaceNiche: string;
      clientNiche: string | null;
      overrideNiche: string | null;
      overrideType: string | null;
    }
  ): CampaignClassification {
    const reasons: string[] = [];

    if (context.overrideNiche) {
      return {
        niche: normalize(context.overrideNiche),
        campaignType: normalize(context.overrideType) || this.detectCampaignType(campaign, reasons),
        confidence: 1,
        reasons: ["override manual"],
      };
    }

    const text = normalize(`${campaign.nome_campanha ?? ""} ${campaign.objective ?? ""}`);
    let niche = normalize(context.clientNiche) || "";
    let confidence = niche ? 0.86 : 0;
    if (niche) reasons.push("nicho do cliente vinculado");

    if (!niche) {
      const scored = Object.entries(NICHE_KEYWORDS)
        .map(([candidate, keywords]) => ({
          candidate,
          score: keywords.filter((keyword) => text.includes(normalize(keyword))).length,
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)[0];

      if (scored) {
        niche = scored.candidate;
        confidence = Math.min(0.82, 0.48 + scored.score * 0.14);
        reasons.push("palavras da campanha");
      }
    }

    if (!niche) {
      niche = normalize(context.workspaceNiche) || "geral";
      confidence = niche === "geral" ? 0.35 : 0.62;
      reasons.push("nicho do workspace");
    }

    return {
      niche,
      campaignType: this.detectCampaignType(campaign, reasons),
      confidence,
      reasons,
    };
  }

  private detectCampaignType(campaign: CampaignRow, reasons: string[]): string {
    const text = normalize(`${campaign.nome_campanha ?? ""} ${campaign.objective ?? ""}`);
    const objective = normalize(campaign.objective);

    if (objective.includes("lead")) {
      reasons.push("objetivo Meta");
      return "leads";
    }
    if (objective.includes("sales") || objective.includes("purchase")) {
      reasons.push("objetivo Meta");
      return "vendas";
    }
    if (objective.includes("traffic")) {
      reasons.push("objetivo Meta");
      return "trafego";
    }
    if (objective.includes("engagement") || objective.includes("message")) {
      reasons.push("objetivo Meta");
      return objective.includes("message") ? "mensagens" : "engajamento";
    }
    if (objective.includes("awareness") || objective.includes("reach")) {
      reasons.push("objetivo Meta");
      return "alcance";
    }

    const scored = Object.entries(TYPE_KEYWORDS)
      .map(([candidate, keywords]) => ({
        candidate,
        score: keywords.filter((keyword) => text.includes(normalize(keyword))).length,
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)[0];

    if (scored) {
      reasons.push("tipo pelo nome");
      return scored.candidate;
    }

    if (Number(campaign.contatos ?? 0) > 0) return "leads";
    if (Number(campaign.receita_estimada ?? 0) > 0) return "vendas";
    return "all";
  }

  private internalMetrics(rows: CampaignRow[]) {
    const values = rows.map((row) => {
      const spend = Number(row.gasto_total ?? 0);
      const leads = Number(row.contatos ?? 0);
      const revenue = Number(row.receita_estimada ?? 0);
      return {
        cpl: spend > 0 && leads > 0 ? spend / leads : null,
        roas: spend > 0 && revenue > 0 ? revenue / spend : null,
        ctr: Number(row.ctr ?? 0) || null,
      };
    });

    return {
      avgCpl: avg(values.map((item) => item.cpl).filter((value): value is number => value !== null)),
      avgRoas: avg(values.map((item) => item.roas).filter((value): value is number => value !== null)),
      avgCtr: avg(values.map((item) => item.ctr).filter((value): value is number => value !== null)),
    };
  }

  private async getWorkspace(workspaceId: string): Promise<WorkspaceRow | null> {
    const { data } = await this.db
      .from("workspaces")
      .select("id,niche,owner_user_id")
      .eq("id", workspaceId)
      .maybeSingle();

    return data as WorkspaceRow | null;
  }

  private async getClients(clientIds: string[]): Promise<ClientRow[]> {
    if (!clientIds.length) return [];
    const { data } = await this.db
      .from("clientes")
      .select("id,nicho,nome")
      .in("id", clientIds);

    if (data) {
      return (data as Array<{ id: string; nicho: string | null; nome: string | null }>).map((row) => ({
        id: row.id,
        niche: row.nicho,
        nome: row.nome,
      }));
    }

    const fallback = await this.db
      .from("clients")
      .select("id,niche,name")
      .in("id", clientIds);

    return ((fallback.data ?? []) as Array<{ id: string; niche: string | null; name: string | null }>).map((row) => ({
      id: row.id,
      niche: row.niche,
      nome: row.name,
    }));
  }

  private async getOverrides(workspaceId: string): Promise<OverrideRow[]> {
    const { data, error } = await this.db
      .from("campaign_niche_overrides")
      .select("campaign_metric_id,meta_campaign_id,niche,campaign_type")
      .eq("workspace_id", workspaceId);

    if (error) return [];
    return (data ?? []) as OverrideRow[];
  }

  private mapMarketBenchmark(row: Record<string, unknown>): MarketBenchmark {
    return {
      niche: String(row.niche),
      campaignType: String(row.campaign_type ?? "all"),
      platform: String(row.platform ?? "meta"),
      country: String(row.country ?? "BR"),
      periodStart: row.period_start ? String(row.period_start) : null,
      periodEnd: row.period_end ? String(row.period_end) : null,
      sampleSize: row.sample_size === null || row.sample_size === undefined ? null : Number(row.sample_size),
      confidence: Number(row.confidence ?? 0.6),
      sourceName: String(row.source_name),
      sourceUrl: row.source_url ? String(row.source_url) : null,
      sourceNote: row.source_note ? String(row.source_note) : null,
      metrics: {
        cpl: { p25: this.num(row.cpl_p25), p50: this.num(row.cpl_p50), p75: this.num(row.cpl_p75), unit: "BRL" },
        roas: { p25: this.num(row.roas_p25), p50: this.num(row.roas_p50), p75: this.num(row.roas_p75), unit: "x" },
        ctr: { p25: this.num(row.ctr_p25), p50: this.num(row.ctr_p50), p75: this.num(row.ctr_p75), unit: "%" },
        cpm: { p25: this.num(row.cpm_p25), p50: this.num(row.cpm_p50), p75: this.num(row.cpm_p75), unit: "BRL" },
        cpc: { p25: this.num(row.cpc_p25), p50: this.num(row.cpc_p50), p75: this.num(row.cpc_p75), unit: "BRL" },
        frequency: { p25: null, p50: this.num(row.frequency_p50), p75: null, unit: "x" },
      },
    };
  }

  private num(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
