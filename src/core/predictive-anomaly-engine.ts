/**
 * Predictive Anomaly Engine
 * Detecta riscos 24-48h ANTES de acontecerem usando tendências de séries temporais.
 */

export type PredictiveAlertType =
  | "creative_fatigue"
  | "cpl_spike"
  | "roas_degradation"
  | "budget_exhaustion"
  | "frequency_overload";

export type PredictiveAlert = {
  campaignId: string;
  campaignName: string;
  alertType: PredictiveAlertType;
  confidence: number;           // 0-1
  predictedWindowHours: number; // janela de risco (24 ou 48h)
  predictedMetric: string;
  predictedDeltaPct: number;    // mudança esperada (negativo = queda, positivo = alta)
  preventiveAction: string;
  currentValue: number;
  projectedValue: number;
};

type DailyPoint = {
  date: string;
  spend: number;
  roas: number;
  cpl: number;
  ctr: number;
  frequency: number;
  leads: number;
  clicks: number;
};

function linearRegression(points: number[]): { slope: number; r2: number } {
  const n = points.length;
  if (n < 3) return { slope: 0, r2: 0 };

  const xs = Array.from({ length: n }, (_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = points.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * points[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R² (qualidade do ajuste)
  const meanY = sumY / n;
  const ssTot = points.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, y, i) => s + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, r2: Math.max(0, r2) };
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function detectPredictiveAnomalies(
  campaignId: string,
  campaignName: string,
  history: DailyPoint[],  // últimos 7-14 dias, ordenados por data crescente
  frequencySweetSpot?: number | null  // do Profit DNA
): PredictiveAlert[] {
  const alerts: PredictiveAlert[] = [];
  if (history.length < 5) return alerts;

  const recent = history.slice(-7);  // últimos 7 dias

  // ── 1. Fadiga de criativo (frequência + CTR caindo) ───────────────────────
  const freqs = recent.map(d => d.frequency).filter(f => f > 0);
  const ctrs  = recent.map(d => d.ctr).filter(c => c > 0);

  if (freqs.length >= 4 && ctrs.length >= 4) {
    const sweetSpot = frequencySweetSpot ?? 3.5;
    const lastFreq  = freqs[freqs.length - 1];
    const { slope: freqSlope } = linearRegression(freqs);
    const { slope: ctrSlope, r2: ctrR2 } = linearRegression(ctrs);

    // Frequência subindo + CTR caindo = fadiga iminente
    if (freqSlope > 0.15 && ctrSlope < -0.001 && ctrR2 > 0.5) {
      const daysToFatigue = Math.max(1, Math.round((sweetSpot - lastFreq) / freqSlope));
      if (daysToFatigue <= 2) {
        const currentCtr = ctrs[ctrs.length - 1];
        const projectedCtr = Math.max(0, currentCtr + ctrSlope * 2);
        alerts.push({
          campaignId, campaignName,
          alertType: "creative_fatigue",
          confidence: Math.min(0.95, 0.5 + ctrR2 * 0.45),
          predictedWindowHours: daysToFatigue * 24,
          predictedMetric: "CTR",
          predictedDeltaPct: Math.round(((projectedCtr - currentCtr) / currentCtr) * 100),
          preventiveAction: `Renove o criativo ou expanda o público antes que a frequência ultrapasse ${sweetSpot.toFixed(1)}x. Frequência atual: ${lastFreq.toFixed(1)}x`,
          currentValue: currentCtr,
          projectedValue: projectedCtr,
        });
      }
    }
  }

  // ── 2. Spike de CPL (tendência de alta) ──────────────────────────────────
  const cpls = recent.map(d => d.cpl).filter(c => c > 0 && c < 9999);
  if (cpls.length >= 4) {
    const { slope: cplSlope, r2: cplR2 } = linearRegression(cpls);
    const currentCpl = cpls[cpls.length - 1];
    const avgCpl = avg(cpls);

    if (cplSlope > 0 && cplR2 > 0.45) {
      const projectedCpl = currentCpl + cplSlope * 2;
      const deltaPct = ((projectedCpl - avgCpl) / avgCpl) * 100;

      if (deltaPct > 25) {
        alerts.push({
          campaignId, campaignName,
          alertType: "cpl_spike",
          confidence: Math.min(0.9, 0.45 + cplR2 * 0.45),
          predictedWindowHours: 48,
          predictedMetric: "CPL",
          predictedDeltaPct: Math.round(deltaPct),
          preventiveAction: `CPL em tendência de alta acelerada. Analise segmentação e criativo. Considere testar novo público ou pausar conjuntos de anúncios com CPL acima de R$${Math.round(currentCpl * 1.3)}.`,
          currentValue: currentCpl,
          projectedValue: Math.round(projectedCpl),
        });
      }
    }
  }

  // ── 3. Degradação de ROAS ─────────────────────────────────────────────────
  const roass = recent.map(d => d.roas).filter(r => r > 0);
  if (roass.length >= 4) {
    const { slope: roasSlope, r2: roasR2 } = linearRegression(roass);
    const currentRoas = roass[roass.length - 1];

    if (roasSlope < -0.1 && roasR2 > 0.45) {
      const projectedRoas = Math.max(0, currentRoas + roasSlope * 2);
      const deltaPct = ((projectedRoas - currentRoas) / currentRoas) * 100;

      if (deltaPct < -20 && projectedRoas < 1.5) {
        alerts.push({
          campaignId, campaignName,
          alertType: "roas_degradation",
          confidence: Math.min(0.88, 0.45 + roasR2 * 0.43),
          predictedWindowHours: 48,
          predictedMetric: "ROAS",
          predictedDeltaPct: Math.round(deltaPct),
          preventiveAction: `ROAS em queda consistente. Se atingir menos de 1.0x em ${Math.ceil(48 / 24)} dias, a campanha estará queimando dinheiro. Aja antes: revise oferta, landing page ou pause para testar nova segmentação.`,
          currentValue: parseFloat(currentRoas.toFixed(2)),
          projectedValue: parseFloat(projectedRoas.toFixed(2)),
        });
      }
    }
  }

  // ── 4. Exaustão de budget ─────────────────────────────────────────────────
  const spends = recent.map(d => d.spend).filter(s => s > 0);
  if (spends.length >= 4) {
    const { slope: spendSlope } = linearRegression(spends);
    const currentSpend = spends[spends.length - 1];

    // Gasto acelerando sem melhora proporcional de resultado
    if (spendSlope > currentSpend * 0.15) {
      const leads = recent.map(d => d.leads).filter(l => l >= 0);
      const { slope: leadsSlope } = linearRegression(leads);
      if (leadsSlope < 0 || (leadsSlope / spendSlope < 0.5)) {
        alerts.push({
          campaignId, campaignName,
          alertType: "budget_exhaustion",
          confidence: 0.7,
          predictedWindowHours: 24,
          predictedMetric: "Gasto/Lead",
          predictedDeltaPct: Math.round(spendSlope / currentSpend * 100),
          preventiveAction: `Gasto aumentando mais rápido que resultados. Revise o limite de orçamento diário e teste CBO (Campaign Budget Optimization) para redistribuir automaticamente.`,
          currentValue: currentSpend,
          projectedValue: Math.round(currentSpend + spendSlope * 2),
        });
      }
    }
  }

  // ── 5. Frequência acima do limite ────────────────────────────────────────
  if (freqs.length >= 3) {
    const lastFreq = freqs[freqs.length - 1];
    const sweetSpot = frequencySweetSpot ?? 3.5;

    if (lastFreq >= sweetSpot * 0.9 && lastFreq < sweetSpot) {
      alerts.push({
        campaignId, campaignName,
        alertType: "frequency_overload",
        confidence: 0.78,
        predictedWindowHours: 24,
        predictedMetric: "Frequência",
        predictedDeltaPct: Math.round(((sweetSpot - lastFreq) / sweetSpot) * 100 * -1),
        preventiveAction: `Frequência (${lastFreq.toFixed(1)}x) está se aproximando do ponto de fadiga (${sweetSpot.toFixed(1)}x). Expanda o público ou duplique o conjunto com exclusão do público atual.`,
        currentValue: lastFreq,
        projectedValue: lastFreq + 0.5,
      });
    }
  }

  return alerts.sort((a, b) => b.confidence - a.confidence);
}
