import { Groq } from "groq-sdk";
import { createServerSupabase } from "@/lib/supabase/server";
import { logError, logEvent } from "@/lib/observability/logger";

type NumericLike = number | string | null | undefined;
type Row = Record<string, unknown>;

export type CampaignSuggestionSource = "ai" | "rules";

export type CampaignSuggestionDraft = {
  campaignName: string;
  clientId: string | null;
  objetivo: string;
  orcamentoDiario: number;
  audienciaSize: number;
  formato: string;
  temCTA: boolean;
  duracaoSegundos?: number;
  temPixel: boolean;
  publicoCustom: boolean;
  metaCpl?: number;
};

export type CampaignSuggestion = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  objective: string;
  format: string;
  dailyBudget: number;
  audienceSize: number;
  audience: string;
  metaCpl: number | null;
  angle: string;
  rationale: string;
  confidence: number;
  source: CampaignSuggestionSource;
  brief: string;
  draft: CampaignSuggestionDraft;
};

type SuggestionContext = {
  userId: string;
  workspaceId: string;
  clientId?: string | null;
  clients: Row[];
  campaigns: Row[];
  dnaRows: Row[];
  memoryRows: Row[];
  networkRows: Row[];
};

const ACTIVE_STATUSES = new Set(["ATIVO", "ACTIVE", "ATIVA", "ativo", "ativa"]);
const OBJECTIVES = new Set(["LEADS", "SALES", "TRAFFIC", "AWARENESS", "ENGAGEMENT"]);
const FORMATS = new Set(["video", "imagem", "carrossel"]);

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number) {
  return Math.max(0, Math.round(value));
}

function clientName(client: Row | null): string | null {
  if (!client) return null;
  return clean(client.nome_cliente) || clean(client.nome) || null;
}

function normalizeObjective(value: unknown, fallback = "LEADS") {
  const objective = clean(value).toUpperCase();
  return OBJECTIVES.has(objective) ? objective : fallback;
}

function normalizeFormat(value: unknown, fallback = "video") {
  const format = clean(value).toLowerCase();
  return FORMATS.has(format) ? format : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  return asArray(value).map((item) => clean(item)).filter(Boolean);
}

function firstPositive(...values: unknown[]) {
  return values.map(toNumber).find((value) => value > 0) ?? 0;
}

function average(values: unknown[]) {
  const positives = values.map(toNumber).filter((value) => value > 0);
  if (!positives.length) return 0;
  return positives.reduce((total, value) => total + value, 0) / positives.length;
}

function isActiveCampaign(row: Row) {
  return ACTIVE_STATUSES.has(clean(row.status));
}

function campaignScore(row: Row) {
  const spend = toNumber(row.gasto_total);
  const leads = toNumber(row.contatos);
  const revenue = toNumber(row.receita_estimada);
  if (spend <= 0) return 0;
  if (leads === 0 && spend > 50) return 20;

  const roas = spend > 0 ? revenue / spend : 0;
  const cpl = leads > 0 ? spend / leads : 999;
  let score = 50;
  if (roas >= 3) score += 25;
  else if (roas >= 2) score += 10;
  else if (roas < 1) score -= 20;
  if (cpl < 30) score += 15;
  else if (cpl < 60) score += 5;
  else if (cpl > 120) score -= 15;
  return clamp(Math.round(score), 0, 100);
}

function parseJsonObject(content: string): Row | null {
  try {
    return JSON.parse(content) as Row;
  } catch {
    const fenced = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const loose = fenced?.[1] ?? content.match(/\{[\s\S]*\}/)?.[0];
    if (!loose) return null;
    try {
      return JSON.parse(loose) as Row;
    } catch {
      return null;
    }
  }
}

function bestFormatFromDna(dna: Row | null, memory: Row | null) {
  const memoryFormat = asStringArray(memory?.formatos_que_convertem)[0];
  if (memoryFormat) return normalizeFormat(memoryFormat);

  const formats = asArray(dna?.best_formats);
  const first = formats[0];
  if (first && typeof first === "object") {
    return normalizeFormat((first as Row).format ?? (first as Row).name);
  }
  return "video";
}

function confidenceForContext(params: {
  campaigns: Row[];
  dna: Row | null;
  memory: Row | null;
  network: Row | null;
}) {
  let confidence = 0.55;
  const activeCount = params.campaigns.filter(isActiveCampaign).length;
  if (activeCount >= 3) confidence += 0.08;
  if (activeCount >= 8) confidence += 0.04;
  if (firstPositive(params.dna?.cpl_median, params.dna?.roas_median) > 0) confidence += 0.12;
  if (params.memory) confidence += 0.1;
  if (toNumber(params.network?.n_workspaces) >= 5 && toNumber(params.network?.n_campaigns) >= 10) confidence += 0.06;
  return Number(clamp(confidence, 0.55, 0.9).toFixed(2));
}

