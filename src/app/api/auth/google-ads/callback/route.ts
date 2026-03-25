// GET /api/auth/google-ads/callback — troca code por tokens
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=google_denied`);
  }

  const cookieStore = await cookies();
  const savedState  = cookieStore.get("oauth_state_google")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=google_state`);
  }

  // Troca code por tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      redirect_uri:  `${APP_URL}/api/auth/google-ads/callback`,
      grant_type:    "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=google_token`);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
  };

  // Salva no Supabase
  const response = NextResponse.redirect(`${APP_URL}/settings/integracoes?success=google`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()           { return cookieStore.getAll(); },
        setAll(list)       { list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  await supabase.from("user_settings").upsert({
    user_id:                   user.id,
    google_ads_access_token:   tokens.access_token,
    google_ads_refresh_token:  tokens.refresh_token ?? null,
    google_ads_developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? null,
  }, { onConflict: "user_id" });

  cookieStore.delete("oauth_state_google");
  return response;
}
