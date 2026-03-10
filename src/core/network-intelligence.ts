
import { ClientAccount, CreativeAsset, NetworkBenchmark, NetworkInsight } from "@/types/erizon";

function durationLabel(durationSeconds: number) {
  if (durationSeconds <= 8) return "0-8s";
  if (durationSeconds <= 12) return "9-12s";
  if (durationSeconds <= 20) return "13-20s";
  return "20s+";
}

export function buildNetworkInsights(params: {
  clients: ClientAccount[];
  creatives: CreativeAsset[];
  benchmarks: NetworkBenchmark[];
}): NetworkInsight[] {
  const { clients, creatives, benchmarks } = params;

  return creatives.slice(0, 4).map((creative) => {
    const client = clients.find((item) => item.id === creative.clientId);
    const benchmark = benchmarks.find(
      (item) =>
        item.niche === client?.niche &&
        item.format === creative.format &&
        item.hookType === creative.hookType,
    );

    const ctrDiffPct = benchmark && benchmark.ctrAvg > 0
      ? Number((((creative.ctr - benchmark.ctrAvg) / benchmark.ctrAvg) * 100).toFixed(0))
      : 0;

    return {
      id: `net-insight-${creative.id}`,
      niche: client?.niche ?? "Rede",
      cut: `${creative.format} • ${creative.hookType} • ${durationLabel(creative.durationSeconds)}`,
      insight: benchmark
        ? `${creative.name} roda ${ctrDiffPct >= 0 ? "acima" : "abaixo"} do benchmark da rede para ${client?.vertical}.`
        : `${creative.name} ainda não tem benchmark robusto na rede; precisa de mais volume para consolidar padrão.`,
      gain: benchmark
        ? `${ctrDiffPct >= 0 ? "+" : ""}${ctrDiffPct}% de diferença vs CTR médio da rede com base em ${benchmark.sampleSize.toLocaleString("pt-BR")} amostras`
        : "Coletando volume para benchmark",
    };
  });
}
