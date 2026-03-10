
import { NextRequest, NextResponse } from "next/server";
import { IntegrationReadinessService } from "@/services/integration-readiness-service";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? "ws-erizon";
  const source = request.nextUrl.searchParams.get("source") === "supabase" ? "supabase" : "mock";
  const service = new IntegrationReadinessService(source);
  return NextResponse.json(await service.getReadiness(workspaceId));
}
