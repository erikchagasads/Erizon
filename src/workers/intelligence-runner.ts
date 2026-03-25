import { IntelligenceService } from "@/services/intelligence-service";
import { createServerSupabase } from "@/lib/supabase/server";
import { logEvent, logError } from "@/lib/observability/logger";

export async function runIntelligenceJob(): Promise<void> {
  const db = createServerSupabase();

  const { data: workspaces, error } = await db
    .from("workspaces")
    .select("id")
    .eq("status", "active");

  if (error) {
    logError("intelligence_job_fetch_workspaces_failed", error);
    return;
  }

  logEvent("intelligence_job_started", { workspaceCount: workspaces?.length ?? 0 });

  const service = new IntelligenceService();

  for (const ws of workspaces ?? []) {
    try {
      await service.run(ws.id);
    } catch (err) {
      logError("intelligence_job_workspace_failed", err, { workspaceId: ws.id });
    }
  }

  logEvent("intelligence_job_finished", {});
}
