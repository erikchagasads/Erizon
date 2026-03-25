// POST /api/tiktok-ads-sync — sincroniza campanhas TikTok Ads
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { TikTokAdsConnector } from "@/connectors/tiktok-ads/TikTokAdsConnector";

function getDateRange(days = 30) {
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

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
    .select("tiktok_ads_access_token, tiktok_ads_advertiser_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.tiktok_ads_access_token || !settings?.tiktok_ads_advertiser_id) {
    return NextResponse.json({ error: "TikTok Ads não conectado" }, { status: 400 });
  }

  const connector = new TikTokAdsConnector(
    settings.tiktok_ads_access_token,
    settings.tiktok_ads_advertiser_id,
  );

  const { startDate, endDate } = getDateRange(30);

  try {
    const campanhas = await connector.fetchCampaigns(startDate, endDate);

    if (campanhas.length === 0) {
      return NextResponse.json({ synced: 0, message: "Nenhuma campanha encontrada" });
    }

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
      plataforma:       "tiktok",
      objective:        c.objective,
      data_inicio:      c.data_inicio,
      data_atualizacao: c.data_atualizacao,
    }));

    // DELETE + INSERT (evita conflito de índice parcial)
    await supabase.from("metricas_ads").delete()
      .eq("user_id", user.id).eq("plataforma", "tiktok");

    const { error } = await supabase.from("metricas_ads").insert(rows);

    if (error) throw error;

    return NextResponse.json({ synced: campanhas.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao sincronizar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
