// src/app/api/leads/webhook/route.ts
// Webhook que recebe leads do n8n (via Evolution API)
// O n8n chama esse endpoint quando chega mensagem nova no WhatsApp

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mapeamento de texto da mensagem → campanha
// O texto vem preenchido automaticamente pelo link do anúncio
// Ex: wa.me/5511999999?text=Vim+pelo+anuncio+Nome+da+Campanha
function extrairCampanha(mensagem: string): string {
  const lower = mensagem.toLowerCase();
  if (lower.includes("vim pelo anuncio")) {
    const partes = mensagem.split(/vim pelo anuncio/i);
    return partes[1]?.trim() ?? "";
  }
  if (lower.includes("anuncio:")) {
    return mensagem.split(/anuncio:/i)[1]?.trim() ?? "";
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    // Verifica token de segurança (opcional mas recomendado)
    const authHeader = req.headers.get("authorization");
    const token = process.env.WEBHOOK_SECRET;
    if (token && authHeader !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Suporta dois formatos:
    // 1. Direto do n8n: { user_id, telefone, mensagem, canal, campanha_nome? }
    // 2. Evolution API via n8n: { data: { key: { remoteJid }, message: { conversation } } }

    let telefone    = "";
    let mensagem    = "";
    let canal       = "whatsapp";
    let userId      = "";
    let campanhaNome = "";
    let clienteId   = "";

    if (body.user_id) {
      // Formato direto do n8n (recomendado — mais controle)
      userId       = body.user_id;
      telefone     = body.telefone ?? "";
      mensagem     = body.mensagem ?? body.mensagem_original ?? "";
      canal        = body.canal ?? "whatsapp";
      campanhaNome = body.campanha_nome ?? extrairCampanha(mensagem);
      clienteId    = body.cliente_id ?? "";
    } else if (body.data?.key?.remoteJid) {
      // Formato Evolution API raw
      // Nesse caso user_id deve vir como query param: /api/leads/webhook?user_id=xxx
      const url    = new URL(req.url);
      userId       = url.searchParams.get("user_id") ?? "";
      telefone     = body.data.key.remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
      mensagem     = body.data.message?.conversation ?? body.data.message?.extendedTextMessage?.text ?? "";
      canal        = "whatsapp";
      campanhaNome = extrairCampanha(mensagem);
      clienteId    = url.searchParams.get("cliente_id") ?? "";
    }

    if (!userId) {
      return NextResponse.json({ error: "user_id obrigatório" }, { status: 400 });
    }

    // Busca campanha pelo nome se não veio ID direto
    let campanhaId = body.campanha_id ?? null;
    if (!campanhaId && campanhaNome) {
      const { data: camp } = await supabase
        .from("metricas_ads")
        .select("id,nome_campanha,cliente_id")
        .eq("user_id", userId)
        .ilike("nome_campanha", `%${campanhaNome}%`)
        .limit(1)
        .single();

      if (camp) {
        campanhaId = camp.id;
        if (!clienteId) clienteId = camp.cliente_id ?? "";
      }
    }

    // Busca nome do cliente
    let clienteNome = body.cliente_nome ?? "";
    if (!clienteNome && clienteId) {
      const { data: cliente } = await supabase
        .from("clientes")
        .select("nome,nome_cliente")
        .eq("id", clienteId)
        .single();
      if (cliente) clienteNome = cliente.nome_cliente ?? cliente.nome ?? "";
    }

    // Evita duplicata do mesmo telefone na mesma campanha nas últimas 2h
    if (telefone && campanhaId) {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: existente } = await supabase
        .from("leads")
        .select("id")
        .eq("user_id", userId)
        .eq("telefone", telefone)
        .eq("campanha_id", campanhaId)
        .gte("created_at", twoHoursAgo)
        .limit(1)
        .single();

      if (existente) {
        return NextResponse.json({ ok: true, duplicata: true, message: "Lead já registrado recentemente" });
      }
    }

    // Insere o lead
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        user_id:            userId,
        cliente_id:         clienteId || null,
        campanha_id:        campanhaId || null,
        campanha_nome:      campanhaNome || null,
        cliente_nome:       clienteNome || null,
        telefone:           telefone || null,
        mensagem_original:  mensagem || null,
        canal,
        status: "novo",
      })
      .select()
      .single();

    if (error) throw error;

    // ── ENA Attribution: registra touchpoint 'lead' (sem PII) ────────────────
    if (lead && telefone) {
      try {
        // Hash anônimo do telefone (sem depender de crypto nativo — compatível com edge)
        const encoder = new TextEncoder();
        const data    = encoder.encode(telefone.trim());
        const hashBuf = await crypto.subtle.digest("SHA-256", data);
        const hashArr = Array.from(new Uint8Array(hashBuf));
        const contactHash = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");

        // Busca workspaceId pelo userId (para routing da attribution)
        const { data: wsMember } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();

        if (wsMember?.workspace_id) {
          await supabase.from("attribution_touchpoints").insert({
            workspace_id:    wsMember.workspace_id,
            campaign_id:     campanhaId  || null,
            stage:           "lead",
            contact_hash:    contactHash,
            contact_channel: canal,
            lead_id:         lead.id,
            utm_campaign:    campanhaNome || null,
            occurred_at:     new Date().toISOString(),
          });
        }
      } catch { /* Attribution é best-effort — não bloqueia o lead */ }
    }

    return NextResponse.json({ ok: true, lead });

  } catch (err: unknown) {
    console.error("Webhook leads error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}

// GET para testar se o webhook está funcionando
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Webhook de leads Erizon ativo",
    uso: "POST /api/leads/webhook com { user_id, telefone, mensagem, canal, campanha_nome }",
  });
}