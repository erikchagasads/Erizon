// GET /api/auth/google-ads — inicia OAuth2 Google Ads
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET() {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

  if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=google_not_configured`);
  }

  const state = crypto.randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("oauth_state_google", state, {
    httpOnly: true, sameSite: "lax", maxAge: 600, path: "/",
  });

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_ADS_CLIENT_ID!,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-ads/callback`,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/adwords",
    access_type:   "offline",
    prompt:        "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
