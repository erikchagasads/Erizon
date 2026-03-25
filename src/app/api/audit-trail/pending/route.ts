import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { auditTrailService } from "@/services/audit-trail-service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  const workspace_id = request.nextUrl.searchParams.get('workspace_id');
  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id obrigatório' }, { status: 400 });
  }

  try {
    const pending = await auditTrailService.listPendingApprovals(workspace_id);
    return NextResponse.json(pending);
  } catch (error) {
    console.error('GET /api/audit-trail/pending', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
