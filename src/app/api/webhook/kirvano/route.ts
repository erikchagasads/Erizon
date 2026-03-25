import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyHmacSha256, type WebhookEventNormalized } from "@/lib/webhook-utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-kirvano-signature") ?? "";

  const { data: integrations } = await supabase
    .from("webhook_integrations")
    .select("user_id, secret")
    .eq("platform", "kirvano")
    .eq("ativo", true);

  const integration = (integrations ?? []).find(i =>
    verifyHmacSha256(rawBody, i.secret, signature)
  );

  if (!integration) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const eventType = String(body.event ?? body.type ?? "");
  const data = (body.data ?? body) as Record<string, unknown>;

  const typeMap: Record<string, string> = {
    "purchase.approved": "purchase",
    "purchase.refunded": "refund",
    "purchase.abandoned": "abandoned_cart",
    "subscription.canceled": "subscription_cancel",
  };

  const normalized: Omit<WebhookEventNormalized, "platform"> = {
    event_type: typeMap[eventType] ?? eventType,
    value: Number(data.amount ?? data.value ?? data.total ?? 0) || null,
    currency: String(data.currency ?? "BRL"),
    customer_email: String(data.customer_email ?? data.email ?? "").toLowerCase() || null,
    campaign_ref: String(data.utm_campaign ?? data.campaign ?? "") || null,
    raw: body,
  };

  await supabase.from("webhook_events").insert({
    platform: "kirvano",
    user_id: integration.user_id,
    ...normalized,
  });

  return NextResponse.json({ ok: true });
}
