// POST /api/google-ads-sync — sincroniza campanhas Google Ads
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { GoogleAdsConnector } from "@/connectors/google-ads/GoogleAdsConnector";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: settings } = await supabase
    .from("user_settings")
    .select("google_ads_access_token, google_ads_refresh_token, google_ads_customer_id, google_ads_developer_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.google_ads_access_token) {
    return NextResponse.json({ error: "Google Ads não conectado" }, { status: 400 });
  }

  let accessToken = settings.google_ads_access_token;

  // Tenta renovar token se necessário
  if (settings.google_ads_refresh_token) {
    try {
      accessToken = await GoogleAdsConnector.refreshAccessToken(settings.google_ads_refresh_token);
      await supabase.from("user_settings").update({ google_ads_access_token: accessToken }).eq("user_id", user.id);
    } catch {
      // usa token atual
    }
  }

  const connector = new GoogleAdsConnector({
    accessToken,
    refreshToken: settings.google_ads_refresh_token ?? "",
    developerToken: settings.google_ads_developer_token ?? process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
    customerId: settings.google_ads_customer_id ?? process.env.GOOGLE_ADS_CUSTOMER_ID ?? "",
  });

  try {
    const campanhas = await connector.fetchCampaigns("LAST_30_DAYS");

    if (campanhas.length === 0) {
      return NextResponse.json({ synced: 0, message: "Nenhuma campanha encontrada" });
    }

    // DELETE + INSERT (evita conflito de índice parcial)
    await supabase.from("metricas_ads").delete()
      .eq("user_id", user.id).eq("plataforma", "google");

    const rows = campanhas.map(c => ({
      user_id:          user.id,
      nome_campanha:    c.nome_campanha,
      status:           c.status,
      gasto_total:      c.gasto_total,
      orcamento:        c.orcamento,
      impressoes:       c.impressoes,
      alcance:          c.alcance,
      cliques:          c.cliques,
      ctr:              c.ctr,
      contatos:         c.contatos,
      plataforma:       "google",
      objective:        c.objective,
      data_inicio:      c.data_inicio,
      data_atualizacao: c.data_atualizacao,
    }));

    const { error } = await supabase.from("metricas_ads").insert(rows);

    if (error) throw error;

    return NextResponse.json({ synced: campanhas.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao sincronizar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
