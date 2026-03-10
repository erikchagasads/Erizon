
import { OperatingSystemService } from "@/services/operating-system-service";

export async function runAdsSyncWorker(workspaceId = "ws-erizon") {
  const service = new OperatingSystemService();
  const result = await service.runSync(workspaceId);

  return {
    worker: "ads-sync",
    status: "ok",
    syncedAt: result.syncedAt,
    campaigns: result.normalizedCampaigns.length,
    profits: result.profitSnapshots.length,
  };
}
