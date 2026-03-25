import type { AutopilotRule, CampaignEconomics, CampaignSnapshot, CreativeAsset, TimelineEvent } from "@/types/erizon";
import type { AutopilotSuggestion, CampaignObjective, ObjectiveBenchmarks } from "@/types/erizon-v7";

export type AutopilotInput = {
  objective?: CampaignObjective;
  benchmarks?: ObjectiveBenchmarks;
  ctr: number;
  cpl: number;
  cpa?: number;
  cpm?: number;
  cpc?: number;
  roas?: number;
  frequency?: number;
  spend?: number;
  roi: number;
  benchmarkCtr?: number;
  benchmarkCpl?: number;
};

export type AutopilotEvaluation = {
  matched: boolean;
  ruleId: string;
  campaignId: string;
  reason: string;
  suggestedAction: string;
  requiresApproval: boolean;
};

export function buildAutopilotSuggestions(input: AutopilotInput): AutopilotSuggestion[] {
  const objective  = input.objective ?? "UNKNOWN";
  const benchmarks = input.benchmarks;
  const suggestions: AutopilotSuggestion[] = [];

  // ── CTR / Criativo (LEADS, TRAFFIC, ENGAGEMENT, UNKNOWN) ────────────────
  const ctrObjectives = new Set(["LEADS", "TRAFFIC", "ENGAGEMENT", "UNKNOWN"]);
  if (ctrObjectives.has(objective)) {
    const benchmarkCtr = input.benchmarkCtr ?? benchmarks?.benchmarkCtr ?? 1.5;
    if (benchmarkCtr && input.ctr < benchmarkCtr * 0.75) {
      suggestions.push({
        suggestionType: "creative_refresh",
        title: "Trocar criativo da campanha",
        description: "CTR abaixo do benchmark sugere fadiga criativa ou mensagem fraca.",
        priority: "high",
      });
    }
  }

  // ── LEADS: CPL ───────────────────────────────────────────────────────────
  if (objective === "LEADS" || objective === "UNKNOWN") {
    const benchmarkCpl = input.benchmarkCpl ?? benchmarks?.benchmarkCpl ?? 20;
    if (benchmarkCpl) {
      // CPL saudável + ROI forte → escalar
      if (input.cpl > 0 && input.cpl < benchmarkCpl * 0.8 && input.roi > 2) {
        suggestions.push({
          suggestionType: "scale_budget",
          title: "Escalar orçamento com cautela",
          description: "CPL saudável e ROI forte indicam margem para aumento de verba.",
          priority: "high",
          payload: { suggestedIncreasePct: 20 },
        });
      }
      // CPL 50%+ acima do benchmark com gasto real → pausar
      if (input.cpl > benchmarkCpl * 1.5 && (input.spend ?? 0) > 0) {
        suggestions.push({
          suggestionType: "pause_and_review",
          title: "Pausar e revisar campanha",
          description: `CPL ${input.cpl.toFixed(2)} está muito acima do benchmark (${benchmarkCpl}). Revise segmentação e criativo.`,
          priority: "high",
        });
      }
    }
  }

  // ── SALES: ROAS ──────────────────────────────────────────────────────────
  if (objective === "SALES") {
    const benchmarkRoas = benchmarks?.benchmarkRoas ?? 3.0;
    const roas = input.roas ?? 0;
    if (roas > 0) {
      // ROAS 30%+ acima do benchmark → escalar agressivo
      if (roas >= benchmarkRoas * 1.3) {
        suggestions.push({
          suggestionType: "scale_budget",
          title: "Escalar orçamento de forma agressiva",
          description: `ROAS ${roas.toFixed(2)} está muito acima do benchmark. Excelente momento para escalar.`,
          priority: "high",
          payload: { suggestedIncreasePct: 30 },
        });
      }
      // ROAS abaixo de 70% do benchmark → reduzir
      else if (roas < benchmarkRoas * 0.7) {
        suggestions.push({
          suggestionType: "reduce_budget",
          title: "Reduzir orçamento",
          description: `ROAS ${roas.toFixed(2)} está abaixo de 70% do benchmark (${benchmarkRoas}). Reduza verba para proteger o ROI.`,
          priority: "high",
        });
      }
    }
  }

  // ── AWARENESS: Frequency + CPM ───────────────────────────────────────────
  if (objective === "AWARENESS") {
    const benchmarkFreq = benchmarks?.benchmarkFrequency ?? 4.0;
    const benchmarkCpm  = benchmarks?.benchmarkCpm ?? 12.0;
    const frequency = input.frequency ?? 0;
    const cpm       = input.cpm ?? 0;

    // Frequência criticamente alta → refresh de audiência
    if (frequency > 0 && frequency > benchmarkFreq) {
      suggestions.push({
        suggestionType: "refresh_audience",
        title: "Renovar audiência",
        description: `Frequência ${frequency.toFixed(1)} superou o benchmark (${benchmarkFreq}). Troque ou expanda o público.`,
        priority: frequency > benchmarkFreq * 1.5 ? "high" : "medium",
      });
    }

    // CPM 30%+ abaixo do benchmark → escalar (bom custo de alcance)
    if (cpm > 0 && cpm < benchmarkCpm * 0.7) {
      suggestions.push({
        suggestionType: "scale_budget",
        title: "Escalar orçamento de awareness",
        description: `CPM ${cpm.toFixed(2)} está 30%+ abaixo do benchmark. Bom momento para ampliar alcance.`,
        priority: "medium",
      });
    }
  }

  // ── Monitor fallback ─────────────────────────────────────────────────────
  if (!suggestions.length) {
    suggestions.push({
      suggestionType: "monitor",
      title: "Monitorar sem alteração",
      description: `Nenhum gatilho relevante foi acionado para o objetivo ${objective.toLowerCase()} neste ciclo.`,
      priority: "low",
    });
  }

  return suggestions;
}

