import { NextRequest, NextResponse } from "next/server";
import { NetworkIntelligenceService } from "@/services/network-intelligence-service";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = new NetworkIntelligenceService();
  await svc.computeWeeklyInsights();
  return NextResponse.json({ ok: true, computed_at: new Date().toISOString() });
}
