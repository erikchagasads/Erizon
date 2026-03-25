// POST /api/crm/webhook/[userId]/[clienteId]
// Endpoint público — recebe leads de formulários externos (landing pages, RD Station, etc.)
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; clienteId: string }> }
) {
  const { userId, clienteId } = await params;

  if (!userId || !clienteId) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  // Aceita JSON ou form-urlencoded
  let body: Record<string, string> = {};
  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      body = await req.json() as Record<string, string>;
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      formData.forEach((value, key) => { body[key] = String(value); });
    }
  } catch {
    body = {};
  }

  // UTMs da query string têm prioridade sobre o body
  const { searchParams } = req.nextUrl;
  const utm = (key: string) => searchParams.get(key) ?? body[key] ?? null;

  const nome      = body.nome ?? body.name ?? body.full_name ?? body.nome_completo ?? "Lead sem nome";
  const telefone  = body.telefone ?? body.phone ?? body.whatsapp ?? body.celular ?? null;
  const email     = body.email ?? body.e_mail ?? null;
  const campanha  = body.campanha ?? body.campaign ?? utm("utm_campaign") ?? null;
  const plataforma = body.plataforma ?? body.platform ?? utm("utm_source") ?? "manual";

  // Busca cliente
  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from("clientes")
    .select("id, whatsapp, whatsapp_mensagem")
    .eq("id", clienteId)
    .eq("user_id", userId)
    .maybeSingle();

  // Se falhar por colunas inexistentes, tenta só com id
  const clienteOk = cliente ?? (clienteError
    ? (await supabaseAdmin.from("clientes").select("id").eq("id", clienteId).eq("user_id", userId).maybeSingle()).data
    : null);

  if (!clienteOk) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
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

  // ── Notificar o usuário por email ──────────────────────────────────────────
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

  // ── Redirect para WhatsApp do cliente ──────────────────────────────────────
  // Prioridade: 1) WhatsApp cadastrado no cliente, 2) redirect_url manual no body
  if (whatsapp) {
    const numero = whatsapp.replace(/\D/g, "");

    // Mensagem padrão ou personalizada
    const mensagemBase = whatsapp_mensagem
      ? whatsapp_mensagem
      : (utm("utm_content") ?? campanha)
        ? `Olá! Vi o anúncio "${utm("utm_content") ?? campanha}" e tenho interesse. Pode me passar mais informações?`
        : "Olá! Tenho interesse e gostaria de mais informações.";

    // Substitui variáveis dinâmicas na mensagem
    const mensagem = mensagemBase
      .replace("{nome}",     nome)
      .replace("{campanha}", campanha ?? "")
      .replace("{telefone}", telefone ?? "");

    const waUrl = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
    return NextResponse.redirect(waUrl, 302);
  }

  // Redirect manual se não tiver WhatsApp configurado
  const redirectUrl = body.redirect_url ?? searchParams.get("redirect_url");
  if (redirectUrl) {
    return NextResponse.redirect(redirectUrl, 302);
  }

  return NextResponse.json({ ok: true, message: "Lead recebido com sucesso" }, { status: 201 });
}

// GET — útil para testar o webhook via browser
export async function GET() {
  return NextResponse.json({ status: "Webhook ativo. Use POST para enviar leads." });
}
