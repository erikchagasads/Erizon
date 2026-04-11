// src/app/api/cron/telegram-briefing/route.ts
// CORRIGIDO: trocado POST por GET — Vercel Cron só chama GET
// CORRIGIDO: trocado x-cron-secret por Authorization: Bearer (padrão do projeto)

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { TelegramCopilotService } from "@/services/telegram-copilot-service";

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

  if (!sessions?.length) return NextResponse.json({ ok: true, sent: 0 });

  const svc = new TelegramCopilotService();
  let sent = 0;

  for (const session of sessions) {
    if ((session.briefing_hora ?? 7) === hora) {
      await svc.sendMorningBriefing(session.user_id).catch(err =>
        console.error(`[cron/telegram-briefing] user ${session.user_id}:`, err)
      );
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}