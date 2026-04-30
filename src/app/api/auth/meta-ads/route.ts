import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/settings/integracoes";
  }
  return value;
}

export async function GET(req: NextRequest) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=meta_not_configured`);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get("return_to"));

  const cookieStore = await cookies();
  cookieStore.set("oauth_state_meta", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("oauth_return_meta", returnTo, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${APP_URL}/api/auth/meta-ads/callback`,
    response_type: "code",
    scope: "ads_read,ads_management,business_management",
    state,
  });

  return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
}
