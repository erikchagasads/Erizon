// /api/sync-meta/route.ts
// Sincroniza campanhas do Meta — agora com suporte a cliente_id

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // ── cliente_id opcional via query param ───────────────────
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("cliente_id") || null;

    // ── Busca credenciais ─────────────────────────────────────
    // Prioridade: credenciais do cliente > credenciais globais do user
    let accessToken: string | null = null;
    let adAccountId: string | null = null;

    if (clienteId) {
      const { data: cliente } = await supabase
        .from("clientes")
        .select("meta_account_id")
        .eq("id", clienteId)
        .eq("user_id", user.id)
        .single();

      if (cliente?.meta_account_id) {
        adAccountId = cliente.meta_account_id;
      }
    }

    // Token sempre vem do user_settings (por segurança — não armazenamos token por cliente)
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("meta_access_token, meta_ad_account_id")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json({
        error: "Credenciais do Facebook não configuradas. Vá em Configurações."
      }, { status: 400 });
    }

    accessToken = settings.meta_access_token;
    if (!adAccountId) adAccountId = settings.meta_ad_account_id;

    if (!accessToken || !adAccountId) {
      return NextResponse.json({
        error: "Token ou Account ID não configurados. Vá em Configurações."
      }, { status: 400 });
    }

    // ── Chamada Meta API ──────────────────────────────────────
    const fbUrl = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=id,name,effective_status,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining,adsets{name,daily_budget,lifetime_budget},insights{spend,actions,impressions,reach}&date_preset=maximum&limit=500&access_token=${accessToken}`;

    const fbRes = await fetch(fbUrl);
    const contentType = fbRes.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await fbRes.text();
      console.error("Facebook resposta inválida:", text.slice(0, 300));
      return NextResponse.json({
        error: "Facebook retornou resposta inválida. Verifique o token e o Account ID."
      }, { status: 400 });
    }

    const fbData = await fbRes.json();

    if (fbData.error) {
      const code = fbData.error.code;
      let mensagem = `Erro do Facebook: ${fbData.error.message}`;
      if (code === 190) mensagem = "Token expirado ou inválido. Gere um novo em Configurações.";
      else if (code === 100) mensagem = "Account ID inválido ou sem permissão.";
      else if (code === 17 || code === 4) mensagem = "Limite de requisições. Tente em alguns minutos.";
      else if (code === 200 || code === 294) mensagem = "Permissões insuficientes. Token precisa de 'ads_read'.";
      return NextResponse.json({ error: mensagem }, { status: 400 });
    }

    // ── Processar campanhas ───────────────────────────────────
    const agora = new Date();
    const campanhasUnicas = new Map();

    (fbData.data || []).forEach((camp: any) => {
      const insights    = camp.insights?.data?.[0] || {};
      const statusMeta  = camp.effective_status;
      const dataTermino = camp.stop_time ? new Date(camp.stop_time) : null;

      let statusFinal = "DESATIVADO";
      if (statusMeta === "ACTIVE") {
        statusFinal = (dataTermino && dataTermino < agora) ? "CONCLUIDO" : "ATIVO";
      } else if (statusMeta === "PAUSED") {
        statusFinal = "PAUSADA";
      }

      let budgetTotal = 0;
      if (camp.daily_budget && parseFloat(camp.daily_budget) > 0) {
        budgetTotal = parseFloat(camp.daily_budget) * 30;
      } else if (camp.lifetime_budget && parseFloat(camp.lifetime_budget) > 0) {
        budgetTotal = parseFloat(camp.lifetime_budget);
      }
      if (budgetTotal === 0 && camp.adsets?.data?.length > 0) {
        budgetTotal = camp.adsets.data.reduce((acc: number, adset: any) => {
          let b = 0;
          if (adset.daily_budget && parseFloat(adset.daily_budget) > 0) b = parseFloat(adset.daily_budget) * 30;
          else if (adset.lifetime_budget && parseFloat(adset.lifetime_budget) > 0) b = parseFloat(adset.lifetime_budget);
          return acc + b;
        }, 0);
      }

      const gastoTotal  = parseFloat(insights.spend || "0");
      const leads       = insights.actions?.reduce((acc: number, a: any) =>
        (["lead", "conversation", "contact"].some(t => a.action_type.includes(t)))
          ? acc + parseInt(a.value || "0") : acc, 0) || 0;
      const impressoes  = parseInt(insights.impressions || "0");
      const alcance     = parseInt(insights.reach || "0");

      campanhasUnicas.set(camp.name, {
        user_id:          user.id,
        cliente_id:       clienteId,           // ← novo campo
        nome_campanha:    camp.name,
        meta_campaign_id: camp.id,
        status:           statusFinal,
        orcamento:        budgetTotal / 100,
        gasto_total:      gastoTotal,
        contatos:         leads,
        impressoes,
        alcance,
        data_inicio:      camp.start_time || null,
        data_atualizacao: new Date().toISOString(),
      });
    });

    const payload = Array.from(campanhasUnicas.values());

    // ── Upsert seguro por cliente ─────────────────────────────
    // Deleta só as campanhas deste cliente específico antes de reinserir
    if (clienteId) {
      await supabase.from("metricas_ads")
        .delete()
        .eq("user_id", user.id)
        .eq("cliente_id", clienteId);
    } else {
      // Sem cliente_id: comportamento legado — deleta todas sem cliente
      await supabase.from("metricas_ads")
        .delete()
        .eq("user_id", user.id)
        .is("cliente_id", null);
    }

    if (payload.length > 0) {
      const { error } = await supabase.from("metricas_ads").insert(payload);
      if (error) {
        console.error("Erro ao inserir métricas:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // ── Atualizar ultimo_sync no user_configs ─────────────────
    await supabase.from("user_configs")
      .upsert({ user_id: user.id, ultimo_sync: new Date().toISOString() }, { onConflict: "user_id" });

    return NextResponse.json({
      success: true,
      count: payload.length,
      cliente_id: clienteId,
      message: `${payload.length} campanhas sincronizadas com sucesso!`,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("Erro no sync:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}