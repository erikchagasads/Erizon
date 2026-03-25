import { detectPrimaryAnomaly } from "@/core/anomaly-engine";
import { buildRiskEvents } from "@/core/risk-engine";
import { normalizeObjective, resolveBenchmarks } from "@/core/objective-engine";
import { IntelligenceRepository } from "@/repositories/supabase/intelligence-repository";
import { SnapshotRepository } from "@/repositories/supabase/snapshot-repository";
import { BenchmarkRepository } from "@/repositories/supabase/benchmark-repository";
import { logEvent, logError } from "@/lib/observability/logger";

export class IntelligenceService {
  constructor(
    private intelligenceRepository = new IntelligenceRepository(),
    private snapshotRepository = new SnapshotRepository(),
    private benchmarkRepository = new BenchmarkRepository()
  ) {}

  async run(workspaceId: string): Promise<{ processedSnapshots: number }> {
    const snapshots = await this.snapshotRepository.listLatestWithObjective(workspaceId);

    for (const item of snapshots) {
      const campaignId = item.campaign_id;
      const snapshotDate = item.snapshot_date;

      // ── 1. Normalize objective ─────────────────────────────────────────
      const objective = normalizeObjective(item.objective);

      // ── 2. Resolve benchmarks: system defaults + workspace overrides ───
      const workspaceOverrides = await this.benchmarkRepository.getObjectiveBenchmarks(
        workspaceId,
        objective
      );
      const benchmarks = resolveBenchmarks(objective, workspaceOverrides ?? undefined);

      try {
        // ── 3. Anomaly on primary KPI for this objective ──────────────────
        const anomaly = detectPrimaryAnomaly(objective, item, benchmarks);
        if (anomaly?.isAnomalous) {
          await this.intelligenceRepository.upsertAnomaly({
            workspaceId,
            campaignId,
            snapshotDate,
            title: `${anomaly.metricName.toUpperCase()} fora da curva`,
            description:
              `${anomaly.metricName.toUpperCase()} atual (${anomaly.metricValue.toFixed(2)}) ` +
              `desviou ${anomaly.deviationPct}% da linha de base (${anomaly.baselineValue.toFixed(2)}) ` +
              `para campanha de objetivo ${objective}.`,
            severity: anomaly.deviationPct > 60 ? "high" : "medium",
            metricName: anomaly.metricName,
            metricValue: anomaly.metricValue,
            baselineValue: anomaly.baselineValue,
          });
        }

        // ── 4. Objective-aware risk events ────────────────────────────────
        const risks = buildRiskEvents({
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
        });

        for (const risk of risks) {
          await this.intelligenceRepository.upsertRisk({
            workspaceId,
            campaignId,
            snapshotDate,
            riskType: risk.riskType,
            severity: risk.severity,
            title: risk.title,
            description: risk.description,
          });
        }

        // ── 5. Objective-aware opportunity detection ──────────────────────
        await this.detectOpportunities({ workspaceId, campaignId, snapshotDate, objective, item, benchmarks });

      } catch (err) {
        logError("intelligence_campaign_processing_failed", err, { workspaceId, campaignId, objective });
      }
    }

    logEvent("intelligence_run_completed", { workspaceId, processedSnapshots: snapshots.length });
    return { processedSnapshots: snapshots.length };
  }

  private async detectOpportunities({
    workspaceId, campaignId, snapshotDate, objective, item, benchmarks
  }: {
    workspaceId: string;
    campaignId: string;
    snapshotDate: string;
    objective: string;
    item: { cpl: number; cpa: number; roas: number; ctr: number; spend: number };
    benchmarks: ReturnType<typeof resolveBenchmarks>;
  }) {
    // LEADS: CPL low = scale window
    if (
      objective === "LEADS" &&
      benchmarks.benchmarkCpl &&
      item.cpl > 0 && item.cpl < benchmarks.benchmarkCpl * 0.75 &&
      item.spend > 0
    ) {
      await this.intelligenceRepository.upsertOpportunity({
        workspaceId, campaignId, snapshotDate,
        title: "CPL competitivo — janela de escala para leads",
        description: `CPL (R$ ${item.cpl.toFixed(2)}) está 25%+ abaixo do benchmark. Ótima eficiência para aumentar verba.`,
        opportunityType: "scale_window",
      });
    }

    // SALES: ROAS high = scale window
    if (
      objective === "SALES" &&
      benchmarks.benchmarkRoas &&
      item.roas > benchmarks.benchmarkRoas * 1.3 &&
      item.spend > 0
    ) {
      await this.intelligenceRepository.upsertOpportunity({
        workspaceId, campaignId, snapshotDate,
        title: "ROAS excelente — janela de escala para vendas",
        description: `ROAS (${item.roas.toFixed(2)}x) está 30%+ acima do benchmark. Alta eficiência de receita.`,
        opportunityType: "scale_window",
      });
    }

    // TRAFFIC: CTR high = scale window
    if (
      objective === "TRAFFIC" &&
      benchmarks.benchmarkCtr &&
      item.ctr > benchmarks.benchmarkCtr * 1.5 &&
      item.spend > 0
    ) {
      await this.intelligenceRepository.upsertOpportunity({
        workspaceId, campaignId, snapshotDate,
        title: "CTR excelente — escalar campanha de tráfego",
        description: `CTR (${item.ctr.toFixed(2)}%) 50%+ acima do benchmark. Criativo altamente eficiente.`,
        opportunityType: "scale_window",
      });
    }
  }

  async getOverview(workspaceId: string) {
    return this.intelligenceRepository.listOverview(workspaceId);
  }
}
