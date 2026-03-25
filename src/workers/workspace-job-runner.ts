import { createServerSupabase } from "@/lib/supabase/server";
import { AdsSyncService } from "@/services/ads-sync-service";
import { IntelligenceService } from "@/services/intelligence-service";
import { AutopilotService } from "@/services/autopilot-service";

export async function runWorkspaceJobs() {
  const db = createServerSupabase();
  const { data: accounts, error } = await db
    .from("ad_accounts")
    .select("workspace_id")
    .eq("platform", "meta")
    .eq("status", "active");

  if (error) throw error;

  // Deduplica workspaces
  const workspaceIds = [...new Set((accounts ?? []).map((a) => String(a.workspace_id)))];

  const adsSyncService = new AdsSyncService();
  const intelligenceService = new IntelligenceService();
  const autopilotService = new AutopilotService();

  const snapshotDate = new Date().toISOString().slice(0, 10);

  for (const workspaceId of workspaceIds) {
    const wsId = String(workspaceId);
    await adsSyncService.syncWorkspace({ workspaceId: wsId, snapshotDate });
    await intelligenceService.run(wsId);
    await autopilotService.run(wsId);
  }

  return { workspacesProcessed: workspaceIds.length };
}
