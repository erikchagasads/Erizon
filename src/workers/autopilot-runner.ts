import { AutopilotService } from "@/services/autopilot-service";
import { IREService } from "@/services/ire-service";
import { createServerSupabase } from "@/lib/supabase/server";
import { logEvent, logError } from "@/lib/observability/logger";

export async function runAutopilotJob(): Promise<void> {
  const db = createServerSupabase();
  const { data: workspaces, error } = await db.from("workspaces").select("id");

  if (error) {
    logError("autopilot_job_fetch_workspaces_failed", error);
    return;
  }

  logEvent("autopilot_job_started", { workspaceCount: workspaces?.length ?? 0 });
  const autopilotService = new AutopilotService();
  const ireService       = new IREService();

  for (const ws of workspaces ?? []) {
    try {
      await autopilotService.run(ws.id);
    } catch (err) {
      logError("autopilot_job_workspace_failed", err, { workspaceId: ws.id });
    }

    // Computa o I.R.E. logo após o autopilot — usa os snapshots recém-processados
    try {
      await ireService.compute(ws.id);
    } catch (err) {
      logError("ire_compute_after_autopilot_failed", err, { workspaceId: ws.id });
    }
  }

  logEvent("autopilot_job_finished", {});
}

export const runAutopilotWorker = runAutopilotJob;
