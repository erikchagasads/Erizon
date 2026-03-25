import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { auditTrailService } from "@/services/audit-trail-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  try {
    const trail = await auditTrailService.getDecisionTrail(params.id);
    if (!trail) {
      return NextResponse.json({ error: 'Audit trail not found' }, { status: 404 });
    }
    return NextResponse.json(trail);
  } catch (error) {
    console.error('GET /api/audit-trail/[id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
