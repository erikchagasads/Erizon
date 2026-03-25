// src/app/api/instagram/route.ts
// Busca dados reais do Instagram Business via Graph API v19.0
// Usa o System User Token do BM armazenado em user_configs.meta_access_token

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const GRAPH = "https://graph.facebook.com/v19.0";

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

async function gapi(path: string, token: string) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${GRAPH}${path}${sep}access_token=${token}`);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message ?? `Graph API error ${res.status}`);
  }
  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const igUserId = searchParams.get("ig_user_id");
  const period   = searchParams.get("period") ?? "30d";

  if (!igUserId) return err("ig_user_id obrigatório");

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return err("Não autenticado", 401);

  // Buscar token — mesma lógica do ads-sync
  // 1. Tenta bm_accounts (fonte principal)
  let token: string | null = null;
  const { data: bms } = await supabase
    .from("bm_accounts")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (bms?.access_token) {
    token = bms.access_token;
  } else {
    // 2. Fallback: user_settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("meta_access_token")
      .eq("user_id", user.id)
      .maybeSingle();
    token = settings?.meta_access_token ?? null;
  }

  if (!token) return err("Token Meta não configurado. Acesse Configurações → Integrações.", 400);

  const days  = period === "7d" ? 7 : 30; // Graph API limita a 30 dias por chamada
  const since = Math.floor((Date.now() - days * 86_400_000) / 1000);
  const until = Math.floor(Date.now() / 1000);

  try {
    // 1. Dados básicos da conta
    const account = await gapi(
      `/${igUserId}?fields=username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website`,
      token
    );

    // 2. Insights da conta
    const insightsRaw = await gapi(
      `/${igUserId}/insights?metric=reach&period=day&since=${since}&until=${until}`,
      token
    );

    // Organizar reach por data
    const byDate: Record<string, number> = {};
    for (const metric of (insightsRaw.data ?? [])) {
      if (metric.name !== "reach") continue;
      for (const val of (metric.values ?? [])) {
        const date = val.end_time?.slice(0, 10) ?? "";
        byDate[date] = (byDate[date] ?? 0) + (val.value ?? 0);
      }
    }

    // Buscar profile_views e total_interactions com metric_type=total_value
    let totalViews = 0;
    let totalImpressions = 0;
    try {
      const [pvRaw, tiRaw] = await Promise.all([
        gapi(`/${igUserId}/insights?metric=profile_views&metric_type=total_value&period=day&since=${since}&until=${until}`, token),
        gapi(`/${igUserId}/insights?metric=total_interactions&metric_type=total_value&period=day&since=${since}&until=${until}`, token),
      ]);
      // profile_views e total_interactions retornam em total_value.value
      for (const m of (pvRaw.data ?? [])) {
        if (m.name === "profile_views") totalViews = m.total_value?.value ?? 0;
      }
      for (const m of (tiRaw.data ?? [])) {
        if (m.name === "total_interactions") totalImpressions = m.total_value?.value ?? 0;
      }
    } catch { /* métrica pode não estar disponível */ }

    const timeline = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, reach]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        reach,
        impressions: 0,
        profile_views: 0,
      }));

    const totalReach = timeline.reduce((s, d) => s + d.reach, 0);

    // 3. Top posts
    const mediaList = await gapi(
      `/${igUserId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count&limit=12`,
      token
    );

    const topPosts = await Promise.all(
      (mediaList.data ?? []).slice(0, 6).map(async (post: Record<string, unknown>) => {
        try {
          const insights = await gapi(`/${post.id}/insights?metric=reach,saved,shares`, token);
          const getMetric = (name: string) =>
            insights.data?.find((d: Record<string, unknown>) => d.name === name)?.values?.[0]?.value ?? 0;
          return {
            id: post.id,
            caption: (post.caption as string)?.slice(0, 80) ?? "",
            type: post.media_type as string,
            date: new Date(post.timestamp as string).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            likes: (post.like_count as number) ?? 0,
            comments: (post.comments_count as number) ?? 0,
            reach: getMetric("reach"),
            impressions: getMetric("impressions"),
            saved: getMetric("saved"),
            shares: getMetric("shares"),
          };
        } catch { return null; }
      })
    );

    // 4. Audiência — nova API com breakdown
    let audience = null;
    try {
      const [ageRaw, cityRaw] = await Promise.all([
        gapi(`/${igUserId}/insights?metric=follower_demographics&metric_type=total_value&period=lifetime&timeframe=this_month&breakdown=age,gender`, token),
        gapi(`/${igUserId}/insights?metric=follower_demographics&metric_type=total_value&period=lifetime&timeframe=this_month&breakdown=city`, token),
      ]);

      const ageResults = ageRaw.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
      const ageMap: Record<string, number> = {};
      let totalF = 0, totalM = 0;
      for (const item of ageResults) {
        const age    = item.dimension_values?.[0] ?? "?";
        const gender = item.dimension_values?.[1] ?? "";
        const n      = item.value ?? 0;
        ageMap[age]  = (ageMap[age] ?? 0) + n;
        if (gender === "F") totalF += n; else totalM += n;
      }
      const total = totalF + totalM || 1;

      const cityResults = cityRaw.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
      const topCities = cityResults
        .sort((a: Record<string,unknown>, b: Record<string,unknown>) => (b.value as number) - (a.value as number))
        .slice(0, 5)
        .map((c: Record<string,unknown>) => String((c.dimension_values as string[])?.[0] ?? ""));

      audience = {
        gender: { female: Math.round((totalF / total) * 100), male: Math.round((totalM / total) * 100) },
        ages: Object.entries(ageMap).sort(([a], [b]) => a.localeCompare(b)).map(([label, n]) => ({ label, pct: Math.round((n / total) * 100) })),
        topCities,
      };
    } catch { /* sem permissão ou dados indisponíveis */ }

    return NextResponse.json({
      account,
      summary: {
        reach: totalReach,
        impressions: totalImpressions,
        profileViews: totalViews,
        followers: account.followers_count ?? 0,
        mediaCount: account.media_count ?? 0,
      },
      timeline,
      topPosts: topPosts.filter(Boolean),
      audience,
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao buscar dados do Instagram";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
