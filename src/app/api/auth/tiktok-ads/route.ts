// GET /api/auth/tiktok-ads — inicia OAuth2 TikTok
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET() {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

  if (!process.env.TIKTOK_ADS_APP_ID || !process.env.TIKTOK_ADS_APP_SECRET) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=tiktok_not_configured`);
  }

  const state = crypto.randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("oauth_state_tiktok", state, {
    httpOnly: true, sameSite: "lax", maxAge: 600, path: "/",
  });

  const params = new URLSearchParams({
    app_id:       process.env.TIKTOK_ADS_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok-ads/callback`,
    state,
  });

  return NextResponse.redirect(
    `https://business-api.tiktok.com/portal/auth?${params}`
  );
}
