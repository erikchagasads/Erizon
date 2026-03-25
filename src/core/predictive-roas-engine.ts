// ─────────────────────────────────────────────────────────────────────────────
// Predictive ROAS Engine — ENA Fase 3
//
// Algoritmo de projeção de ROAS para 7 dias usando:
//   1. Regressão linear dos últimos 14 dias (tendência)
//   2. Ajuste por decisões pendentes (histórico de acerto)
//   3. Fator de sazonalidade (dia da semana × semana do mês)
//
// Funções puras — sem I/O, testáveis isoladamente.
// ─────────────────────────────────────────────────────────────────────────────

import type { SnapshotWithObjective } from "@/repositories/supabase/snapshot-repository";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type PredictiveROASInput = {
  snapshotHistory: SnapshotWithObjective[];    // últimos 30 dias
  decisionScore:   number;                     // 0-1, taxa de acerto histórica
  pendingSuggestionsCount: number;             // sugestões positivas não aplicadas
  horizonDays?:    number;                     // padrão: 7
};

export type PredictiveROASResult = {
  predictedRoas:       number;
  confidenceLow:       number;
  confidenceHigh:      number;
  horizonDays:         number;
  narrative:           string;
  inputs: {
    baseRoas:           number;
    trendSlope:         number;
    decisionAdjustment: number;
    seasonalityFactor:  number;
    daysOfData:         number;
  };
};

// ─── Sazonalidade BR (imóveis + e-comm) ──────────────────────────────────────
// Índices empíricos: dia da semana (0=Dom … 6=Sáb) × semana do mês (1–4)

const DAY_FACTORS: Record<number, number> = {
  0: 0.90, // Dom — menor intenção de compra
  1: 0.95, // Seg
  2: 1.00, // Ter
  3: 1.05, // Qua
  4: 1.05, // Qui
  5: 1.10, // Sex — pico de conversão
  6: 1.05, // Sáb
};

const WEEK_FACTORS: Record<number, number> = {
  1: 0.95, // 1ª semana — pós-pagamento ainda entrando
  2: 1.05, // 2ª semana — orçamento disponível
  3: 1.05, // 3ª semana — impulso de meio de mês
  4: 1.10, // 4ª semana — urgência de fim de mês
};

function seasonalityFactor(date: Date): number {
  const dow      = date.getDay();
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return (DAY_FACTORS[dow] ?? 1.0) * (WEEK_FACTORS[weekOfMonth] ?? 1.0);
}

// ─── Regressão linear simples ─────────────────────────────────────────────────

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }

  const slope     = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function predictROAS(input: PredictiveROASInput): PredictiveROASResult {
  const horizon = input.horizonDays ?? 7;

  // Agrega ROAS por dia (média ponderada por gasto)
  const byDay = new Map<string, { totalSpend: number; totalRevenue: number }>();
  for (const s of input.snapshotHistory) {
    const day = s.snapshot_date;
    const cur = byDay.get(day) ?? { totalSpend: 0, totalRevenue: 0 };
    cur.totalSpend   += s.spend;
    cur.totalRevenue += s.revenue;
    byDay.set(day, cur);
  }

  const sortedDays = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14); // últimos 14 dias

  const roasSeries = sortedDays.map(([, v]) =>
    v.totalSpend > 0 ? v.totalRevenue / v.totalSpend : 0
  ).filter(r => r > 0);

  const daysOfData = roasSeries.length;

  // ROAS base = média dos últimos 7 dias
  const last7 = roasSeries.slice(-7);
  const baseRoas = last7.length > 0
    ? last7.reduce((a, b) => a + b, 0) / last7.length
    : 0;

  if (baseRoas === 0) {
    return {
      predictedRoas:  0,
      confidenceLow:  0,
      confidenceHigh: 0,
      horizonDays:    horizon,
      narrative:      "Dados insuficientes para previsão. Continue sincronizando campanhas.",
      inputs: { baseRoas: 0, trendSlope: 0, decisionAdjustment: 0, seasonalityFactor: 1, daysOfData },
    };
  }

  // Tendência via regressão linear
  const { slope } = linearRegression(roasSeries);
  const trendRoas  = baseRoas + slope * horizon;

  // Ajuste por decisões: decisões pendentes positivas indicam potencial de melhora
  // Cada sugestão de escala pendente com bom histórico de acerto = +2% no ROAS estimado
  const decisionAdj = input.pendingSuggestionsCount > 0 && input.decisionScore > 0.5
    ? input.pendingSuggestionsCount * 0.02 * (input.decisionScore - 0.5) * 2
    : 0;

  // Sazonalidade: média dos próximos 7 dias
  const today = new Date();
  let totalSeasonality = 0;
  for (let i = 1; i <= horizon; i++) {
    const futureDate = new Date(today.getTime() + i * 86400000);
    totalSeasonality += seasonalityFactor(futureDate);
  }
  const avgSeasonality = totalSeasonality / horizon;

  const predicted = (trendRoas + decisionAdj * baseRoas) * avgSeasonality;
  const sd        = stddev(roasSeries);
  const band      = sd * 1.5;

  const predictedRoas  = Math.max(0, Math.round(predicted * 100) / 100);
  const confidenceLow  = Math.max(0, Math.round((predicted - band) * 100) / 100);
  const confidenceHigh = Math.round((predicted + band) * 100) / 100;

  // Narrativa contextual
  const trendDir    = slope > 0.01 ? "subindo" : slope < -0.01 ? "caindo" : "estável";
  const trendPct    = Math.abs(Math.round((slope * horizon / baseRoas) * 100));
  const adjSign     = decisionAdj >= 0 ? "+" : "";
  const adjPct      = Math.round(decisionAdj * 100);

  const narrative = [
    `ROAS base dos últimos 7d: ${baseRoas.toFixed(2)}×.`,
    trendPct > 0 ? `Tendência ${trendDir} (${adjSign}${trendDir === "caindo" ? "-" : ""}${trendPct}% em ${horizon}d).` : `Tendência estável.`,
    adjPct !== 0 ? `Decisões pendentes com ${Math.round(input.decisionScore * 100)}% de acerto histórico: ajuste de ${adjSign}${adjPct}%.` : "",
    `Sazonalidade dos próximos ${horizon}d: ${avgSeasonality.toFixed(2)}×.`,
    `Estimativa: **${predictedRoas.toFixed(2)}×** (intervalo ${confidenceLow.toFixed(2)}–${confidenceHigh.toFixed(2)}×).`,
  ].filter(Boolean).join(" ");

  return {
    predictedRoas,
    confidenceLow,
    confidenceHigh,
    horizonDays: horizon,
    narrative,
    inputs: {
      baseRoas,
      trendSlope:         Math.round(slope * 1000) / 1000,
      decisionAdjustment: Math.round(decisionAdj * 1000) / 1000,
      seasonalityFactor:  Math.round(avgSeasonality * 1000) / 1000,
      daysOfData,
    },
  };
}
