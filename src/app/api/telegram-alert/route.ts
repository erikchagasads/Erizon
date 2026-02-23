// src/app/api/telegram-alert/route.ts
// Rota usada pelo onboarding (Passo 3) para testar o Telegram do usuário.
// Diferente do /api/check-alerts (que roda alertas automáticos),
// esta rota apenas envia uma mensagem avulsa para um chat_id específico.

import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_API = "https://api.telegram.org";

export async function POST(req: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN não configurado no servidor." },
        { status: 500 }
      );
    }

    // Valida body
    let body: { chatId?: string; msg?: string; campanha?: string; sinal?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Body inválido — envie JSON com chatId e msg." },
        { status: 400 }
      );
    }

    const { chatId, msg, campanha, sinal } = body;

    if (!chatId?.trim()) {
      return NextResponse.json(
        { error: "chatId é obrigatório." },
        { status: 400 }
      );
    }

    const texto =
      msg ??
      `🔔 *Alerta Erizon*\n📢 *${campanha ?? "Campanha"}*\n⚡ ${sinal ?? "Verificar painel"}`;

    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id:    chatId.trim(),
        text:       texto,
        parse_mode: "Markdown",
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      // Telegram retorna 400 para chat_id inválido
      return NextResponse.json(
        { error: data.description ?? "Telegram recusou a mensagem." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("POST /api/telegram-alert:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}