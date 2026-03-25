// GET /api/auth/tiktok-ads/callback
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const authCode = searchParams.get("auth_code");
  const state    = searchParams.get("state");
  const APP_URL  = process.env.NEXT_PUBLIC_APP_URL!;

  if (!authCode) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=tiktok_denied`);
  }

  const cookieStore = await cookies();
  const savedState  = cookieStore.get("oauth_state_tiktok")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=tiktok_state`);
  }

  // Troca auth_code por access_token
  const tokenRes = await fetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id:     process.env.TIKTOK_ADS_APP_ID!,
      secret:     process.env.TIKTOK_ADS_APP_SECRET!,
      auth_code:  authCode,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=tiktok_token`);
  }

  const tokenJson = await tokenRes.json() as {
    data?: {
      access_token: string;
      advertiser_ids: string[];
    };
  };

  const accessToken   = tokenJson.data?.access_token;
  const advertiserId  = tokenJson.data?.advertiser_ids?.[0];

  if (!accessToken) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=tiktok_token`);
  }

  const response = NextResponse.redirect(`${APP_URL}/settings/integracoes?success=tiktok`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()     { return cookieStore.getAll(); },
        setAll(list) { list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  await supabase.from("user_settings").upsert({
    user_id:                  user.id,
    tiktok_ads_access_token:  accessToken,
    tiktok_ads_advertiser_id: advertiserId ?? null,
  }, { onConflict: "user_id" });

  cookieStore.delete("oauth_state_tiktok");
  return response;
}
