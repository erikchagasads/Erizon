import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyHmacSha256Base64, type WebhookEventNormalized } from "@/lib/webhook-utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature  = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const topic      = req.headers.get("x-shopify-topic") ?? "";
  const shopDomain = req.headers.get("x-shopify-shop-domain") ?? "";

  const { data: integrations } = await supabase
    .from("webhook_integrations")
    .select("user_id, secret, shop_domain")
    .eq("platform", "shopify")
    .eq("ativo", true);

  const integration = (integrations ?? []).find(i =>
    (!i.shop_domain || i.shop_domain === shopDomain) &&
    verifyHmacSha256Base64(rawBody, i.secret, signature)
  );

  if (!integration) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const topicMap: Record<string, string> = {
    "orders/paid":        "purchase",
    "orders/refunded":    "refund",
    "checkouts/create":   "checkout_iniciado",
    "checkouts/update":   "checkout_update",
  };

  const customer = (body.customer ?? body.billing_address ?? {}) as Record<string, unknown>;
  const noteAttributes = body.note_attributes as Array<{ name: string; value: string }> | undefined;
  const utmParams = (noteAttributes ?? []).find(a => a.name === "utm_campaign")?.value ?? null;

  const normalized: Omit<WebhookEventNormalized, "platform"> = {
    event_type: topicMap[topic] ?? topic.replace("/", "_"),
    value: Number(body.total_price ?? body.subtotal_price ?? 0) || null,
    currency: String(body.currency ?? "BRL"),
    customer_email: String(customer.email ?? body.email ?? "").toLowerCase() || null,
    campaign_ref: utmParams,
    raw: body,
  };

  await supabase.from("webhook_events").insert({
    platform: "shopify",
    user_id: integration.user_id,
    ...normalized,
  });

  return NextResponse.json({ ok: true });
}
