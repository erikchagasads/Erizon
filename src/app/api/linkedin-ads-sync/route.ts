// POST /api/linkedin-ads-sync — sincroniza campanhas LinkedIn Ads
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { LinkedInAdsConnector } from "@/connectors/linkedin-ads/LinkedInAdsConnector";

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
    .select("linkedin_ads_access_token, linkedin_ads_refresh_token, linkedin_ads_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.linkedin_ads_access_token) {
    return NextResponse.json({ error: "LinkedIn Ads não conectado" }, { status: 400 });
  }

  let accessToken = settings.linkedin_ads_access_token;

  // Tenta renovar token
  if (settings.linkedin_ads_refresh_token) {
    try {
      const refreshed = await LinkedInAdsConnector.refreshAccessToken(settings.linkedin_ads_refresh_token);
      accessToken = refreshed.accessToken;
      await supabase.from("user_settings").update({
        linkedin_ads_access_token:  refreshed.accessToken,
        linkedin_ads_refresh_token: refreshed.refreshToken,
      }).eq("user_id", user.id);
    } catch {
      // usa token atual
    }
  }

  const connector = new LinkedInAdsConnector(
    accessToken,
    settings.linkedin_ads_account_id ?? "",
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
      plataforma:       "linkedin",
      objective:        c.objective,
      data_inicio:      c.data_inicio,
      data_atualizacao: c.data_atualizacao,
    }));

    // DELETE + INSERT (evita conflito de índice parcial)
    await supabase.from("metricas_ads").delete()
      .eq("user_id", user.id).eq("plataforma", "linkedin");

    const { error } = await supabase.from("metricas_ads").insert(rows);

    if (error) throw error;

    return NextResponse.json({ synced: campanhas.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao sincronizar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
