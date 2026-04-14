// src/app/api/cron/telegram-briefing/route.ts
// CORRIGIDO: trocado POST por GET — Vercel Cron só chama GET
// CORRIGIDO: trocado x-cron-secret por Authorization: Bearer (padrão do projeto)

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { TelegramCopilotService } from "@/services/telegram-copilot-service";
import { WhatsAppCopilotService } from "@/services/whatsapp-copilot-service";
import { BrowserPushService } from "@/services/browser-push-service";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = createServerSupabase();
  const hora = new Date().getHours();

  const { data: sessions } = await db
    .from("telegram_copilot_sessions")
    .select("user_id, briefing_hora")
    .eq("ativo", true)
    .not("chat_id", "is", null);

  const svc = new TelegramCopilotService();
  const whatsappSvc = new WhatsAppCopilotService();
  const browserPushSvc = new BrowserPushService();
  let sent = 0;

  for (const session of sessions) {
    if ((session.briefing_hora ?? 7) === hora) {
      await svc.sendMorningBriefing(session.user_id).catch(err =>
        console.error(`[cron/telegram-briefing] user ${session.user_id}:`, err)
      );
      sent++;
    }
  }

  const { data: whatsappSessions } = await db
    .from("whatsapp_copilot_sessions")
    .select("user_id, briefing_hora")
    .eq("ativo", true);

  for (const session of whatsappSessions ?? []) {
    if ((session.briefing_hora ?? 7) === hora) {
      try {
        await whatsappSvc.sendMorningBriefing(session.user_id);
        sent++;
      } catch (err) {
        console.error(`[cron/whatsapp-briefing] user ${session.user_id}:`, err);
      }
    }
  }

  const { data: pushSessions } = await db
    .from("browser_push_subscriptions")
    .select("user_id, briefing_hora")
    .eq("ativo", true);

  const processedPushUsers = new Set<string>();
  for (const session of pushSessions ?? []) {
    if ((session.briefing_hora ?? 7) !== hora || processedPushUsers.has(session.user_id)) continue;
    processedPushUsers.add(session.user_id);
    try {
      const result = await browserPushSvc.sendMorningBriefing(session.user_id);
      sent += result.sent ?? 0;
    } catch (err) {
      console.error(`[cron/browser-push-briefing] user ${session.user_id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
