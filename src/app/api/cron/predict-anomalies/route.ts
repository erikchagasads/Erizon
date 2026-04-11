// src/app/api/cron/predict-anomalies/route.ts
// CORRIGIDO: trocado POST por GET — Vercel Cron só chama GET

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { PredictiveAnomalyService } from "@/services/predictive-anomaly-service";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = createServerSupabase();
  const svc = new PredictiveAnomalyService();
  const { data: workspaces } = await db.from("workspaces").select("id");

  let totalAlerts = 0;
  for (const ws of workspaces ?? []) {
    const alerts = await svc.runForWorkspace(ws.id).catch(() => []);
    totalAlerts += alerts.length;
  }

  return NextResponse.json({ ok: true, totalAlerts });
}