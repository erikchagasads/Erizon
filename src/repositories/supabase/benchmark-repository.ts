import { createServerSupabase } from "@/lib/supabase/server";
import type { CampaignObjective, ObjectiveBenchmarks } from "@/types/erizon-v7";

interface BenchmarkRow {
  benchmark_ctr:       number | null;
  benchmark_cpl:       number | null;
  benchmark_cpa:       number | null;
  benchmark_roas:      number | null;
  benchmark_cpm:       number | null;
  benchmark_cpc:       number | null;
  benchmark_frequency: number | null;
  anomaly_threshold:   number | null;
  objective:           string | null;
}

export class BenchmarkRepository {
  private db = createServerSupabase();

  /**
   * Returns workspace-level benchmark overrides for a specific objective.
   * Returns null if no custom config exists — callers should fall back to
   * system defaults from getDefaultBenchmarks() in objective-engine.ts.
   */
  async getObjectiveBenchmarks(
    workspaceId: string,
    objective: CampaignObjective
  ): Promise<Partial<ObjectiveBenchmarks> | null> {
    const { data, error } = await this.db
      .from("workspace_benchmarks")
      .select(
        "benchmark_ctr, benchmark_cpl, benchmark_cpa, benchmark_roas, " +
        "benchmark_cpm, benchmark_cpc, benchmark_frequency, anomaly_threshold, objective"
      )
      .eq("workspace_id", workspaceId)
      .eq("objective", objective)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as unknown as BenchmarkRow;

    return {
      objective,
      benchmarkCtr:       row.benchmark_ctr       ? Number(row.benchmark_ctr)       : undefined,
      benchmarkCpl:       row.benchmark_cpl       ? Number(row.benchmark_cpl)       : undefined,
      benchmarkCpa:       row.benchmark_cpa       ? Number(row.benchmark_cpa)       : undefined,
      benchmarkRoas:      row.benchmark_roas      ? Number(row.benchmark_roas)      : undefined,
      benchmarkCpm:       row.benchmark_cpm       ? Number(row.benchmark_cpm)       : undefined,
      benchmarkCpc:       row.benchmark_cpc       ? Number(row.benchmark_cpc)       : undefined,
      benchmarkFrequency: row.benchmark_frequency ? Number(row.benchmark_frequency) : undefined,
      anomalyThreshold:   row.anomaly_threshold   ? Number(row.anomaly_threshold)   : undefined,
    };
  }
}