export function evaluateAutopilotRule(params: {
  rule: AutopilotRule;
  campaign: CampaignSnapshot;
  economics: CampaignEconomics;
  creative?: CreativeAsset;
}): AutopilotEvaluation {
  const { rule, campaign, economics } = params;
  const c = rule.condition;
  const ctrDropPct = campaign.lastCtr > 0 ? ((campaign.lastCtr - campaign.ctr) / campaign.lastCtr) * 100 : 0;

  const matched = [
    c.minProfitRoas == null || economics.profitRoas >= c.minProfitRoas,
    c.minRoas == null || campaign.roas >= c.minRoas,
    c.maxFrequency == null || campaign.frequency <= c.maxFrequency,
    c.minCtr == null || campaign.ctr >= c.minCtr,
    c.maxSpendWithoutConversion == null || !(campaign.spendToday > c.maxSpendWithoutConversion && campaign.conversions <= 0),
    c.maxCtrDropPct == null || ctrDropPct <= c.maxCtrDropPct,
    c.maxProfitRoas == null || economics.profitRoas <= c.maxProfitRoas,
  ].every(Boolean);

  let suggestedAction = "Monitorar campanha";
  switch (rule.action.type) {
    case "increase_budget": suggestedAction = `Aumentar orçamento em ${rule.action.percentage}%`; break;
    case "decrease_budget": suggestedAction = `Reduzir orçamento em ${rule.action.percentage}%`; break;
    case "pause_campaign": suggestedAction = "Pausar campanha"; break;
    case "request_creative_refresh": suggestedAction = "Solicitar refresh criativo"; break;
  }

  return {
    matched,
    ruleId: rule.id,
    campaignId: campaign.id,
    reason: matched ? rule.description : "Condição da regra não atendida",
    suggestedAction,
    requiresApproval: rule.requiresApproval,
  };
}

export function appendAutopilotTimeline(
  timeline: TimelineEvent[],
  evaluation: AutopilotEvaluation,
): TimelineEvent[] {
  if (!evaluation.matched) return timeline;
  return [
    {
      id: `timeline-${evaluation.ruleId}-${evaluation.campaignId}`,
      timestamp: new Date().toISOString(),
      actor: "Autopilot",
      action: evaluation.suggestedAction,
      detail: evaluation.reason,
      relatedCampaignId: evaluation.campaignId,
    },
    ...timeline,
  ];
}
