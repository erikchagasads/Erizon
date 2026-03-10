
import { NextRequest, NextResponse } from "next/server";
import { OperatingSystemService } from "@/services/operating-system-service";
import { IntegrationReadinessService } from "@/services/integration-readiness-service";
import { runAdsSyncWorker } from "@/workers/ads-sync";
import { runAutopilotWorker } from "@/workers/autopilot-runner";
import { runNetworkPatternAnalyzer } from "@/workers/network-pattern-analyzer";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? "ws-erizon";
  const source = request.nextUrl.searchParams.get("source") === "supabase" ? "supabase" : "mock";

  const service = new OperatingSystemService(source);
  const readiness = new IntegrationReadinessService(source);

  const [architecture, view, validation, governance, syncPreview, readinessSummary, adsSync, autopilot, network] =
    await Promise.all([
      service.getArchitectureSummary(),
      service.getOperatingSystemView(),
      service.getDecisionValidationSummary(),
      service.getAutopilotGovernanceSummary(workspaceId),
      service.runSync(workspaceId),
      readiness.getReadiness(workspaceId),
      runAdsSyncWorker(),
      runAutopilotWorker(),
      runNetworkPatternAnalyzer(),
    ]);

  return NextResponse.json({
    ...architecture,
    ...view,
    readiness: readinessSummary,
    decisionValidation: validation,
    autopilotGovernance: governance,
    syncPreview,
    workersPreview: {
      adsSync,
      autopilot,
      network,
    },
  });
}
