import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { TelegramCopilotService } from "@/services/telegram-copilot-service";

// POST /api/cron/telegram-briefing — dispara briefing matinal para todos os usuários
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServerSupabase();
  const hora = new Date().getHours();

  // Busca sessões ativas cuja hora de briefing corresponde à hora atual
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
