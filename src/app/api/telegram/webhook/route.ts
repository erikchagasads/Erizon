import { NextRequest, NextResponse } from "next/server";
import { TelegramCopilotService } from "@/services/telegram-copilot-service";

// POST /api/telegram/webhook — recebe atualizações do Telegram Bot
export async function POST(req: NextRequest) {
  // Valida secret_token do Telegram (segurança do webhook)
  const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: object;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const svc = new TelegramCopilotService();
  // Processa em background — responde imediatamente para o Telegram (< 10s timeout)
  svc.processWebhook(body as Parameters<typeof svc.processWebhook>[0]).catch(err =>
    console.error("[telegram-webhook]", err)
  );

  return NextResponse.json({ ok: true });
}
