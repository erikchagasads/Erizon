import { AdsSyncService } from "@/services/ads-sync-service";
import { createServerSupabase } from "@/lib/supabase/server";
import { logEvent, logError } from "@/lib/observability/logger";

/**
 * Runs the Meta Ads sync for every active workspace.
 * Designed to be called by a cron scheduler (e.g. Vercel Cron, pg_cron, BullMQ).
 */
export async function runAdsSyncJob(): Promise<void> {
  const db = createServerSupabase();
  const snapshotDate = new Date().toISOString().slice(0, 10);

  const { data: workspaces, error } = await db
    .from("workspaces")
    .select("id")
    .eq("status", "active");

  if (error) {
    logError("ads_sync_job_fetch_workspaces_failed", error);
    return;
  }

  logEvent("ads_sync_job_started", {
    snapshotDate,
    workspaceCount: workspaces?.length ?? 0,
  });

  const service = new AdsSyncService();

  for (const ws of workspaces ?? []) {
    try {
      await service.syncWorkspace({ workspaceId: ws.id, snapshotDate });
    } catch (err) {
      logError("ads_sync_job_workspace_failed", err, { workspaceId: ws.id });
      // Continue to next workspace
    }
  }

  logEvent("ads_sync_job_finished", { snapshotDate });
}
