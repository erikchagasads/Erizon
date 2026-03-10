
import { OperatingSystemService } from "@/services/operating-system-service";

export async function runAutopilotWorker(workspaceId = "ws-erizon") {
  const service = new OperatingSystemService();
  const evaluations = await service.getAutopilotGovernanceSummary(workspaceId);

  const valid = evaluations.filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    worker: "autopilot-runner",
    status: "ok",
    total: valid.length,
    executed: valid.filter((item) => item.mode === "executed").length,
    approvalRequired: valid.filter((item) => item.mode === "approval_required").length,
    simulated: valid.filter((item) => item.mode === "simulation").length,
    blocked: valid.filter((item) => item.mode === "blocked").length,
  };
}
