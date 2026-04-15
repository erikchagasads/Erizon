import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { strategicIntelligenceService } from "@/services/strategic-intelligence-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return auth.response;

  try {
    const workspaceId = await strategicIntelligenceService.resolveWorkspaceId(auth.user.id);
    const snapshot = await strategicIntelligenceService.getWorkspaceSnapshot({
      workspaceId,
      userId: auth.user.id,
    });

    return NextResponse.json(snapshot);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
