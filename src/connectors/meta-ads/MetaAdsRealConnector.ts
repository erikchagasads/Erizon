/**
 * src/connectors/meta-ads/MetaAdsRealConnector.ts
 *
 * Conector real para a Meta Graph API.
 * Implementa OAuth token refresh, paginação via cursor,
 * parse robusto de insights e mapeamento para ExternalCampaignRecord.
 *
 * Fluxo:
 *  1. Valida token via /debug_token
 *  2. Tenta refresh se expirado (apenas para tokens de longa duração)
 *  3. Busca campanhas com insights via Graph API v19.0
 *  4. Itera paginação até esgotar resultados
 *  5. Normaliza para ExternalCampaignRecord
 */

import { ExternalCampaignRecord, IntegrationCredential } from "@/types/erizon";
import { MetaAdsConnector } from "@/connectors/meta-ads/types";

const GRAPH_BASE = "https://graph.facebook.com/v19.0";
const DEFAULT_DATE_PRESET = "last_30d";

// ─── Tipos internos da Meta Graph API ─────────────────────────────────────────

interface MetaInsightAction {
  action_type: string;
  value: string;
}

interface MetaInsight {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpm?: string;
  cpc?: string;
  actions?: MetaInsightAction[];
  action_values?: MetaInsightAction[];
}

interface MetaAdset {
  id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  insights?: { data: Array<{ frequency?: string }> };
}

interface MetaCampaign {
  id: string;
  name: string;
  effective_status: string;
  objective?: string;
  start_time?: string;
  stop_time?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  adsets?: { data: MetaAdset[] };
  insights?: { data: MetaInsight[] };
}

interface MetaPagingCursors {
  before?: string;
  after?: string;
}

interface MetaPaging {
  cursors?: MetaPagingCursors;
  next?: string;
}

interface MetaCampaignPage {
  data: MetaCampaign[];
  paging?: MetaPaging;
  error?: { code: number; message: string; error_subcode?: number };
}

interface MetaTokenDebug {
  data?: {
    is_valid: boolean;
    expires_at?: number;
    scopes?: string[];
    app_id?: string;
    user_id?: string;
  };
  error?: { code: number; message: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeFloat(v?: string): number {
  const n = parseFloat(v ?? "0");
  return isNaN(n) ? 0 : n;
}

function safeInt(v?: string): number {
  const n = parseInt(v ?? "0", 10);
  return isNaN(n) ? 0 : n;
}

function sumActions(actions: MetaInsightAction[] = [], types: string[]): number {
  return actions.reduce((acc, a) => {
    const isMatch = types.some((t) =>
      a.action_type === t || a.action_type.includes(t)
    );
    return isMatch ? acc + safeFloat(a.value) : acc;
  }, 0);
}

const LEAD_ACTION_TYPES = [
  "lead",
  "leadgen",
  "contact",
  "onsite_conversion.lead_grouped",
  "onsite_conversion.messaging_conversation_started_7d",
];

const PURCHASE_ACTION_TYPES = ["purchase", "omni_purchase"];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _normalizeCampaignStatus(effectiveStatus: string, stopTime?: string): string {
  const now = new Date();
  if (effectiveStatus === "ACTIVE") {
    if (stopTime && new Date(stopTime) < now) return "CONCLUIDO";
    return "ATIVO";
  }
  if (effectiveStatus === "PAUSED") return "PAUSADA";
  if (effectiveStatus === "DELETED") return "DELETADO";
  if (effectiveStatus === "ARCHIVED") return "ARQUIVADO";
  return "DESATIVADO";
}

function resolveBudget(campaign: MetaCampaign): number {
  if (campaign.daily_budget && safeFloat(campaign.daily_budget) > 0) {
    return safeFloat(campaign.daily_budget) / 100; // centavos → reais (diário)
  }
  if (campaign.lifetime_budget && safeFloat(campaign.lifetime_budget) > 0) {
    return safeFloat(campaign.lifetime_budget) / 100; // lifetime
  }
  // Fallback: soma adsets
  const adsets = campaign.adsets?.data ?? [];
  return adsets.reduce((acc, adset) => {
    if (adset.daily_budget && safeFloat(adset.daily_budget) > 0) {
      return acc + safeFloat(adset.daily_budget) / 100;
    }
    if (adset.lifetime_budget && safeFloat(adset.lifetime_budget) > 0) {
      return acc + safeFloat(adset.lifetime_budget) / 100;
    }
    return acc;
  }, 0);
}

/**
 * Calcula a frequência média ponderada a partir dos ad sets.
 * A Meta não expõe frequência no nível de campanha diretamente —
 * ela fica nos insights de cada ad set.
 * Usamos a média simples dos ad sets com dados disponíveis.
 */
function resolveFrequency(campaign: MetaCampaign): number {
  const adsets = campaign.adsets?.data ?? [];
  const freqs = adsets
    .map((adset) => safeFloat(adset.insights?.data?.[0]?.frequency))
    .filter((f) => f > 0);

  if (freqs.length === 0) return 0;
  return freqs.reduce((acc, f) => acc + f, 0) / freqs.length;
}

function calcDaysActive(startTime?: string): number {
  if (!startTime) return 0;
  const start = new Date(startTime);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
}

// ─── Erro tipado da Meta API ───────────────────────────────────────────────────

class MetaApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly subcode?: number
  ) {
    const friendly = MetaAdsRealConnector.friendlyError(code, message, subcode);
    super(friendly);
    this.name = "MetaApiError";
  }
}

