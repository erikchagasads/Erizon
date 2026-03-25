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
    const limit = request.nextUrl.searchParams.get('limit');
    const trails = await auditTrailService.listDecisionTrails({
      campaign_id: params.id,
      limit: limit ? parseInt(limit) : 50,
    });
    return NextResponse.json(trails);
  } catch (error) {
    console.error('GET /api/audit-trail/campaign/[id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
