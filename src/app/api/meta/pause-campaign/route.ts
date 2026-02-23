// /api/meta/pause-campaign/route.ts
// Pausa uma campanha no Meta Ads + atualiza metricas_ads + registra em decisoes_historico

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";


interface PausePayload {
  campanhaId: string;       // UUID interno (metricas_ads.id)
  campanhaNome: string;     // nome para o log
  motivo: string;           // frase da decisão da IA
  scoreSnapshot?: number;
  lucroSnapshot?: number;
  margemSnapshot?: number;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // Autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body: PausePayload = await req.json();
    const { campanhaId, campanhaNome, motivo, scoreSnapshot, lucroSnapshot, margemSnapshot } = body;

    if (!campanhaId || !campanhaNome) {
      return NextResponse.json({ error: "campanhaId e campanhaNome são obrigatórios" }, { status: 400 });
    }

    // ── 1. Buscar credenciais Meta ────────────────────────────────────────────
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("meta_access_token, meta_ad_account_id")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings?.meta_access_token) {
      return NextResponse.json({
        error: "Credenciais do Meta não configuradas. Vá em Configurações."
      }, { status: 400 });
    }

    // ── 2. Buscar meta_campaign_id da campanha ────────────────────────────────
    const { data: campanha, error: campError } = await supabase
      .from("metricas_ads")
      .select("id, nome_campanha, meta_campaign_id, gasto_total, contatos")
      .eq("id", campanhaId)
      .eq("user_id", user.id)
      .single();

    if (campError || !campanha) {
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
    }

    // ── 3. Pausar no Meta Ads API ─────────────────────────────────────────────
    let metaPaused = false;
    let metaError = "";

    if (campanha.meta_campaign_id) {
      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${campanha.meta_campaign_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "PAUSED",
            access_token: settings.meta_access_token,
          }),
        }
      );

      const metaData = await metaRes.json();

      if (metaData.error) {
        // Trata erros conhecidos com mensagem clara
        const code = metaData.error.code;
        if (code === 190) {
          metaError = "Token do Meta expirado. Atualize em Configurações.";
        } else if (code === 200 || code === 294) {
          metaError = "Permissão insuficiente. Token precisa de 'ads_management'.";
        } else {
          metaError = `Meta API: ${metaData.error.message}`;
        }
      } else if (metaData.success) {
        metaPaused = true;
      }
    } else {
      // Sem meta_campaign_id — sync ainda não foi feito com versão nova
      metaError = "ID Meta não encontrado. Sincronize a conta primeiro para habilitar pausa direta.";
    }

    // ── 4. Atualizar status no Supabase (independente do Meta) ────────────────
    const { error: updateError } = await supabase
      .from("metricas_ads")
      .update({
        status: "PAUSADA",
        data_atualizacao: new Date().toISOString(),
      })
      .eq("id", campanhaId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: `Erro ao atualizar Supabase: ${updateError.message}` }, { status: 500 });
    }

    // ── 5. Registrar em decisoes_historico ────────────────────────────────────
    await supabase.from("decisoes_historico").insert({
      user_id: user.id,
      campanha: campanhaId,
      campanha_nome: campanhaNome,
      acao: metaPaused ? "Pausar campanha (Meta + Erizon AI)" : "Pausar campanha (Erizon AI)",
      impacto: motivo,
      data: new Date().toLocaleDateString("pt-BR"),
      score_snapshot: scoreSnapshot ?? null,
      lucro_snapshot: lucroSnapshot ?? null,
      margem_snapshot: margemSnapshot ?? null,
    });

    // ── 6. Resposta com detalhes para o frontend ──────────────────────────────
    return NextResponse.json({
      ok: true,
      metaPaused,
      metaError: metaError || null,
      supabaseUpdated: true,
      message: metaPaused
        ? `✅ Campanha pausada no Meta e registrada no histórico.`
        : `⚠️ Status atualizado no sistema. ${metaError}`,
    });

  } catch (err: any) {
    console.error("[pause-campaign]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}