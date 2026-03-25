import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { NetworkIntelligenceService } from "@/services/network-intelligence-service";
import { createServerSupabase } from "@/lib/supabase/server";

const svc = new NetworkIntelligenceService();

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

  const [position, wsData] = await Promise.all([
    svc.getWorkspacePosition(workspaceId),
    db.from("workspaces").select("niche").eq("id", workspaceId).maybeSingle(),
  ]);

  const nicho = wsData?.data?.niche ?? "geral";
  const nicheInsight = await svc.getLatestForNiche(nicho);

  return NextResponse.json({ ok: true, position, nicheInsight });
}
