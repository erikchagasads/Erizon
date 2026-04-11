// src/app/api/cron/network-compute/route.ts
// CORRIGIDO: trocado POST por GET — Vercel Cron só chama GET

import { NextRequest, NextResponse } from "next/server";
import { NetworkIntelligenceService } from "@/services/network-intelligence-service";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const svc = new NetworkIntelligenceService();
  await svc.computeWeeklyInsights();
  return NextResponse.json({ ok: true, computed_at: new Date().toISOString() });
}