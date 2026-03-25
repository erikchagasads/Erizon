import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function normalizeHotmartEvent(event: string): string {
  switch (event) {
    case "PURCHASE_COMPLETE":         return "purchase";
    case "PURCHASE_ABANDONED":        return "abandoned_cart";
    case "PURCHASE_REFUNDED":
    case "PURCHASE_CANCELED":         return "refund";
    case "SUBSCRIPTION_CANCELLATION": return "subscription_cancel";
    default:                          return event.toLowerCase();
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hottok = req.headers.get("x-hotmart-hottok") ?? "";

  // Busca integração ativa para este token
  const { data: integration } = await supabase
    .from("webhook_integrations")
    .select("user_id, secret")
    .eq("platform", "hotmart")
    .eq("ativo", true)
    .eq("secret", hottok)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const event = String(body.event ?? "");
  const data = (body.data ?? {}) as Record<string, unknown>;
  const purchase = (data.purchase ?? {}) as Record<string, unknown>;
  const buyer = (data.buyer ?? {}) as Record<string, unknown>;
  const tracking = (data.tracking ?? {}) as Record<string, unknown>;

  const priceObj = (purchase.price ?? {}) as Record<string, unknown>;
  const value = Number(priceObj.value ?? 0);
  const currency = String(priceObj.currency_value ?? "BRL");

  await supabase.from("webhook_events").insert({
    platform: "hotmart",
    event_type: normalizeHotmartEvent(event),
    value: value > 0 ? value : null,
    currency,
    customer_email: String(buyer.email ?? "").toLowerCase() || null,
    campaign_ref: String(tracking.source_sck ?? tracking.src ?? "") || null,
    user_id: integration.user_id,
    raw: body,
  });

  return NextResponse.json({ ok: true });
}
