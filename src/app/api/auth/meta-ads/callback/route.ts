import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const META_GRAPH = "https://graph.facebook.com/v19.0";

function redirectWith(APP_URL: string, path: string, key: "success" | "error", value: string) {
  const url = new URL(path, APP_URL);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

function safeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/settings/integracoes";
  }
  return value;
}

async function exchangeCodeForToken(code: string, APP_URL: string) {
  const tokenRes = await fetch(`${META_GRAPH}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: `${APP_URL}/api/auth/meta-ads/callback`,
      code,
    }),
  });

  if (!tokenRes.ok) return null;
  return tokenRes.json() as Promise<{ access_token?: string }>;
}

async function exchangeForLongLivedToken(shortToken: string) {
  const res = await fetch(`${META_GRAPH}/oauth/access_token?${new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  })}`);

  if (!res.ok) return shortToken;
  const json = await res.json() as { access_token?: string };
  return json.access_token ?? shortToken;
}

async function resolveFirstAdAccount(accessToken: string): Promise<string | null> {
  const url = new URL(`${META_GRAPH}/me/adaccounts`);
  url.searchParams.set("fields", "id,account_status");
  url.searchParams.set("limit", "25");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json() as { data?: Array<{ id?: string; account_status?: number }> };
  const accounts = Array.isArray(json.data) ? json.data : [];
  return accounts.find((account) => account.account_status === 1)?.id ?? accounts[0]?.id ?? null;
}

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const returnTo = safeReturnTo(cookieStore.get("oauth_return_meta")?.value);

  if (error || !code) {
    return redirectWith(APP_URL, returnTo, "error", "meta_denied");
  }

  const savedState = cookieStore.get("oauth_state_meta")?.value;
  if (!savedState || savedState !== state) {
    return redirectWith(APP_URL, returnTo, "error", "meta_state");
  }

  const token = await exchangeCodeForToken(code, APP_URL);
  if (!token?.access_token) {
    return redirectWith(APP_URL, returnTo, "error", "meta_token");
  }

  const response = redirectWith(APP_URL, returnTo, "success", "meta");
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(list) {
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login`);

  const accessToken = await exchangeForLongLivedToken(token.access_token);
  const adAccountId = await resolveFirstAdAccount(accessToken);

  await supabase.from("user_settings").upsert({
    user_id: user.id,
    meta_access_token: accessToken,
    meta_ad_account_id: adAccountId,
  }, { onConflict: "user_id" });

  response.cookies.delete("oauth_state_meta");
  response.cookies.delete("oauth_return_meta");
  return response;
}
