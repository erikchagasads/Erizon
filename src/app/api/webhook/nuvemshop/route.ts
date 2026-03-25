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
  const signature = req.headers.get("x-linkedstore-hmac-sha256") ?? "";

  const { data: integrations } = await supabase
    .from("webhook_integrations")
    .select("user_id, secret")
    .eq("platform", "nuvemshop")
    .eq("ativo", true);

  const integration = (integrations ?? []).find(i =>
    verifyHmacSha256Base64(rawBody, i.secret, signature)
  );

  if (!integration) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const event = String(body.event ?? "");
  const eventMap: Record<string, string> = {
    "order/paid":       "purchase",
    "order/cancelled":  "refund",
    "order/created":    "checkout_iniciado",
  };

  const customerField = body.contact_email ?? body.customer;
  let email = "";
  if (typeof customerField === "string") {
    email = customerField;
  } else if (customerField !== null && typeof customerField === "object") {
    email = String((customerField as Record<string, unknown>).email ?? "");
  }

  const normalized: Omit<WebhookEventNormalized, "platform"> = {
    event_type: eventMap[event] ?? event,
    value: Number(body.total ?? body.subtotal ?? 0) || null,
    currency: String(body.currency ?? "BRL"),
    customer_email: email.toLowerCase() || null,
    campaign_ref: null,
    raw: body,
  };

  await supabase.from("webhook_events").insert({
    platform: "nuvemshop",
    user_id: integration.user_id,
    ...normalized,
  });

  return NextResponse.json({ ok: true });
}
