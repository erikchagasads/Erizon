import type { CampaignObjective, ObjectiveBenchmarks } from "@/types/erizon-v7";
import { getPrimaryMetric } from "@/core/objective-engine";

export type AnomalyResult = {
  isAnomalous: boolean;
  metricName: string;
  metricValue: number;
  baselineValue: number;
  deviationPct: number;
} | null;

/**
 * Detects anomaly on the primary KPI for the given objective.
 * Each objective has a different primary metric — using the wrong one
 * (e.g. checking CPL on an awareness campaign) produces meaningless alerts.
 */
export function detectPrimaryAnomaly(
  objective: CampaignObjective,
  metrics: { cpl: number; cpa: number; cpm: number; cpc: number; ctr: number },
  benchmarks: ObjectiveBenchmarks
): AnomalyResult {
  const metricName = getPrimaryMetric(objective);
  const metricValue = metrics[metricName as keyof typeof metrics] ?? 0;

  let baseline: number | undefined;
  switch (metricName) {
    case "cpl":  baseline = benchmarks.benchmarkCpl; break;
    case "cpa":  baseline = benchmarks.benchmarkCpa; break;
    case "cpm":  baseline = benchmarks.benchmarkCpm; break;
    case "cpc":  baseline = benchmarks.benchmarkCpc; break;
    case "ctr":  baseline = benchmarks.benchmarkCtr; break;
  }

  if (!baseline || baseline <= 0) return null;
  if (metricValue <= 0) return null;

  const threshold = benchmarks.anomalyThreshold ?? 0.35;
  const deviation = Math.abs(metricValue - baseline) / baseline;
  const isAnomalous = deviation >= threshold;

  return {
    isAnomalous,
    metricName,
    metricValue,
    baselineValue: baseline,
    deviationPct: Math.round(deviation * 100),
  };
}

/**
 * Low-level helper: checks if a single metric value deviates enough
 * from a baseline to be considered anomalous.
 * Used by tests and by callers who manage their own metric selection.
 */
export function isMetricAnomalous(
  today: number,
  baseline: number,
  threshold = 0.35
): boolean {
  if (baseline <= 0) return false;
  return Math.abs(today - baseline) / baseline >= threshold;
}
