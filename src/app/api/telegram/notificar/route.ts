// POST /api/telegram/notificar — envia notificação de evento de funil via Telegram
// Uso interno: chamado quando webhook_events são inseridos e o usuário tem Telegram configurado
// Autenticação: sessão Supabase (cookie)

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { TelegramCopilotService } from "@/services/telegram-copilot-service";
import { logEvent, logError } from "@/lib/observability/logger";

async function getSupabaseUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) {
          values.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch {}
          });
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: NextRequest) {
  const user = await getSupabaseUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: {
    chat_id: string;
    event_type: string;
    value?: number;
    platform?: string;
    campaign?: string;
    customer_email?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido no body" }, { status: 400 });
  }

  const { chat_id, event_type, value, platform, campaign, customer_email } = body;

  if (!chat_id) {
    return NextResponse.json({ error: "Campo 'chat_id' obrigatório" }, { status: 400 });
  }
  if (!event_type) {
    return NextResponse.json({ error: "Campo 'event_type' obrigatório" }, { status: 400 });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn("[telegram/notificar] TELEGRAM_BOT_TOKEN não configurado — notificação ignorada.");
    return NextResponse.json({ ok: false, warning: "TELEGRAM_BOT_TOKEN não configurado" });
  }

  try {
    logEvent("telegram.notificar", { userId: user.id, event_type, platform });

    const svc = new TelegramCopilotService();
    await svc.notificarEventoFunil({
      chatId: chat_id,
      eventType: event_type,
      value: value ?? null,
      platform: platform ?? null,
      campaign: campaign ?? null,
      customerEmail: customer_email ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("telegram.notificar.error", err as Error);
    return NextResponse.json({ error: "Erro ao enviar notificação" }, { status: 500 });
  }
}
