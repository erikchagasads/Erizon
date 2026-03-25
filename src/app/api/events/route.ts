// POST /api/events — endpoint universal de eventos
// Usado por Zapier, Make, n8n ou qualquer sistema externo
// Autenticação: Bearer token (API key do usuário em user_settings)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logEvent, logError } from "@/lib/observability/logger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Eventos permitidos (valida para evitar dados inválidos)
const ALLOWED_EVENTS = new Set([
  "purchase", "abandoned_cart", "checkout_iniciado", "refund",
  "lead", "subscription", "subscription_cancel", "registration",
  "appointment", "contact", "view_content", "add_to_cart",
  "custom",
]);

export async function POST(req: NextRequest) {
  // Auth via Bearer token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "Token de autenticação obrigatório. Use: Authorization: Bearer SEU_TOKEN" }, { status: 401 });
  }

  // Busca usuário pelo api_key em user_settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("api_key", token)
    .maybeSingle();

  if (!settings?.user_id) {
    return NextResponse.json({ error: "Token inválido. Gere seu token em Configurações > Integrações." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido no body" }, { status: 400 });
  }

  const event = String(body.event ?? "").toLowerCase();
  if (!event) {
    return NextResponse.json({ error: "Campo 'event' obrigatório" }, { status: 400 });
  }

  if (!ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({
      error: `Evento '${event}' não reconhecido.`,
      allowed: [...ALLOWED_EVENTS],
    }, { status: 400 });
  }

  const value = body.value !== undefined ? Number(body.value) : null;
  const currency = String(body.currency ?? "BRL").toUpperCase();
  const platform = String(body.source ?? body.platform ?? "universal");
  const customerEmail = String(body.customer_email ?? body.email ?? "").toLowerCase() || null;
  const campaignRef = String(body.campaign ?? body.utm_campaign ?? body.campaign_ref ?? "") || null;

  logEvent("events.universal", { userId: settings.user_id, event, platform });

  const { data: inserted, error } = await supabase.from("webhook_events").insert({
    platform,
    event_type: event,
    value: value && value > 0 ? value : null,
    currency,
    customer_email: customerEmail,
    campaign_ref: campaignRef,
    user_id: settings.user_id,
    raw: body,
  }).select("id").single();

  if (error) {
    logError("events.universal.error", error);
    return NextResponse.json({ error: "Erro ao salvar evento" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    event,
    message: `Evento '${event}' registrado com sucesso.`,
  });
}

// GET — retorna documentação básica da API
export async function GET() {
  return NextResponse.json({
    name: "Erizon Universal Events API",
    version: "1.0",
    description: "Endpoint para enviar eventos de conversão de qualquer plataforma",
    authentication: "Bearer token (gerado em Configurações > Integrações)",
    endpoint: "POST /api/events",
    fields: {
      event: "OBRIGATÓRIO — tipo do evento (purchase, abandoned_cart, lead, etc.)",
      value: "Valor monetário (number) — ex: 297.00",
      currency: "Moeda — padrão: BRL",
      customer_email: "E-mail do cliente",
      campaign: "Nome da campanha UTM",
      source: "Plataforma de origem (ex: hotmart, zapier, crm)",
    },
    allowed_events: [
      "purchase", "abandoned_cart", "checkout_iniciado", "refund",
      "lead", "subscription", "subscription_cancel", "registration",
      "appointment", "contact", "view_content", "add_to_cart", "custom",
    ],
    example: {
      event: "purchase",
      value: 297.00,
      currency: "BRL",
      customer_email: "cliente@email.com",
      campaign: "meta-ads-leads-conversao",
      source: "hotmart",
    },
  });
}
