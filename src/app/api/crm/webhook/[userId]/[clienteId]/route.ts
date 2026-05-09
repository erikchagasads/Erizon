// POST /api/crm/webhook/[userId]/[clienteId]
// Endpoint pÃºblico â€” recebe leads de formulÃ¡rios externos (landing pages, RD Station, etc.)
// Captura UTMs da URL ou do body para rastrear origem exata do clique.
// Se o cliente tiver WhatsApp cadastrado, redireciona o lead direto para o WhatsApp.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import { novoLeadHtml } from "@/lib/email/templates";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function pickText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function parseBooleanFlag(value: unknown, fallback: boolean) {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "sim", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "nao", "off"].includes(normalized)) return false;
  return fallback;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; clienteId: string }> }
) {
  const { userId, clienteId } = await params;

  if (!userId || !clienteId) {
    return NextResponse.json({ error: "ParÃ¢metros invÃ¡lidos" }, { status: 400 });
  }

  // Aceita JSON ou form-urlencoded
  let body: Record<string, unknown> = {};
  const contentType = req.headers.get("content-type") ?? "";
  const redirectMode = req.headers.get("x-erizon-redirect-mode");

  try {
    if (contentType.includes("application/json")) {
      body = await req.json() as Record<string, unknown>;
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      formData.forEach((value, key) => { body[key] = String(value); });
    }
  } catch {
    body = {};
  }

  // UTMs da query string tÃªm prioridade sobre o body
  const { searchParams } = req.nextUrl;
  const utm = (key: string) => pickText(searchParams.get(key), body[key]);

  const nome = pickText(body.nome, body.name, body.full_name, body.nome_completo) ?? "Lead sem nome";
  const telefone = pickText(body.telefone, body.phone, body.whatsapp, body.celular);
  const email = pickText(body.email, body.e_mail);
  const campanha = pickText(body.campanha, body.campaign, body.campaign_name, utm("utm_campaign"), utm("campaign_name"));
  const plataforma = pickText(body.plataforma, body.platform, utm("utm_source")) ?? "manual";
  const conjuntoAnuncio = pickText(
    body.conjunto_anuncio,
    body.conjunto,
    body.adset,
    body.adset_name,
    body.ad_set_name,
    utm("utm_term"),
    utm("utm_adset"),
    utm("adset"),
    utm("adset_name")
  );
  const anuncio = pickText(
    body.anuncio,
    body.ad,
    body.ad_name,
    utm("utm_content"),
    utm("utm_ad"),
    utm("ad"),
    utm("ad_name")
  );
  const mensagemTemplate = pickText(
    searchParams.get("mensagem_template"),
    body.mensagem_template,
    body.message_template,
    body.whatsapp_mensagem,
    body.opening_message,
    body.message
  );
  const appendAdReference = parseBooleanFlag(
    searchParams.get("anexar_referencia_anuncio")
      ?? body.anexar_referencia_anuncio
      ?? body.append_ad_reference
      ?? body.appendAdReference,
    true
  );

  // Busca cliente
  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from("clientes")
    .select("id, whatsapp, whatsapp_mensagem")
    .eq("id", clienteId)
    .eq("user_id", userId)
    .maybeSingle();

  // Se falhar por colunas inexistentes, tenta sÃ³ com id
  const clienteOk = cliente ?? (clienteError
    ? (await supabaseAdmin.from("clientes").select("id").eq("id", clienteId).eq("user_id", userId).maybeSingle()).data
    : null);

  if (!clienteOk) {
    return NextResponse.json({ error: "Cliente nÃ£o encontrado" }, { status: 404 });
  }

  const whatsapp = (cliente as Record<string, string> | null)?.whatsapp ?? null;
  const whatsapp_mensagem = (cliente as Record<string, string> | null)?.whatsapp_mensagem ?? null;

  // Salva o lead
  const { error } = await supabaseAdmin
    .from("crm_leads")
    .insert({
      user_id:       userId,
      cliente_id:    clienteId,
      nome,
      telefone,
      email,
      campanha_nome: campanha,
      plataforma,
      utm_source:    utm("utm_source"),
      utm_medium:    utm("utm_medium"),
      utm_campaign:  utm("utm_campaign"),
      utm_content:   utm("utm_content"),
      utm_term:      utm("utm_term"),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // â”€â”€ Notificar o usuÃ¡rio por email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(userId);
  const userEmail = userRow?.user?.email;
  if (userEmail && process.env.RESEND_API_KEY) {
    sendEmail({
      to: userEmail,
      subject: `Novo lead: ${nome}`,
      html: novoLeadHtml({
        nome,
        email: email ?? undefined,
        telefone: telefone ?? undefined,
        campanha: campanha ?? undefined,
        plataforma,
      }),
    }).catch(() => {});
  }

  // â”€â”€ Redirect para WhatsApp do cliente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Prioridade: 1) WhatsApp cadastrado no cliente, 2) redirect_url manual no body
  if (whatsapp) {
    const numero = whatsapp.replace(/\D/g, "");

    // Mensagem padrÃ£o ou personalizada
    const referenciaAnuncio = conjuntoAnuncio ?? anuncio ?? campanha;
    const mensagemBase = mensagemTemplate
      ?? whatsapp_mensagem
      ?? (referenciaAnuncio
        ? `Ola! Vi seu anuncio sobre "${referenciaAnuncio}" e tenho interesse. Pode me passar mais informacoes?`
        : "Ola! Tenho interesse e gostaria de mais informacoes.");

    // Substitui variÃ¡veis dinÃ¢micas na mensagem
    const temPlaceholderDeOrigem = /\{(campanha|conjunto|conjunto_anuncio|adset|anuncio|ad)\}/i.test(mensagemBase);
    const mensagemComVariaveis = mensagemBase
      .replaceAll("{nome}", nome)
      .replaceAll("{campanha}", campanha ?? "")
      .replaceAll("{telefone}", telefone ?? "")
      .replaceAll("{conjunto}", conjuntoAnuncio ?? "")
      .replaceAll("{conjunto_anuncio}", conjuntoAnuncio ?? "")
      .replaceAll("{adset}", conjuntoAnuncio ?? "")
      .replaceAll("{anuncio}", anuncio ?? "")
      .replaceAll("{ad}", anuncio ?? "");

    const mensagem = !temPlaceholderDeOrigem && referenciaAnuncio && appendAdReference
      ? `${mensagemComVariaveis}\n\nReferencia do anuncio: ${referenciaAnuncio}`
      : mensagemComVariaveis;

    const waUrl = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
    if (redirectMode === "json") {
      return NextResponse.json({ ok: true, redirectTo: waUrl });
    }
    return NextResponse.redirect(waUrl, 302);
  }

  // Redirect manual se nÃ£o tiver WhatsApp configurado
  const redirectUrl = pickText(searchParams.get("redirect_url"), body.redirect_url);
  if (redirectUrl) {
    return NextResponse.redirect(redirectUrl, 302);
  }

  return NextResponse.json({ ok: true, message: "Lead recebido com sucesso" }, { status: 201 });
}

// GET â€” Ãºtil para testar o webhook via browser
export async function GET() {
  return NextResponse.json({ status: "Webhook ativo. Use POST para enviar leads." });
}

