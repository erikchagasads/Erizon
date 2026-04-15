
import { NextRequest, NextResponse } from "next/server";
import { IntegrationReadinessService } from "@/services/integration-readiness-service";
import { requireAuth } from "@/lib/auth-guard";
import { getIntegrationEnvStatus } from "@/config/env";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  const env = getIntegrationEnvStatus();
  if (!env.supabase) {
    return NextResponse.json(
      { error: "Supabase indisponível para leitura real das integrações." },
      { status: 503 }
    );
  }

  const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? auth.user.id;
  const service = new IntegrationReadinessService("supabase");
  return NextResponse.json(await service.getReadiness(workspaceId));
}