export class CampaignSuggestionService {
  private db = createServerSupabase();

  async generate(params: {
    userId: string;
    workspaceId: string;
    clientId?: string | null;
  }): Promise<CampaignSuggestion[]> {
    const context = await this.loadContext(params);
    const fallback = this.buildRuleSuggestions(context);
    const aiSuggestions = await this.tryGenerateWithAi(context, fallback);
    const suggestions = aiSuggestions.length ? aiSuggestions : fallback;

    logEvent("campaign_suggestions_generated", {
      userId: params.userId,
      workspaceId: params.workspaceId,
      clientId: params.clientId ?? null,
      source: aiSuggestions.length ? "ai" : "rules",
      count: suggestions.length,
    });

    return suggestions.slice(0, 3);
  }

  private async loadContext(params: {
    userId: string;
    workspaceId: string;
    clientId?: string | null;
  }): Promise<SuggestionContext> {
    let clientsQuery = this.db
      .from("clientes")
      .select("id, nome, nome_cliente, campanha_keywords, ticket_medio, ativo")
      .eq("user_id", params.userId)
      .eq("ativo", true)
      .limit(3);

    if (params.clientId) clientsQuery = clientsQuery.eq("id", params.clientId).limit(1);

    const { data: clients } = await clientsQuery;
    const clientIds = (clients ?? []).map((client) => String(client.id)).filter(Boolean);

    let campaignsQuery = this.db
      .from("metricas_ads")
      .select("id, nome_campanha, cliente_id, status, gasto_total, contatos, receita_estimada, ctr, orcamento, objective, data_atualizacao, created_at")
      .eq("user_id", params.userId)
      .order("data_atualizacao", { ascending: false })
      .limit(80);

    if (params.clientId) campaignsQuery = campaignsQuery.eq("cliente_id", params.clientId);

    let dnaQuery = this.db
      .from("profit_dna_snapshots")
      .select("client_id, cpl_median, roas_median, confidence_score, best_formats, key_learnings, golden_audience, avg_budget_winner");
    let memoryQuery = this.db
      .from("agente_memoria_cliente")
      .select("cliente_id, nicho, publico_alvo, cpl_alvo, roas_alvo, ganchos_aprovados, copies_aprovadas, formatos_que_convertem");

    if (clientIds.length) {
      dnaQuery = dnaQuery.eq("workspace_id", params.workspaceId).in("client_id", clientIds).limit(3);
      memoryQuery = memoryQuery.eq("workspace_id", params.workspaceId).in("cliente_id", clientIds).limit(3);
    } else {
      dnaQuery = dnaQuery.eq("workspace_id", params.workspaceId).limit(3);
      memoryQuery = memoryQuery.eq("workspace_id", params.workspaceId).limit(3);
    }

    const [campaignsRes, dnaRes, memoryRes, networkRes] = await Promise.all([
      campaignsQuery,
      dnaQuery,
      memoryQuery,
      this.db
        .from("network_weekly_insights")
        .select("nicho, cpl_p50, roas_p50, top_pattern, trend_note, n_workspaces, n_campaigns, computed_at")
        .order("computed_at", { ascending: false })
        .limit(5),
    ]);

    return {
      userId: params.userId,
      workspaceId: params.workspaceId,
      clientId: params.clientId,
      clients: (clients ?? []) as Row[],
      campaigns: (campaignsRes.data ?? []) as Row[],
      dnaRows: (dnaRes.data ?? []) as Row[],
      memoryRows: (memoryRes.data ?? []) as Row[],
      networkRows: (networkRes.data ?? []) as Row[],
    };
  }

  private buildRuleSuggestions(context: SuggestionContext): CampaignSuggestion[] {
    const targetClients = context.clients.length ? context.clients : [null];
    const selectedMode = Boolean(context.clientId);
    const suggestions: CampaignSuggestion[] = [];

    for (const client of targetClients) {
      const base = this.buildBaseSuggestion(context, client);
      suggestions.push(base);

      if (selectedMode) {
        suggestions.push(this.buildRetargetingSuggestion(context, client, base));
        suggestions.push(this.buildCreativeTestSuggestion(context, client, base));
      }
    }

    return suggestions.slice(0, 3);
  }

