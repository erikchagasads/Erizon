
import { CreativeAsset, CreativeInsight, NetworkBenchmark } from "@/types/erizon";

function durationBand(durationSeconds: number): NetworkBenchmark["durationBand"] {
  if (durationSeconds <= 8) return "0-8s";
  if (durationSeconds <= 12) return "9-12s";
  if (durationSeconds <= 20) return "13-20s";
  return "20s+";
}

export function buildCreativeInsights(
  creatives: CreativeAsset[],
  benchmarks: NetworkBenchmark[],
): CreativeInsight[] {
  if (!Array.isArray(creatives) || creatives.length === 0) return [];
  if (!Array.isArray(benchmarks)) benchmarks = [];
  return creatives.map((creative) => {
    const benchmark =
      benchmarks.find(
        (item) =>
          item.format === creative.format &&
          item.hookType === creative.hookType &&
          item.durationBand === durationBand(creative.durationSeconds),
      ) ?? benchmarks.find((item) => item.format === creative.format);

    const benchmarkCtr = benchmark?.ctrAvg ?? creative.ctr;
    const benchmarkCpa = benchmark?.cpaAvg ?? creative.cpa;
    const liftCtr = benchmarkCtr > 0 ? Number((((creative.ctr - benchmarkCtr) / benchmarkCtr) * 100).toFixed(1)) : 0;
    const status: CreativeInsight["status"] =
      creative.frequency >= 3.5 && creative.ctr < benchmarkCtr ? "Saturando" : creative.ctr >= benchmarkCtr ? "Vencedor" : "Teste";

    return {
      id: creative.id,
      name: creative.name,
      format: `${creative.format} • ${creative.visualStyle}`,
      hook: `${creative.hookType} • ${creative.captionStyle}`,
      benchmarkCtr: Number(benchmarkCtr.toFixed(2)),
      benchmarkCpa: Number(benchmarkCpa.toFixed(2)),
      liftCtr,
      status,
    };
  });
}
