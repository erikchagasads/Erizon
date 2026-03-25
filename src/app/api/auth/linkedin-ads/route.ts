// GET /api/auth/linkedin-ads — inicia OAuth2 LinkedIn
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET() {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

  if (!process.env.LINKEDIN_ADS_CLIENT_ID || !process.env.LINKEDIN_ADS_CLIENT_SECRET) {
    return NextResponse.redirect(`${APP_URL}/settings/integracoes?error=linkedin_not_configured`);
  }

  const state = crypto.randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("oauth_state_linkedin", state, {
    httpOnly: true, sameSite: "lax", maxAge: 600, path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     process.env.LINKEDIN_ADS_CLIENT_ID!,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin-ads/callback`,
    state,
    scope:         "r_ads r_ads_reporting rw_ads",
  });

  return NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params}`
  );
}
