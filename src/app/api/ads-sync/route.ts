// src/app/api/ads-sync/route.ts
// v4 — Performance: batch upsert + sem adsets + contas em paralelo

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function limparToken(raw: string): string {
  const s = raw.trim().replace(/\s+/g, "");
  const m = s.match(/EAA[A-Za-z0-9]+/);
  return m ? m[0] : s;
}

interface InsightAction { action_type: string; value: string; }
interface FbInsight {
  spend?: string; impressions?: string; reach?: string;
  clicks?: string; ctr?: string; cpm?: string; cpc?: string;
  actions?: InsightAction[];
}
interface FbCampaign {
  id: string; name: string; effective_status: string;
  start_time?: string; stop_time?: string;
  daily_budget?: string; lifetime_budget?: string;
  insights?: { data: FbInsight[] };
}
interface BmAccount {
  id: string; nome: string; access_token: string;
  ad_account_id: string; ativo: boolean;
}

async function syncConta(
  bm: BmAccount,
  userId: string,
  datePreset: string,
  agora: Date
): Promise<{ nome: string; payload: Record<string, unknown>[]; erro?: string }> {
  const token     = limparToken(bm.access_token);
  const accountId = bm.ad_account_id;

  // Sem adsets — reduz payload ~60% e elimina subcall da Meta
  const fbUrl = [
    `https://graph.facebook.com/v19.0/${accountId}/campaigns`,
    `?fields=id,name,effective_status,start_time,stop_time,daily_budget,lifetime_budget`,
    `,insights{spend,actions,impressions,reach,clicks,ctr,cpm,cpc}`,
    `&date_preset=${datePreset}&limit=500&access_token=${token}`,
  ].join("");

  let fbData: { data?: FbCampaign[]; error?: { code: number; message: string } };
  try {
    const res = await fetch(fbUrl, { cache: "no-store" });
    const ct  = res.headers.get("content-type") || "";
    if (!ct.includes("application/json"))
      return { nome: bm.nome, payload: [], erro: "Meta retornou resposta inválida" };
    fbData = await res.json();
  } catch {
    return { nome: bm.nome, payload: [], erro: "Falha na conexão com a Meta" };
  }

  if (fbData.error) {
    const { code, message } = fbData.error;
    const msg =
      code === 190           ? "Token expirado — atualize em Configurações" :
      code === 100           ? `Account ID ${accountId} inválido ou sem permissão` :
      code === 17 || code === 4 ? "Rate limit — tente novamente em instantes" :
      code === 200 || code === 294 ? "Token sem permissão ads_read" :
      `Erro Meta (${code}): ${message}`;
    return { nome: bm.nome, payload: [], erro: msg };
  }

  const campanhas: FbCampaign[] = fbData.data || [];
  if (campanhas.length === 0) return { nome: bm.nome, payload: [] };

  const payload: Record<string, unknown>[] = [];

  for (const camp of campanhas) {
    const ins: FbInsight = camp.insights?.data?.[0] || {};
    const dataFim = camp.stop_time ? new Date(camp.stop_time) : null;

    let status = "DESATIVADO";
    if      (camp.effective_status === "ACTIVE")   status = (dataFim && dataFim < agora) ? "CONCLUIDO" : "ATIVO";
    else if (camp.effective_status === "PAUSED")   status = "PAUSADA";
    else if (camp.effective_status === "DELETED")  status = "DELETADO";
    else if (camp.effective_status === "ARCHIVED") status = "ARQUIVADO";

    // Orçamento direto (sem adsets)
    let orcamento = 0;
    if (camp.daily_budget    && parseFloat(camp.daily_budget)    > 0) orcamento = parseFloat(camp.daily_budget)    * 30 / 100;
    else if (camp.lifetime_budget && parseFloat(camp.lifetime_budget) > 0) orcamento = parseFloat(camp.lifetime_budget) / 100;

    const leads = (ins.actions || []).reduce((acc, a) => {
      const t = a.action_type ?? "";
      return (t === "lead" || t.includes("lead") || t === "contact" ||
              t === "onsite_conversion.messaging_conversation_started_7d" ||
              t === "onsite_conversion.lead_grouped")
        ? acc + parseInt(a.value || "0") : acc;
    }, 0);

    const receita = (ins.actions || []).reduce((acc, a) =>
      a.action_type === "purchase" ? acc + parseFloat(a.value || "0") : acc, 0);

    const dataInicio = camp.start_time ? new Date(camp.start_time) : null;
    const diasAtivo  = dataInicio
      ? Math.max(0, Math.floor((agora.getTime() - dataInicio.getTime()) / 86_400_000))
      : 0;

    payload.push({
      user_id:          userId,
      // cliente_id omitido: nunca sobrescrever vínculos manuais no sync
      nome_campanha:    camp.name,
      meta_campaign_id: camp.id,
      meta_account_id:  accountId,
      status,
      orcamento,
      gasto_total:      parseFloat(ins.spend       || "0"),
      contatos:         leads,
      receita_estimada: receita,
      impressoes:       parseInt(ins.impressions   || "0"),
      alcance:          parseInt(ins.reach         || "0"),
      cliques:          parseInt(ins.clicks        || "0"),
      ctr:              parseFloat(ins.ctr         || "0"),
      cpm:              parseFloat(ins.cpm         || "0"),
      cpc:              parseFloat(ins.cpc         || "0"),
      dias_ativo:       diasAtivo,
      data_inicio:      camp.start_time || null,
      data_atualizacao: agora.toISOString(),
    });
  }

  // Deduplica por meta_campaign_id
  const dedupMap: Record<string, Record<string, unknown>> = {};
  for (const row of payload) {
    dedupMap[row.meta_campaign_id as string] = row;
  }
  const deduped: Record<string, unknown>[] = Object.values(dedupMap);

  return { nome: bm.nome, payload: deduped };
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(s) { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const bmIdParam  = searchParams.get("bm_id") || null;
    const datePreset = searchParams.get("date_preset") || "last_30d"; // padrão 30d em vez de "maximum"

    // ── Buscar contas ─────────────────────────────────────────────────────────
    let queryBMs = supabase
      .from("bm_accounts")
      .select("id, nome, access_token, ad_account_id, ativo")
      .eq("user_id", user.id)
      .eq("ativo", true);

    if (bmIdParam) queryBMs = queryBMs.eq("id", bmIdParam);

    const { data: bms, error: bmsErr } = await queryBMs;
    if (bmsErr) return NextResponse.json({ error: bmsErr.message }, { status: 500 });

    let contasParaSync: BmAccount[] = bms ?? [];

    // Fallback para user_settings
    if (contasParaSync.length === 0) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("meta_access_token, meta_ad_account_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settings?.meta_access_token && settings?.meta_ad_account_id) {
        contasParaSync = [{
          id: "settings_fallback", nome: "Conta Principal",
          access_token: settings.meta_access_token,
          ad_account_id: settings.meta_ad_account_id, ativo: true,
        }];
      }
    }

    if (contasParaSync.length === 0) {
      return NextResponse.json({
        success: true, count: 0,
        message: "Nenhuma conta Meta configurada. Vá em Configurações.",
      });
    }

    const agora = new Date();

    // ── Busca todas as contas em PARALELO ─────────────────────────────────────
    const resultsMeta = await Promise.all(
      contasParaSync.map(bm => syncConta(bm, user.id, datePreset, agora))
    );

    // ── Upsert em batch por conta ─────────────────────────────────────────────
    const resultados: { conta: string; count: number; erro?: string }[] = [];
    const erros: string[] = [];
    let totalCampanhas = 0;

    for (const result of resultsMeta) {
      if (result.erro) {
        erros.push(`${result.nome}: ${result.erro}`);
        resultados.push({ conta: result.nome, count: 0, erro: result.erro });
        continue;
      }
      if (result.payload.length === 0) {
        resultados.push({ conta: result.nome, count: 0 });
        continue;
      }

      // 1 único upsert para todas as campanhas da conta
      const { error: upsertErr } = await supabase
        .from("metricas_ads")
        .upsert(result.payload, {
          onConflict: "meta_campaign_id",
          ignoreDuplicates: false,
        });

      if (upsertErr) {
        // Fallback: upsert ignorando duplicatas
        const { error: fallbackErr } = await supabase
          .from("metricas_ads")
          .upsert(result.payload, { ignoreDuplicates: true });

        if (fallbackErr) {
          erros.push(`${result.nome}: ${fallbackErr.message}`);
          resultados.push({ conta: result.nome, count: 0, erro: fallbackErr.message });
          continue;
        }
      }

      totalCampanhas += result.payload.length;
      resultados.push({ conta: result.nome, count: result.payload.length });
    }

    // Atualiza timestamp
    await supabase
      .from("user_configs")
      .upsert({ user_id: user.id, ultimo_sync: agora.toISOString() }, { onConflict: "user_id" });

    return NextResponse.json({
      success:   erros.length === 0,
      count:     totalCampanhas,
      contas:    contasParaSync.length,
      resultados,
      erros:     erros.length > 0 ? erros : undefined,
      message:   `${totalCampanhas} campanhas sincronizadas de ${contasParaSync.length} conta(s) Meta.`,
      timestamp: agora.toISOString(),
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("Erro no sync:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}