
import { AutopilotEvaluation } from "@/core/autopilot-engine";
import { AutopilotExecutionLog, AutopilotGuardrail, CampaignSnapshot } from "@/types/erizon";

export type GovernedAutopilotResult = {
  evaluation: AutopilotEvaluation;
  mode: AutopilotExecutionLog["mode"];
  blockedBy?: string;
  executionLog: AutopilotExecutionLog;
};

export function applyAutopilotGovernance(params: {
  workspaceId: string;
  guardrail: AutopilotGuardrail;
  evaluation: AutopilotEvaluation;
  campaign: CampaignSnapshot;
  liveMode?: boolean;
}): GovernedAutopilotResult {
  const { workspaceId, guardrail, evaluation, campaign, liveMode = false } = params;

  const now = new Date().toISOString();
  let mode: AutopilotExecutionLog["mode"] = "blocked";
  let blockedBy: string | undefined;

  if (!evaluation.matched) {
    blockedBy = "regra não acionada";
  } else if (guardrail.simulationOnly || !liveMode) {
    mode = "simulation";
  } else if (evaluation.requiresApproval || guardrail.pauseRequiresApproval && evaluation.suggestedAction.toLowerCase().includes("pausar")) {
    mode = "approval_required";
  } else if (
    evaluation.suggestedAction.toLowerCase().includes("aumentar orçamento") &&
    !guardrail.allowedActions.includes("increase_budget")
  ) {
    blockedBy = "ação não autorizada";
  } else if (
    evaluation.suggestedAction.toLowerCase().includes("reduzir orçamento") &&
    !guardrail.allowedActions.includes("decrease_budget")
  ) {
    blockedBy = "ação não autorizada";
  } else if (
    evaluation.suggestedAction.toLowerCase().includes("pausar") &&
    !guardrail.allowedActions.includes("pause_campaign")
  ) {
    blockedBy = "ação não autorizada";
  } else if (evaluation.suggestedAction.toLowerCase().includes("aumentar orçamento")) {
    const pctMatch = evaluation.suggestedAction.match(/(\d+)%/);
    const pct = Number(pctMatch?.[1] ?? "0");
    if (pct > guardrail.dailyBudgetIncreaseLimitPct) {
      blockedBy = "aumento excede guardrail diário";
    } else {
      mode = "executed";
    }
  } else {
    mode = "executed";
  }

  const executionLog: AutopilotExecutionLog = {
    id: `auto-log-${campaign.id}-${Date.now()}`,
    workspaceId,
    campaignId: campaign.id,
    action: evaluation.suggestedAction,
    mode,
    reason: blockedBy ? `${evaluation.reason} • bloqueio: ${blockedBy}` : evaluation.reason,
    createdAt: now,
  };

  return {
    evaluation,
    mode,
    blockedBy,
    executionLog,
  };
}