  private buildBaseSuggestion(context: SuggestionContext, client: Row | null): CampaignSuggestion {
    const clientId = client ? String(client.id) : null;
    const clientCampaigns = context.campaigns.filter((campaign) =>
      clientId ? String(campaign.cliente_id ?? "") === clientId : true
    );
    const activeCampaigns = clientCampaigns.filter(isActiveCampaign);
    const dna = context.dnaRows.find((row) => clientId && String(row.client_id ?? "") === clientId) ?? null;
    const memory = context.memoryRows.find((row) => clientId && String(row.cliente_id ?? "") === clientId) ?? null;
    const network = context.networkRows[0] ?? null;
    const name = clientName(client) ?? "Workspace";
    const format = bestFormatFromDna(dna, memory);
    const avgBudget = average(activeCampaigns.map((campaign) => campaign.orcamento as NumericLike));
    const targetCpl = firstPositive(memory?.cpl_alvo, dna?.cpl_median, network?.cpl_p50, 60);
    const dailyBudget = roundMoney(clamp(firstPositive(dna?.avg_budget_winner, avgBudget, targetCpl * 3, 90), 50, 500));
    const metaCpl = targetCpl > 0 ? roundMoney(targetCpl * 0.9) : null;
    const niche = clean(memory?.nicho) || clean(client?.campanha_keywords).split(",")[0]?.trim() || clean(network?.nicho) || "nicho validado";
    const audience = clean(memory?.publico_alvo) || clean(dna?.golden_audience) || `Lookalike de leads e interesses de ${niche}`;
    const confidence = confidenceForContext({ campaigns: clientCampaigns, dna, memory, network });
    const title = `Leads ${name} | ${niche}`;
    const rationale =
      clean(network?.top_pattern) ||
      clean(network?.trend_note) ||
      `Volume e historico indicam espaco para uma campanha de aquisicao em ${niche}.`;

    return this.makeSuggestion({
      id: `rules-${clientId ?? "workspace"}-acquisition`,
      clientId,
      clientName: clientName(client),
      title,
      objective: "LEADS",
      format,
      dailyBudget,
      audienceSize: activeCampaigns.length >= 3 ? 800000 : 400000,
      audience,
      metaCpl,
      angle: "Prova direta + oferta de baixo atrito",
      rationale,
      confidence,
      source: "rules",
    });
  }

  private buildRetargetingSuggestion(context: SuggestionContext, client: Row | null, base: CampaignSuggestion): CampaignSuggestion {
    const clientId = client ? String(client.id) : null;
    const name = clientName(client) ?? "Workspace";
    const clientCampaigns = context.campaigns.filter((campaign) =>
      clientId ? String(campaign.cliente_id ?? "") === clientId : true
    );
    const bestCampaign = [...clientCampaigns].sort((a, b) => campaignScore(b) - campaignScore(a))[0];
    const title = `Retargeting ${name} | Alta intencao`;
    const rationale = bestCampaign
      ? `Reaproveita o aprendizado de ${clean(bestCampaign.nome_campanha) || "campanhas recentes"} com uma audiencia mais quente.`
      : "Cria uma camada de captura para pessoas que ja demonstraram interesse.";

    return this.makeSuggestion({
      id: `rules-${clientId ?? "workspace"}-retargeting`,
      clientId,
      clientName: clientName(client),
      title,
      objective: base.objective,
      format: base.format,
      dailyBudget: roundMoney(clamp(base.dailyBudget * 0.55, 35, 250)),
      audienceSize: 120000,
      audience: "Visitantes, engajados e leads nao convertidos dos ultimos 30 dias",
      metaCpl: base.metaCpl ? roundMoney(base.metaCpl * 0.85) : null,
      angle: "Objecao final + prova social",
      rationale,
      confidence: Number(clamp(base.confidence + 0.04, 0.55, 0.92).toFixed(2)),
      source: "rules",
    });
  }

  private buildCreativeTestSuggestion(context: SuggestionContext, client: Row | null, base: CampaignSuggestion): CampaignSuggestion {
    const clientId = client ? String(client.id) : null;
    const memory = context.memoryRows.find((row) => clientId && String(row.cliente_id ?? "") === clientId) ?? null;
    const hooks = asStringArray(memory?.ganchos_aprovados);
    const title = `Teste criativo ${clientName(client) ?? "Workspace"} | 3 angulos`;

    return this.makeSuggestion({
      id: `rules-${clientId ?? "workspace"}-creative-test`,
      clientId,
      clientName: clientName(client),
      title,
      objective: base.objective,
      format: "video",
      dailyBudget: roundMoney(clamp(base.dailyBudget * 0.7, 50, 300)),
      audienceSize: base.audienceSize,
      audience: base.audience,
      metaCpl: base.metaCpl,
      angle: hooks[0] || "Dor atual vs ganho em 7 dias",
      rationale: "Separa aprendizado de criativo antes de escalar budget na campanha principal.",
      confidence: Number(clamp(base.confidence - 0.02, 0.55, 0.88).toFixed(2)),
      source: "rules",
    });
  }

