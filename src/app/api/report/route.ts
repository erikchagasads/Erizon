import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { totalGasto, leads, economiaIA } = await req.json();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const texto = 
    `📊 *RELATÓRIO DE GUERRA: Growth OS*\n\n` +
    `💰 *Investimento:* R$ ${totalGasto}\n` +
    `👤 *Leads Gerados:* ${leads}\n` +
    `🛡️ *Economia IA:* R$ ${economiaIA}\n\n` +
    `*Status:* A conta está saudável e o ROI está protegido. ✅`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'Markdown' })
  });

  return NextResponse.json({ success: true });
}