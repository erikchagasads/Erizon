import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { PredictiveAnomalyService } from "@/services/predictive-anomaly-service";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServerSupabase();
  const svc = new PredictiveAnomalyService();
  const { data: workspaces } = await db.from("workspaces").select("id");

  let totalAlerts = 0;
  for (const ws of workspaces ?? []) {
    const alerts = await svc.runForWorkspace(ws.id).catch(() => []);
    totalAlerts += alerts.length;
  }

  return NextResponse.json({ ok: true, total_alerts: totalAlerts });
}