// ─── Conector real ────────────────────────────────────────────────────────────

export class MetaAdsRealConnector implements MetaAdsConnector {
  constructor(
    private readonly datePreset: string = DEFAULT_DATE_PRESET,
    private readonly maxPages: number = 10 // proteção contra loops infinitos
  ) {}

  // ── Validação do token ──────────────────────────────────────────────────────

  async validateToken(credential: IntegrationCredential): Promise<{
    valid: boolean;
    expiresAt?: Date;
    scopes?: string[];
    reason?: string;
  }> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      return { valid: true, reason: "env META_APP_ID/SECRET ausente — pulando validação" };
    }

    const url = `${GRAPH_BASE}/debug_token?input_token=${credential.accessToken}&access_token=${appId}|${appSecret}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as MetaTokenDebug;

    if (json.error || !json.data?.is_valid) {
      return {
        valid: false,
        reason: json.error?.message ?? "Token inválido",
      };
    }

    return {
      valid: true,
      expiresAt: json.data.expires_at ? new Date(json.data.expires_at * 1000) : undefined,
      scopes: json.data.scopes,
    };
  }

  // ── Refresh de token de longa duração ──────────────────────────────────────

  async refreshLongLivedToken(shortToken: string): Promise<string> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error("META_APP_ID e META_APP_SECRET obrigatórios para refresh");
    }

    const url = `${GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    if (json.error) {
      throw new MetaApiError(json.error.code, json.error.message);
    }

    return json.access_token as string;
  }

  // ── Fetch de uma página de campanhas ──────────────────────────────────────

  private async fetchCampaignPage(
    accountId: string,
    token: string,
    after?: string
  ): Promise<MetaCampaignPage> {
    const fields = [
      "id",
      "name",
      "effective_status",
      "objective",
      "start_time",
      "stop_time",
      "daily_budget",
      "lifetime_budget",
      "adsets{id,daily_budget,lifetime_budget,insights{frequency}}",
      `insights{spend,impressions,reach,clicks,ctr,cpm,cpc,actions,action_values}`,
    ].join(",");

    const params = new URLSearchParams({
      fields,
      date_preset: this.datePreset,
      limit: "100",
      access_token: token,
    });

    if (after) params.set("after", after);

    const url = `${GRAPH_BASE}/${accountId}/campaigns?${params.toString()}`;
    const res = await fetch(url, { cache: "no-store" });
    const ct = res.headers.get("content-type") ?? "";

    if (!ct.includes("application/json")) {
      throw new Error(`Meta retornou conteúdo não-JSON: ${res.status}`);
    }

    const json = (await res.json()) as MetaCampaignPage;

    if (json.error) {
      throw new MetaApiError(json.error.code, json.error.message);
    }

    return json;
  }

  // ── Pull completo com paginação ────────────────────────────────────────────

  async pullCampaigns(credential: IntegrationCredential): Promise<ExternalCampaignRecord[]> {
    const accountId = credential.externalAccountId;
    const token = credential.accessToken;

    const campaigns: MetaCampaign[] = [];
    let after: string | undefined = undefined;
    let page = 0;

    do {
      const result = await this.fetchCampaignPage(accountId, token, after);
      campaigns.push(...(result.data ?? []));
      after = result.paging?.cursors?.after;
      page++;

      // Sem próxima página
      if (!result.paging?.next) break;
    } while (after && page < this.maxPages);

    return campaigns.map((campaign) =>
      this.toCampaignRecord(campaign, accountId, credential)
    );
  }

  // ── Mapeamento Meta → ExternalCampaignRecord ───────────────────────────────

  private toCampaignRecord(
    campaign: MetaCampaign,
    accountId: string,
    credential: IntegrationCredential
  ): ExternalCampaignRecord {
    const insight: MetaInsight = campaign.insights?.data?.[0] ?? {};
    const spend = safeFloat(insight.spend);
    const impressions = safeInt(insight.impressions);
    const clicks = safeInt(insight.clicks);
    const ctr = safeFloat(insight.ctr);
    const cpm = safeFloat(insight.cpm);
    const cpc = safeFloat(insight.cpc);
    const conversions = sumActions(insight.actions, LEAD_ACTION_TYPES) ||
      sumActions(insight.actions, ["offsite_conversion.fb_pixel_purchase", "purchase"]);
    const revenue = sumActions(insight.action_values, PURCHASE_ACTION_TYPES);
    const budget = resolveBudget(campaign);
    const activeDays = calcDaysActive(campaign.start_time);

    const cpa = conversions > 0 ? spend / conversions : 0;
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
    const frequency = resolveFrequency(campaign);

    return {
      campaignId: campaign.id,
      accountId,
      // clientId será resolvido pelo pipeline via credential.metadata
      clientId: (credential.metadata as Record<string, string>)?.clientId ?? credential.workspaceId,
      name: campaign.name,
      objective: this.resolveObjective(campaign.objective),
      channel: "Meta Ads",
      audience: "Amplo", // Meta não expõe audiência na campanha diretamente
      activeDays,
      dailyBudget: budget,
      spend,
      impressions,
      clicks,
      conversions,
      revenue,
      frequency,
      cpm,
      cpc,
      ctr,
      cpa,
      roas,
      previousRoas: 0,   // preenchido pelo pipeline ao comparar com snapshot anterior
      previousCtr: 0,    // idem
      previousCpa: 0,    // idem
      creativeId: `crt-${campaign.id}`,
      date: new Date().toISOString(),
    };
  }

  private resolveObjective(objective?: string): ExternalCampaignRecord["objective"] {
    if (!objective) return "Lead";
    const map: Record<string, ExternalCampaignRecord["objective"]> = {
      OUTCOME_LEADS: "Lead",
      LEAD_GENERATION: "Lead",
      OUTCOME_SALES: "Compra",
      CONVERSIONS: "Compra",
      OUTCOME_TRAFFIC: "Tráfego",
      LINK_CLICKS: "Tráfego",
      REMARKETING: "Remarketing",
    };
    return map[objective] ?? "Lead";
  }

  // ── Mensagens de erro amigáveis ────────────────────────────────────────────

  static friendlyError(code: number, message: string, subcode?: number): string {
    if (code === 190) {
      if (subcode === 463) return "Token Meta expirado — renove em Configurações.";
      if (subcode === 467) return "Token Meta inválido ou revogado.";
      return "Token Meta inválido — renove em Configurações.";
    }
    if (code === 100) return `Account ID inválido ou sem permissão de leitura.`;
    if (code === 17 || code === 4) return "Rate limit da Meta atingido — aguarde alguns minutos.";
    if (code === 200 || code === 294) return "Token sem permissão ads_read — reconecte a conta.";
    if (code === 803) return "Objeto não encontrado na Meta.";
    return `Meta API (${code}): ${message}`;
  }
}
