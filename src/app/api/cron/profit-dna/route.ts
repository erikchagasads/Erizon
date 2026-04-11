// src/app/api/cron/profit-dna/route.ts
// CORRIGIDO: trocado POST por GET — Vercel Cron só chama GET

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { ProfitDNAService } from "@/services/profit-dna-service";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = createServerSupabase();
  const svc = new ProfitDNAService();

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