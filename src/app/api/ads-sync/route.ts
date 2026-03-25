import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logEvent, logError } from "@/lib/observability/logger";

function limparToken(raw: string): string {
  const s = raw.trim().replace(/\s+/g, "");
  const m = s.match(/EAA[A-Za-z0-9]+/);
  return m ? m[0] : s;
}

function normalizeAccountId(id: string): string {
  const value = id.trim();
  if (!value) return value;
  return value.startsWith("act_") ? value : `act_${value}`;
}

function parseFloatSafe(value?: string | null): number {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseIntSafe(value?: string | null): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface InsightAction {
  action_type: string;
  value: string;
}

interface FbInsight {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpm?: string;
  cpc?: string;
  actions?: InsightAction[];
  action_values?: InsightAction[];
  video_p25_watched_actions?: InsightAction[];
  video_p50_watched_actions?: InsightAction[];
  video_p75_watched_actions?: InsightAction[];
  video_p100_watched_actions?: InsightAction[];
  frequency?: string;
}

interface FbCampaign {
  id: string;
  name: string;
  effective_status: string;
  objective?: string;           // ← ADICIONADO
  start_time?: string;
  stop_time?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  insights?: { data?: FbInsight[] };
}

interface BmAccount {
  id: string;
  nome: string;
  access_token: string;
  ad_account_id: string;
  ativo: boolean;
}

interface ClienteRow {
  id: string;
  nome: string | null;
  meta_account_id: string | null;
  campanha_keywords: string | null;
}

interface ExistingMetricaRow {
  id: string;
  meta_campaign_id: string;
  cliente_id: string | null;
}

interface SyncContaResult {
  nome: string;
  accountId: string;
  payload: Record<string, unknown>[];
  syncedCampaignIds: string[];
  erro?: string;
}

function calcularStatus(camp: FbCampaign, agora: Date): string {
  const stopTime = camp.stop_time ? new Date(camp.stop_time) : null;

  if (camp.effective_status === "ACTIVE") {
    if (stopTime && stopTime.getTime() < agora.getTime()) return "CONCLUIDO";
    return "ATIVO";
  }

  if (camp.effective_status === "PAUSED") return "PAUSADA";
  if (camp.effective_status === "DELETED") return "DELETADO";
  if (camp.effective_status === "ARCHIVED") return "ARQUIVADO";

  if (stopTime && stopTime.getTime() < agora.getTime()) return "CONCLUIDO";
  return "DESATIVADO";
}

function calcularOrcamento(camp: FbCampaign): number {
  const dailyBudget = parseFloatSafe(camp.daily_budget);
  if (dailyBudget > 0) return dailyBudget / 100;

  const lifetimeBudget = parseFloatSafe(camp.lifetime_budget);
  if (lifetimeBudget > 0) return lifetimeBudget / 100;

  return 0;
}

function extrairLeads(actions: InsightAction[] = []): number {
  return actions.reduce((acc, action) => {
    const type = action.action_type ?? "";
    const match =
      type === "lead" ||
      type.includes("lead") ||
      type === "contact" ||
      type === "onsite_conversion.messaging_conversation_started_7d" ||
      type === "onsite_conversion.lead_grouped";

    return match ? acc + parseIntSafe(action.value) : acc;
  }, 0);
}

function extrairReceita(insight: FbInsight): number {
  const actionValues = insight.action_values ?? [];
  const revenueFromActionValues = actionValues.reduce((acc, action) => {
    const type = action.action_type ?? "";
    const match =
      type === "purchase" ||
      type === "omni_purchase" ||
      type.includes("purchase");

    return match ? acc + parseFloatSafe(action.value) : acc;
  }, 0);

  if (revenueFromActionValues > 0) return revenueFromActionValues;

  const actions = insight.actions ?? [];
  return actions.reduce((acc, action) => {
    const type = action.action_type ?? "";
    const match =
      type === "purchase" ||
      type === "omni_purchase" ||
      type.includes("purchase");

    return match ? acc + parseFloatSafe(action.value) : acc;
  }, 0);
}

/** Extrai quantidade de compras (purchase count, não valor) */
function extrairCompras(actions: InsightAction[] = []): number {
  return actions.reduce((acc, a) => {
    const t = a.action_type ?? "";
    return (t === "purchase" || t === "omni_purchase" || t.includes("purchase"))
      ? acc + parseIntSafe(a.value) : acc;
  }, 0);
}

/** Carrinho adicionado */
function extrairAddToCart(actions: InsightAction[] = []): number {
  return actions.reduce((acc, a) => {
    const t = a.action_type ?? "";
    return (t === "add_to_cart" || t === "omni_add_to_cart" || t.includes("add_to_cart"))
      ? acc + parseIntSafe(a.value) : acc;
  }, 0);
}

/** Checkout iniciado */
function extrairCheckoutIniciado(actions: InsightAction[] = []): number {
  return actions.reduce((acc, a) => {
    const t = a.action_type ?? "";
    return (t === "initiate_checkout" || t === "omni_initiated_checkout" || t.includes("initiate_checkout"))
      ? acc + parseIntSafe(a.value) : acc;
  }, 0);
}

/** Cadastros / registros completos */
function extrairCadastros(actions: InsightAction[] = []): number {
  return actions.reduce((acc, a) => {
    const t = a.action_type ?? "";
    return (t === "complete_registration" || t === "omni_complete_registration" || t.includes("complete_registration"))
      ? acc + parseIntSafe(a.value) : acc;
  }, 0);
}

/** Visualizações de conteúdo (página de produto, landing page) */
function extrairVisualizacoesConteudo(actions: InsightAction[] = []): number {
  return actions.reduce((acc, a) => {
    const t = a.action_type ?? "";
    return (t === "view_content" || t === "omni_view_content" || t.includes("view_content"))
      ? acc + parseIntSafe(a.value) : acc;
  }, 0);
}

/** Agendamentos (clínicas, serviços) */
function extrairAgendamentos(actions: InsightAction[] = []): number {
  return actions.reduce((acc, a) => {
    const t = a.action_type ?? "";
    return (t === "schedule" || t.includes("schedule"))
      ? acc + parseIntSafe(a.value) : acc;
  }, 0);
}

/** Assinaturas (SaaS, newsletters) */
function extrairAssinaturas(actions: InsightAction[] = []): number {
  return actions.reduce((acc, a) => {
    const t = a.action_type ?? "";
    return (t === "subscribe" || t.includes("subscribe"))
      ? acc + parseIntSafe(a.value) : acc;
  }, 0);
}

/** Buscas no site */
function extrairBuscas(actions: InsightAction[] = []): number {
  return actions.reduce((acc, a) => {
    const t = a.action_type ?? "";
    return (t === "search" || t.includes("search"))
      ? acc + parseIntSafe(a.value) : acc;
  }, 0);
}

/** Vídeo assistido até 25%, 50%, 75%, 100% */
function extrairVideoViews(insight: FbInsight): { p25: number; p50: number; p75: number; p100: number } {
  const get = (key: keyof FbInsight): number => {
    const arr = (insight[key] as InsightAction[] | undefined) ?? [];
    return arr.reduce((acc, a) => acc + parseIntSafe(a.value), 0);
  };
  return {
    p25:  get("video_p25_watched_actions"),
    p50:  get("video_p50_watched_actions"),
    p75:  get("video_p75_watched_actions"),
    p100: get("video_p100_watched_actions"),
  };
}

async function fetchCampaignsFromMeta(
  accountId: string,
  accessToken: string,
  datePreset: string
): Promise<{ campaigns: FbCampaign[]; error?: string }> {
  const normalizedAccountId = normalizeAccountId(accountId);

  const fields = [
    "id",
    "name",
    "effective_status",
    "objective",                // ← ADICIONADO
    "start_time",
    "stop_time",
    "daily_budget",
    "lifetime_budget",
    "insights.limit(1){spend,actions,action_values,impressions,reach,clicks,ctr,cpm,cpc,frequency,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions}",
  ].join(",");

  const params = new URLSearchParams({
    fields,
    effective_status: JSON.stringify(["ACTIVE", "PAUSED"]),
    "insights.date_preset": datePreset,
    limit: "100",
    access_token: accessToken,
  });

  let nextUrl: string | null = `https://graph.facebook.com/v19.0/${normalizedAccountId}/campaigns?${params.toString()}`;
  const campanhas: FbCampaign[] = [];

  while (nextUrl) {
    let response: Response;

    try {
      response = await fetch(nextUrl, { cache: "no-store" });
    } catch {
      return { campaigns: [], error: "Falha na conexão com a Meta" };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const body = await response.text().catch(() => "(sem body)");
      return { campaigns: [], error: `Meta retornou content-type inválido: ${contentType} | HTTP ${response.status} | body: ${body.slice(0, 200)}` };
    }

    const fbData = (await response.json()) as {
      data?: FbCampaign[];
      paging?: { next?: string };
      error?: { code: number; message: string };
    };

    if (fbData.error) {
      const { code, message } = fbData.error;
      const msg =
        code === 190
          ? "Token expirado — atualize em Configurações"
          : code === 100
            ? `Account ID ${normalizedAccountId} inválido ou sem permissão`
            : code === 17 || code === 4
              ? "Rate limit — tente novamente em instantes"
              : code === 200 || code === 294
                ? "Token sem permissão ads_read"
                : `Erro Meta (${code}): ${message}`;

      return { campaigns: [], error: msg };
    }

    campanhas.push(...(fbData.data ?? []));
    nextUrl = fbData.paging?.next ?? null;

    if (campanhas.length >= 1000) break;
  }

  return { campaigns: campanhas };
}

async function syncConta(
  bm: BmAccount,
  userId: string,
  datePreset: string,
  agora: Date,
  clientesMap: Map<string, string>,
  existingCampaignsMap: Map<string, ExistingMetricaRow>
): Promise<SyncContaResult> {
  const token = limparToken(bm.access_token);
  const accountId = normalizeAccountId(bm.ad_account_id);

  const metaResult = await fetchCampaignsFromMeta(accountId, token, datePreset);
  if (metaResult.error) {
    return {
      nome: bm.nome,
      accountId,
      payload: [],
      syncedCampaignIds: [],
      erro: metaResult.error,
    };
  }

  const payload: Record<string, unknown>[] = [];
  const syncedCampaignIds: string[] = [];

  for (const camp of metaResult.campaigns) {
    const insight: FbInsight = camp.insights?.data?.[0] ?? {};
    const existing = existingCampaignsMap.get(camp.id);
    const clienteIdExistente = existing?.cliente_id ?? null;
    const clienteIdPorConta = clientesMap.get(accountId) ?? null;
    const clienteId = clienteIdExistente ?? clienteIdPorConta;

    const dataInicio = camp.start_time ? new Date(camp.start_time) : null;
    const diasAtivo = dataInicio
      ? Math.max(0, Math.floor((agora.getTime() - dataInicio.getTime()) / 86_400_000))
      : 0;

    syncedCampaignIds.push(camp.id);

    payload.push({
      user_id: userId,
      cliente_id: clienteId,
      nome_campanha: camp.name,
      meta_campaign_id: camp.id,
      meta_account_id: accountId,
      status: calcularStatus(camp, agora),
      orcamento: calcularOrcamento(camp),
      gasto_total: parseFloatSafe(insight.spend),
      contatos: extrairLeads(insight.actions ?? []),
      receita_estimada: extrairReceita(insight),
      impressoes: parseIntSafe(insight.impressions),
      alcance: parseIntSafe(insight.reach),
      cliques: parseIntSafe(insight.clicks),
      ctr: parseFloatSafe(insight.ctr),
      cpm: parseFloatSafe(insight.cpm),
      cpc: parseFloatSafe(insight.cpc),
      dias_ativo: diasAtivo,
      data_inicio: camp.start_time ?? null,
      data_atualizacao: agora.toISOString(),
      plataforma: "meta",
      objective: camp.objective ?? null,    // ← ADICIONADO
      compras:                  extrairCompras(insight.actions ?? []),
      add_to_cart:              extrairAddToCart(insight.actions ?? []),
      checkout_iniciado:        extrairCheckoutIniciado(insight.actions ?? []),
      cadastros:                extrairCadastros(insight.actions ?? []),
      visualizacoes_conteudo:   extrairVisualizacoesConteudo(insight.actions ?? []),
      agendamentos:             extrairAgendamentos(insight.actions ?? []),
      assinaturas:              extrairAssinaturas(insight.actions ?? []),
      buscas:                   extrairBuscas(insight.actions ?? []),
      frequencia:               parseFloatSafe(insight.frequency),
      video_views_p25:          extrairVideoViews(insight).p25,
      video_views_p50:          extrairVideoViews(insight).p50,
      video_views_p75:          extrairVideoViews(insight).p75,
      video_views_p100:         extrairVideoViews(insight).p100,
    });
  }

  const dedupMap = new Map<string, Record<string, unknown>>();
  for (const row of payload) {
    dedupMap.set(String(row.meta_campaign_id), row);
  }

  return {
    nome: bm.nome,
    accountId,
    payload: [...dedupMap.values()],
    syncedCampaignIds: [...new Set(syncedCampaignIds)],
  };
}

async function reconcileMissingCampaigns(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  accountId: string,
  syncedCampaignIds: string[],
  syncIso: string
): Promise<string | null> {
  const normalizedAccountId = normalizeAccountId(accountId);

  const { data: rows, error: fetchError } = await supabase
    .from("metricas_ads")
    .select("id, meta_campaign_id, status")
    .eq("user_id", userId)
    .eq("meta_account_id", normalizedAccountId);

  if (fetchError) return fetchError.message;

  const syncedIds = new Set(syncedCampaignIds);
  const typedRows = (rows ?? []) as Array<{
    id: string;
    meta_campaign_id: string;
    status: string | null;
  }>;

  const staleIds = typedRows
    .filter((row: { id: string; meta_campaign_id: string; status: string | null }) => {
      return !syncedIds.has(row.meta_campaign_id);
    })
    .map((row: { id: string; meta_campaign_id: string; status: string | null }) => row.id);
  if (staleIds.length === 0) return null;

  const { error: updateError } = await supabase
    .from("metricas_ads")
    .update({
      status: "CONCLUIDO",
      data_atualizacao: syncIso,
    })
    .in("id", staleIds)
    .eq("user_id", userId);

  return updateError?.message ?? null;
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(values) {
            values.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    logEvent("ads-sync.start", { userId: user.id });
    const { searchParams } = new URL(request.url);
    const bmIdParam = searchParams.get("bm_id");
    const clienteIdParam = searchParams.get("cliente_id");
    const datePreset = searchParams.get("date_preset") || "last_30d";

    let queryBms = supabase
      .from("bm_accounts")
      .select("id, nome, access_token, ad_account_id, ativo")
      .eq("user_id", user.id)
      .eq("ativo", true);

    if (bmIdParam) {
      queryBms = queryBms.eq("id", bmIdParam);
    }

    const { data: bms, error: bmsErr } = await queryBms;

    if (bmsErr) {
      return NextResponse.json({ error: bmsErr.message }, { status: 500 });
    }

    let contasParaSync: BmAccount[] = bms ?? [];

    if (contasParaSync.length === 0) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("meta_access_token, meta_ad_account_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settings?.meta_access_token && settings?.meta_ad_account_id) {
        contasParaSync = [
          {
            id: "settings_fallback",
            nome: "Conta Principal",
            access_token: settings.meta_access_token,
            ad_account_id: settings.meta_ad_account_id,
            ativo: true,
          },
        ];
      }
    }

    if (contasParaSync.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        contas: 0,
        resultados: [],
        message: "Nenhuma conta Meta configurada. Vá em Configurações.",
      });
    }

    const { data: clientes, error: clientesErr } = await supabase
      .from("clientes")
      .select("id, nome, meta_account_id, campanha_keywords")
      .eq("user_id", user.id)
      .eq("ativo", true);

    if (clientesErr) {
      return NextResponse.json({ error: clientesErr.message }, { status: 500 });
    }

    const clientesAtivos = (clientes ?? []) as ClienteRow[];

    if (clienteIdParam) {
      const clienteSelecionado = clientesAtivos.find((c) => c.id === clienteIdParam);

      if (!clienteSelecionado) {
        return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
      }

      if (!clienteSelecionado.meta_account_id) {
        return NextResponse.json(
          { error: "Cliente sem meta_account_id configurado" },
          { status: 400 }
        );
      }

      const targetAccountId = normalizeAccountId(clienteSelecionado.meta_account_id);

      contasParaSync = contasParaSync.filter(
        (conta) => normalizeAccountId(conta.ad_account_id) === targetAccountId
      );

      if (contasParaSync.length === 0) {
        return NextResponse.json(
          {
            error:
              "Nenhuma conta ativa em bm_accounts corresponde ao meta_account_id do cliente.",
          },
          { status: 400 }
        );
      }
    }

    const clientesMap = new Map<string, string>();
    for (const cliente of clientesAtivos) {
      if (!cliente.meta_account_id) continue;
      clientesMap.set(normalizeAccountId(cliente.meta_account_id), cliente.id);
    }

    const { data: existingCampaigns, error: existingErr } = await supabase
      .from("metricas_ads")
      .select("id, meta_campaign_id, cliente_id")
      .eq("user_id", user.id);

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    const existingCampaignsMap = new Map<string, ExistingMetricaRow>();
    for (const row of (existingCampaigns ?? []) as ExistingMetricaRow[]) {
      existingCampaignsMap.set(row.meta_campaign_id, row);
    }

    const agora = new Date();
    const syncIso = agora.toISOString();

    const resultsMeta = await Promise.all(
      contasParaSync.map((bm) =>
        syncConta(bm, user.id, datePreset, agora, clientesMap, existingCampaignsMap)
      )
    );

    const resultados: Array<{ conta: string; count: number; erro?: string }> = [];
    const erros: string[] = [];
    let totalCampanhas = 0;

    for (const result of resultsMeta) {
      if (result.erro) {
        erros.push(`${result.nome}: ${result.erro}`);
        resultados.push({ conta: result.nome, count: 0, erro: result.erro });
        continue;
      }

      if (result.payload.length > 0) {
        const { error: upsertErr } = await supabase
          .from("metricas_ads")
          .upsert(result.payload, {
            onConflict: "user_id,meta_campaign_id",
            ignoreDuplicates: false,
          });

        if (upsertErr) {
          let msg = upsertErr.message;
          if (msg.includes("there is no unique or exclusion constraint")) {
            msg = "UNIQUE constraint ausente — rode a migration 20260312_create_metricas_ads.sql no Supabase";
          } else if (msg.includes("new row violates row-level security") || msg.includes("permission denied")) {
            msg = `RLS bloqueou o upsert. Verifique se a policy metricas_ads_user_policy existe e se auth.uid() está correto. Detalhe: ${upsertErr.message}`;
          } else if (msg.includes("relation") && msg.includes("does not exist")) {
            msg = "Tabela metricas_ads não existe — rode a migration 20260312_create_metricas_ads.sql no Supabase";
          }
          return NextResponse.json({ error: msg, code: upsertErr.code, details: upsertErr.details }, { status: 500 });
        }
      }

      // ── Auto-vínculo por keyword ─────────────────────────────────────────
      // Campanhas sem cliente_id são vinculadas se o nome contém keyword do cliente
      const clientesComKeyword = clientesAtivos.filter(cl => cl.campanha_keywords?.trim());
      if (clientesComKeyword.length > 0) {
        const { data: semCliente } = await supabase
          .from("metricas_ads")
          .select("id, nome_campanha")
          .eq("user_id", user.id)
          .is("cliente_id", null)
          .in("meta_campaign_id", result.syncedCampaignIds);

        const vinculos: Array<{ id: string; cliente_id: string }> = [];

        for (const camp of semCliente ?? []) {
          const nomeNorm = (camp.nome_campanha ?? "").toLowerCase();
          for (const cliente of clientesComKeyword) {
            const kws = (cliente.campanha_keywords ?? "")
              .split(",")
              .map((k: string) => k.trim().toLowerCase())
              .filter(Boolean);
            if (kws.some((kw: string) => nomeNorm.includes(kw))) {
              vinculos.push({ id: camp.id, cliente_id: cliente.id });
              break; // primeiro match ganha
            }
          }
        }

        for (const v of vinculos) {
          await supabase
            .from("metricas_ads")
            .update({ cliente_id: v.cliente_id })
            .eq("id", v.id)
            .eq("user_id", user.id);
        }

        if (vinculos.length > 0) {
          console.log(`Auto-vínculo: ${vinculos.length} campanha(s) vinculadas por keyword`);
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const reconcileError = await reconcileMissingCampaigns(
        supabase,
        user.id,
        result.accountId,
        result.syncedCampaignIds,
        syncIso
      );

      if (reconcileError) {
        erros.push(`${result.nome}: ${reconcileError}`);
        resultados.push({
          conta: result.nome,
          count: result.payload.length,
          erro: reconcileError,
        });
        totalCampanhas += result.payload.length;
        continue;
      }

      totalCampanhas += result.payload.length;
      resultados.push({ conta: result.nome, count: result.payload.length });
    }

    await supabase
      .from("user_configs")
      .upsert(
        {
          user_id: user.id,
          ultimo_sync: syncIso,
        },
        { onConflict: "user_id" }
      );

    return NextResponse.json({
      success: erros.length === 0,
      count: totalCampanhas,
      contas: contasParaSync.length,
      resultados,
      erros: erros.length > 0 ? erros : undefined,
      message: `${totalCampanhas} campanhas sincronizadas de ${contasParaSync.length} conta(s) Meta.`,
      timestamp: syncIso,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    logError("ads-sync.error", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}