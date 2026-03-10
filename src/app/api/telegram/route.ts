// src/app/api/telegram/route.ts
// Endpoint unificado de Telegram — substitui /api/report e /api/notify.
//
// Modos:
//   tipo: "alerta"   → mensagem de alerta de campanha (ex-notify.ts)
//   tipo: "relatorio" → relatório de performance (ex-report.ts)
//   tipo: "custom"   → mensagem livre via campo `msg`
//
// chatId: obrigatório. Sempre passe o chat_id do usuário salvo no banco.
// O endpoint NÃO usa TELEGRAM_CHAT_ID do env — cada usuário tem o seu.

import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_API = "https://api.telegram.org";

function buildTextoAlerta({
  campanha, sinal, msg,
}: { campanha?: string; sinal?: string; msg?: string }): string {
  return (
    `🚨 *ALERTA CRÍTICO: Erizon*\n\n` +
    `*Campanha:* ${campanha ?? "N/A"}\n` +
    `*Sinal:* ${sinal ?? "Alerta"}\n` +
    `*Análise:* ${msg ?? "Verifique o painel."}\n\n` +
    `🚀 _Ação necessária no painel._`
  );
}

function buildTextoRelatorio({
  totalGasto, leads, economiaIA,
}: { totalGasto?: number; leads?: number; economiaIA?: number }): string {
  const fmtBRL = (v?: number) =>
    typeof v === "number"
      ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
      : "0,00";

  return (
    `📊 *RELATÓRIO DE PERFORMANCE: Erizon*\n\n` +
    `💰 *Investimento:* R$ ${fmtBRL(totalGasto)}\n` +
    `👤 *Leads Gerados:* ${leads ?? 0}\n` +
    `🛡️ *Economia IA:* R$ ${fmtBRL(economiaIA)}\n\n` +
    `✅ *Status:* Conta saudável — ROI protegido.`
  );
}

export async function POST(req: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "TELEGRAM_BOT_TOKEN não configurado." },
        { status: 500 }
      );
    }

    let body: {
      tipo?: "alerta" | "relatorio" | "custom";
      chatId?: string;
      msg?: string;
      // campos alerta
      campanha?: string;
      sinal?: string;
      // campos relatório
      totalGasto?: number;
      leads?: number;
      economiaIA?: number;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Body inválido — envie JSON." },
        { status: 400 }
      );
    }

    const { tipo = "custom", chatId, msg, campanha, sinal, totalGasto, leads, economiaIA } = body;

    if (!chatId?.trim()) {
      return NextResponse.json(
        { success: false, error: "chatId é obrigatório." },
        { status: 400 }
      );
    }

    let texto: string;
    if (tipo === "alerta") {
      texto = buildTextoAlerta({ campanha, sinal, msg });
    } else if (tipo === "relatorio") {
      texto = buildTextoRelatorio({ totalGasto, leads, economiaIA });
    } else {
      // custom — msg obrigatória
      if (!msg?.trim()) {
        return NextResponse.json(
          { success: false, error: "Campo msg é obrigatório para tipo 'custom'." },
          { status: 400 }
        );
      }
      texto = msg;
    }

    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: texto,
        parse_mode: "Markdown",
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      console.error("[telegram] Telegram API erro:", data.description);
      return NextResponse.json(
        { success: false, error: data.description ?? "Telegram recusou a mensagem." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("[telegram]", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}