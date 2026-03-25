// GET /api/auth/linkedin-ads/callback
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
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=linkedin_denied`);
  }

  const cookieStore = await cookies();
  const savedState  = cookieStore.get("oauth_state_linkedin")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=linkedin_state`);
  }

  // Troca code por tokens
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  `${APP_URL}/api/auth/linkedin-ads/callback`,
      client_id:     process.env.LINKEDIN_ADS_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_ADS_CLIENT_SECRET!,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=linkedin_token`);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
  };

  // Busca account ID do usuário
  const accountRes = await fetch(
    "https://api.linkedin.com/v2/adAccountsV2?q=search&search.type.values[0]=BUSINESS&count=1",
    { headers: { "Authorization": `Bearer ${tokens.access_token}`, "LinkedIn-Version": "202405" } }
  );

  let accountId: string | null = null;
  if (accountRes.ok) {
    const accountJson = await accountRes.json() as { elements?: Array<{ id: number }> };
    accountId = String(accountJson.elements?.[0]?.id ?? "");
  }

  const response = NextResponse.redirect(`${APP_URL}/settings/integracoes?success=linkedin`);
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
    user_id:                    user.id,
    linkedin_ads_access_token:  tokens.access_token,
    linkedin_ads_refresh_token: tokens.refresh_token ?? null,
    linkedin_ads_account_id:    accountId,
  }, { onConflict: "user_id" });

  cookieStore.delete("oauth_state_linkedin");
  return response;
}
