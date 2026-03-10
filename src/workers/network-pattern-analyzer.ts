
import { MockOperatingRepository } from "@/repositories/mock-operating-repository";

export async function runNetworkPatternAnalyzer() {
  const repository = new MockOperatingRepository();
  const snapshot = await repository.getSnapshot();

  const grouped = snapshot.benchmarks.reduce<Record<string, number>>((acc, benchmark) => {
    const key = `${benchmark.niche} • ${benchmark.format} • ${benchmark.hookType}`;
    acc[key] = benchmark.ctrAvg;
    return acc;
  }, {});

  return {
    worker: "network-pattern-analyzer",
    patterns: Object.entries(grouped).map(([key, ctrAvg]) => ({
      key,
      ctrAvg,
    })),
    sampleSize: snapshot.benchmarks.reduce((acc, item) => acc + item.sampleSize, 0),
  };
}
