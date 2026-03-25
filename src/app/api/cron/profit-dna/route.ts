import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { ProfitDNAService } from "@/services/profit-dna-service";

// POST /api/cron/profit-dna — roda semanalmente via Vercel Cron
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServerSupabase();
  const svc = new ProfitDNAService();

  // Busca todos os workspaces ativos
  const { data: workspaces } = await db.from("workspaces").select("id");
  if (!workspaces?.length) return NextResponse.json({ ok: true, computed: 0 });

  let total = 0;
  for (const ws of workspaces) {
    await svc.computeAllForWorkspace(ws.id).catch(err =>
      console.error(`[cron/profit-dna] ws ${ws.id}:`, err)
    );
    total++;
  }

  return NextResponse.json({ ok: true, computed: total });
}
