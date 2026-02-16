import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { campanha, sinal, msg } = await req.json();

    // Puxando do .env.local para não dar erro de sintaxe no código
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return NextResponse.json({ success: false, error: "Configurações ausentes" });
    }

    const texto = `🚨 *ALERTA CRÍTICO: Pulse OS*\n\n` +
                  `*Campanha:* ${campanha || "Teste"}\n` +
                  `*Sinal:* ${sinal || "Alerta"}\n` +
                  `*Análise:* ${msg || "Verifique o painel."}\n\n` +
                  `🚀 _Ação necessária no painel Pulse._`;

    const resTelegram = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
        parse_mode: "Markdown",
      }),
    });

    const data = await resTelegram.json();

    return NextResponse.json({ success: data.ok });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erro interno" });
  }
}