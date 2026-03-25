import { calcIRE } from "@/core/ire-engine";
import { SnapshotRepository } from "@/repositories/supabase/snapshot-repository";
import { IRERepository } from "@/repositories/supabase/ire-repository";
import { logEvent, logError } from "@/lib/observability/logger";
import type { IREResult, IREApiResponse } from "@/types/erizon-ena";

export class IREService {
  constructor(
    private snapshotRepository = new SnapshotRepository(),
    private ireRepository      = new IRERepository(),
  ) {}

  /**
   * Calcula o I.R.E. para um workspace e persiste no banco.
   * Chamado pelo cron diário e pelo autopilot-runner.
   */
  async compute(workspaceId: string): Promise<IREResult> {
    const snapshots = await this.snapshotRepository.listLatestWithObjective(workspaceId);

    const decisionScore = await this.ireRepository.getDecisionScore(workspaceId);

    const result = calcIRE({ snapshots, decisionScore });

    const totalSpend      = snapshots.reduce((s, c) => s + c.spend, 0);
    const totalRevenue    = snapshots.reduce((s, c) => s + c.revenue, 0);
    const activeCampaigns = new Set(snapshots.map(s => s.campaign_id)).size;
    const snapshotDate    = new Date().toISOString().slice(0, 10);

    await this.ireRepository.upsertDaily(
      workspaceId,
      snapshotDate,
      result,
      decisionScore,
      totalSpend,
      totalRevenue,
      activeCampaigns,
    );

    logEvent("ire_computed", {
      workspaceId,
      ireScore: result.ireScore,
      wasteIndex: result.wasteBreakdown.wasteIndex,
      confidence: result.confidence,
    });

    return result;
  }

  /**
   * Retorna o I.R.E. mais recente + histórico para exibição no Pulse.
   * Se não houver dado persistido, computa on-demand.
   */
  async getOverview(workspaceId: string): Promise<IREApiResponse> {
    const [latest, history] = await Promise.all([
      this.ireRepository.getLatest(workspaceId),
      this.ireRepository.getHistory(workspaceId, 30),
    ]);

    // Computa on-demand se não houver dado do dia de hoje
    const today = new Date().toISOString().slice(0, 10);
    if (!latest || latest.snapshotDate !== today) {
      try {
        await this.compute(workspaceId);
        const [freshLatest, freshHistory] = await Promise.all([
          this.ireRepository.getLatest(workspaceId),
          this.ireRepository.getHistory(workspaceId, 30),
        ]);
        return { latest: freshLatest, trend: calcTrend(freshHistory), history: freshHistory };
      } catch (err) {
        logError("ire_ondemand_compute_failed", err, { workspaceId });
        // Retorna o dado anterior mesmo que desatualizado
        return { latest, trend: calcTrend(history), history };
      }
    }

    return { latest, trend: calcTrend(history), history };
  }
}

// ─── Util: tendência dos últimos 7 dias ──────────────────────────────────────
function calcTrend(history: { ireScore: number }[]): "up" | "down" | "stable" {
  if (history.length < 2) return "stable";
  const recent = history.slice(-7);
  const first  = recent[0].ireScore;
  const last   = recent[recent.length - 1].ireScore;
  const delta  = last - first;
  if (delta >= 3)  return "up";
  if (delta <= -3) return "down";
  return "stable";
}
