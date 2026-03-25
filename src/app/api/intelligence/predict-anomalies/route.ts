import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { PredictiveAnomalyService } from "@/services/predictive-anomaly-service";
import { createServerSupabase } from "@/lib/supabase/server";

const svc = new PredictiveAnomalyService();

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const db = createServerSupabase();
  const { data: ws } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const workspaceId = ws?.workspace_id ?? auth.user.id;

  const alerts = await svc.getPendingForWorkspace(workspaceId);
  return NextResponse.json({ ok: true, alerts });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const db = createServerSupabase();
  const { data: ws } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const workspaceId = ws?.workspace_id ?? auth.user.id;

  const alerts = await svc.runForWorkspace(workspaceId);
  return NextResponse.json({ ok: true, alerts, total: alerts.length });
}