  private makeSuggestion(input: Omit<CampaignSuggestion, "brief" | "draft">): CampaignSuggestion {
    const draft: CampaignSuggestionDraft = {
      campaignName: input.title,
      clientId: input.clientId,
      objetivo: input.objective,
      orcamentoDiario: input.dailyBudget,
      audienciaSize: input.audienceSize,
      formato: input.format,
      temCTA: true,
      duracaoSegundos: input.format === "video" ? 30 : undefined,
      temPixel: true,
      publicoCustom: input.audience.toLowerCase().includes("lookalike") || input.audience.toLowerCase().includes("visitantes"),
      metaCpl: input.metaCpl ?? undefined,
    };

    return {
      ...input,
      brief: [
        `Criar ${input.title}.`,
        `Publico: ${input.audience}.`,
        `Angulo: ${input.angle}.`,
        input.metaCpl ? `Meta de CPL: R$${input.metaCpl}.` : "",
        `Budget diario sugerido: R$${input.dailyBudget}.`,
        `Racional: ${input.rationale}`,
      ].filter(Boolean).join(" "),
      draft,
    };
  }

  private async tryGenerateWithAi(context: SuggestionContext, fallback: CampaignSuggestion[]): Promise<CampaignSuggestion[]> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || fallback.length === 0) return [];

    try {
      const groq = new Groq({ apiKey });
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.45,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content: `Voce e o motor estrategico da Erizon para sugerir novas campanhas de trafego pago.
Responda somente JSON valido, sem markdown.
Formato:
{"suggestions":[{"title":"","objective":"LEADS|SALES|TRAFFIC|AWARENESS|ENGAGEMENT","format":"video|imagem|carrossel","dailyBudget":100,"audienceSize":400000,"audience":"","metaCpl":50,"angle":"","rationale":"","confidence":0.75}]}
Regras: maximo 3 sugestoes, numeros realistas, portugues BR, sem promessas absolutas, priorize campanhas que o gestor poderia preencher e rodar no preflight agora.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              clientId: context.clientId ?? null,
              clients: context.clients.map((client) => ({
                id: client.id,
                name: clientName(client),
                keywords: client.campanha_keywords,
                ticketMedio: client.ticket_medio,
              })),
              campaigns: context.campaigns.slice(0, 25).map((campaign) => ({
                name: campaign.nome_campanha,
                clientId: campaign.cliente_id,
                status: campaign.status,
                spend: campaign.gasto_total,
                leads: campaign.contatos,
                revenue: campaign.receita_estimada,
                ctr: campaign.ctr,
                objective: campaign.objective,
              })),
              dna: context.dnaRows,
              memory: context.memoryRows,
              network: context.networkRows,
              fallbackShape: fallback.map((suggestion) => suggestion.draft),
            }),
          },
        ],
      });

      const content = response.choices[0]?.message.content ?? "";
      const parsed = parseJsonObject(content);
      const raw = asArray(parsed?.suggestions);
      return raw
        .map((item, index) => this.normalizeAiSuggestion(item, fallback[index] ?? fallback[0], index))
        .filter((item): item is CampaignSuggestion => Boolean(item));
    } catch (error) {
      logError("campaign_suggestions_ai_failed", error, {
        userId: context.userId,
        workspaceId: context.workspaceId,
        clientId: context.clientId ?? null,
      });
      return [];
    }
  }

  private normalizeAiSuggestion(raw: unknown, fallback: CampaignSuggestion, index: number): CampaignSuggestion | null {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Row;
    const title = clean(item.title) || fallback.title;
    const objective = normalizeObjective(item.objective, fallback.objective);
    const format = normalizeFormat(item.format, fallback.format);
    const dailyBudget = roundMoney(clamp(firstPositive(item.dailyBudget as NumericLike, fallback.dailyBudget), 35, 800));
    const audienceSize = roundMoney(clamp(firstPositive(item.audienceSize as NumericLike, fallback.audienceSize), 50000, 5000000));
    const metaCplRaw = firstPositive(item.metaCpl as NumericLike, fallback.metaCpl ?? undefined);
    const confidence = Number(clamp(firstPositive(item.confidence as NumericLike, fallback.confidence + 0.03), 0.55, 0.92).toFixed(2));

    return this.makeSuggestion({
      id: `ai-${fallback.clientId ?? "workspace"}-${index}`,
      clientId: fallback.clientId,
      clientName: fallback.clientName,
      title,
      objective,
      format,
      dailyBudget,
      audienceSize,
      audience: clean(item.audience) || fallback.audience,
      metaCpl: metaCplRaw > 0 ? roundMoney(metaCplRaw) : null,
      angle: clean(item.angle) || fallback.angle,
      rationale: clean(item.rationale) || fallback.rationale,
      confidence,
      source: "ai",
    });
  }
}

export const campaignSuggestionService = new CampaignSuggestionService();
