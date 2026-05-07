// POST /api/google-ads-sync - manual sync
// GET  /api/google-ads-sync - Vercel cron sync for all connected users
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isCronAuthorized } from "@/lib/cron-auth";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  syncAllGoogleAds,
  syncGoogleAdsForUser,
} from "@/services/platform-ads-sync-service";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { data: settings, error } = await supabase
    .from("user_settings")
    .select("user_id, google_ads_access_token, google_ads_refresh_token, google_ads_customer_id, google_ads_developer_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!settings) return NextResponse.json({ error: "Google Ads nao conectado" }, { status: 400 });

  try {
    const result = await syncGoogleAdsForUser(supabase, settings);
    return NextResponse.json({ synced: result.synced, message: result.message });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao sincronizar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllGoogleAds(createServerSupabase());
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao sincronizar Google Ads";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
