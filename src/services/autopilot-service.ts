import { buildAutopilotSuggestions } from "@/core/autopilot-engine";
import { calculateProfit } from "@/core/profit-engine";
import { normalizeObjective, resolveBenchmarks } from "@/core/objective-engine";
import { AutopilotRepository } from "@/repositories/supabase/autopilot-repository";
import { SnapshotRepository } from "@/repositories/supabase/snapshot-repository";
import { BenchmarkRepository } from "@/repositories/supabase/benchmark-repository";
import { logEvent, logError } from "@/lib/observability/logger";

export class AutopilotService {
  constructor(
    private snapshotRepository = new SnapshotRepository(),
    private autopilotRepository = new AutopilotRepository(),
    private benchmarkRepository = new BenchmarkRepository()
  ) {}

  async run(workspaceId: string): Promise<{ processedSnapshots: number }> {
    const snapshots = await this.snapshotRepository.listLatestWithObjective(workspaceId);

    for (const item of snapshots) {
      const campaignId = item.campaign_id;

      // ── 1. Normalize objective ─────────────────────────────────────────
      const objective = normalizeObjective(item.objective);

      // ── 2. Resolve benchmarks ─────────────────────────────────────────
      const workspaceOverrides = await this.benchmarkRepository.getObjectiveBenchmarks(
        workspaceId,
        objective
      );
      const benchmarks = resolveBenchmarks(objective, workspaceOverrides ?? undefined);

      const profit = calculateProfit(item.spend, item.revenue);

      try {
        const suggestions = buildAutopilotSuggestions({
          objective,
          benchmarks,
          ctr: item.ctr,
          cpl: item.cpl,
          cpa: item.cpa,
          cpm: item.cpm,
          cpc: item.cpc,
          roas: item.roas,
          frequency: item.frequency,
          spend: item.spend,
          roi: profit.roi,
        });

        // Captura metric_before no momento da geração para uso futuro no feedback loop
        const metricBefore = {
          cpl:   item.cpl   ?? 0,
          roas:  item.roas  ?? 0,
          spend: item.spend ?? 0,
          leads: item.leads ?? 0,
        };

        await this.autopilotRepository.saveSuggestions(workspaceId, campaignId, suggestions, metricBefore);

        await this.autopilotRepository.logExecution({
          workspaceId,
          campaignId,
          actionType: "generate_suggestions",
          executionStatus: "success",
          payload: { objective, suggestionCount: suggestions.length },
        });

      } catch (err) {
        logError("autopilot_campaign_processing_failed", err, { workspaceId, campaignId, objective });
        await this.autopilotRepository.logExecution({
          workspaceId,
          campaignId,
          actionType: "generate_suggestions",
          executionStatus: "error",
          payload: { errorMessage: err instanceof Error ? err.message : String(err) },
        });
      }
    }

    // Avalia outcomes de sugestões anteriores (ENA feedback loop)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (this.autopilotRepository as any).db ?? (await import("@/lib/supabase/server").then(m => m.createServerSupabase()));
      await db.rpc("ena_evaluate_suggestion_outcomes", { p_workspace_id: workspaceId });
    } catch (err) {
      logError("ena_evaluate_outcomes_failed", err, { workspaceId });
    }

    logEvent("autopilot_run_completed", { workspaceId, processedSnapshots: snapshots.length });
    return { processedSnapshots: snapshots.length };
  }
}
