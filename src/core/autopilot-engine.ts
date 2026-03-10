
import {
  AutopilotRule,
  CampaignEconomics,
  CampaignSnapshot,
  CreativeAsset,
  TimelineEvent,
} from "@/types/erizon";

export type AutopilotEvaluation = {
  ruleId: string;
  campaignId: string;
  matched: boolean;
  reason: string;
  suggestedAction: string;
  requiresApproval: boolean;
};

function ctrDropPct(campaign: CampaignSnapshot) {
  if (campaign.lastCtr <= 0) return 0;
  return ((campaign.lastCtr - campaign.ctr) / campaign.lastCtr) * 100;
}

export function evaluateAutopilotRule(params: {
  rule: AutopilotRule;
  campaign: CampaignSnapshot;
  economics: CampaignEconomics;
  creative?: CreativeAsset;
}): AutopilotEvaluation {
  const { rule, campaign, economics } = params;
  const condition = rule.condition;

  let matched = true;
  const reasons: string[] = [];

  if (condition.minProfitRoas !== undefined) {
    matched &&= economics.profitRoas >= condition.minProfitRoas;
    reasons.push(`Profit ROAS ${economics.profitRoas.toFixed(2)}x >= ${condition.minProfitRoas}x`);
  }
  if (condition.minRoas !== undefined) {
    matched &&= campaign.roas >= condition.minRoas;
    reasons.push(`ROAS ${campaign.roas.toFixed(2)}x >= ${condition.minRoas}x`);
  }
  if (condition.maxFrequency !== undefined) {
    matched &&= campaign.frequency <= condition.maxFrequency;
    reasons.push(`frequência ${campaign.frequency.toFixed(1)} <= ${condition.maxFrequency}`);
  }
  if (condition.minCtr !== undefined) {
    matched &&= campaign.ctr >= condition.minCtr;
    reasons.push(`CTR ${campaign.ctr.toFixed(2)}% >= ${condition.minCtr}%`);
  }
  if (condition.maxSpendWithoutConversion !== undefined) {
    matched &&= campaign.spendToday > condition.maxSpendWithoutConversion && campaign.conversions === 0;
    reasons.push(`gasto ${campaign.spendToday.toFixed(0)} sem conversões`);
  }
  if (condition.maxCtrDropPct !== undefined) {
    const drop = ctrDropPct(campaign);
    matched &&= campaign.frequency >= (condition.maxFrequency ?? 0) && drop >= condition.maxCtrDropPct;
    reasons.push(`queda de CTR ${drop.toFixed(1)}% com frequência ${campaign.frequency.toFixed(1)}`);
  }
  if (condition.maxProfitRoas !== undefined) {
    matched &&= economics.profitRoas <= condition.maxProfitRoas;
    reasons.push(`Profit ROAS ${economics.profitRoas.toFixed(2)}x <= ${condition.maxProfitRoas}x`);
  }

  const action =
    rule.action.type === "increase_budget"
      ? `Aumentar orçamento em ${rule.action.percentage}%`
      : rule.action.type === "decrease_budget"
        ? `Reduzir orçamento em ${rule.action.percentage}%`
        : rule.action.type === "request_creative_refresh"
          ? "Abrir refresh criativo"
          : "Pausar campanha";

  return {
    ruleId: rule.id,
    campaignId: campaign.id,
    matched,
    reason: reasons.join(" • "),
    suggestedAction: action,
    requiresApproval: rule.requiresApproval,
  };
}

export function appendAutopilotTimeline(
  timeline: TimelineEvent[],
  entries: AutopilotEvaluation[],
  campaigns: CampaignSnapshot[],
): TimelineEvent[] {
  const additions = entries
    .filter((item) => item.matched)
    .slice(0, 3)
    .map((item, index) => {
      const campaign = campaigns.find((entry) => entry.id === item.campaignId);
      return {
        id: `auto-${item.ruleId}-${item.campaignId}`,
        timestamp: `2026-03-10T15:0${index}:00-03:00`,
        actor: "Autopilot" as const,
        action: item.suggestedAction,
        detail: `${campaign?.name ?? item.campaignId} | ${item.reason}`,
        relatedCampaignId: item.campaignId,
      };
    });

  return [...timeline, ...additions];
}
