/**
 * autopilot-governance.test.ts
 * Testa applyAutopilotGovernance — o guardião do Autopilot.
 * Esta é a última linha de defesa antes de ações automáticas em contas reais.
 */

import { describe, it, expect } from "vitest";
import { applyAutopilotGovernance } from "@/core/autopilot-governance";
import type { AutopilotEvaluation } from "@/core/autopilot-engine";
import type { AutopilotGuardrail, CampaignSnapshot } from "@/types/erizon";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const campaign: CampaignSnapshot = {
  id: "cmp-1",
  clientId: "cli-1",
  name: "Produto X | Conversão",
  objective: "Compra",
  channel: "Meta Ads",
  audience: "Broad",
  activeDays: 7,
  dailyBudget: 1000,
  spendToday: 800,
  impressions: 40000,
  clicks: 1200,
  conversions: 20,
  revenueToday: 5940,
  frequency: 1.8,
  cpm: 20,
  cpc: 0.67,
  ctr: 3.0,
  cpa: 40,
  roas: 7.4,
  lastRoas: 6.8,
  lastCtr: 2.8,
  lastCpa: 44,
  currentCreativeId: "crt-1",
  approvedByAutopilot: false,
};

const defaultGuardrail: AutopilotGuardrail = {
  id: "guardrail-default",
  workspaceId: "ws-test",
  name: "Default",
  dailyBudgetIncreaseLimitPct: 20,
  pauseRequiresApproval: true,
  simulationOnly: false,
  allowedActions: ["increase_budget", "decrease_budget", "pause_campaign", "request_creative_refresh"],
};

function makeEvaluation(overrides: Partial<AutopilotEvaluation> = {}): AutopilotEvaluation {
  return {
    ruleId: "rule-1",
    campaignId: "cmp-1",
    matched: true,
    reason: "Condição atendida",
    suggestedAction: "Aumentar orçamento em 15%",
    requiresApproval: false,
    ...overrides,
  };
}

// ─── Testes ────────────────────────────────────────────────────────────────────

describe("applyAutopilotGovernance", () => {

  it("modo simulation quando simulationOnly = true, mesmo com tudo válido", () => {
    const result = applyAutopilotGovernance({
      workspaceId: "ws-test",
      guardrail: { ...defaultGuardrail, simulationOnly: true },
      evaluation: makeEvaluation(),
      campaign,
      liveMode: true,
    });
    expect(result.mode).toBe("simulation");
    expect(result.blockedBy).toBeUndefined();
  });

  it("modo simulation quando liveMode = false", () => {
    const result = applyAutopilotGovernance({
      workspaceId: "ws-test",
      guardrail: defaultGuardrail,
      evaluation: makeEvaluation(),
      campaign,
      liveMode: false,
    });
    expect(result.mode).toBe("simulation");
  });

  it("modo blocked quando regra não foi acionada", () => {
    const result = applyAutopilotGovernance({
      workspaceId: "ws-test",
      guardrail: defaultGuardrail,
      evaluation: makeEvaluation({ matched: false }),
      campaign,
      liveMode: true,
    });
    expect(result.mode).toBe("blocked");
  });

  it("modo approval_required quando pausa requer aprovação", () => {
    const result = applyAutopilotGovernance({
      workspaceId: "ws-test",
      guardrail: { ...defaultGuardrail, pauseRequiresApproval: true },
      evaluation: makeEvaluation({ suggestedAction: "Pausar campanha" }),
      campaign,
      liveMode: true,
    });
    expect(result.mode).toBe("approval_required");
  });

  it("modo executed quando aumento de orçamento está dentro do guardrail", () => {
    const result = applyAutopilotGovernance({
      workspaceId: "ws-test",
      guardrail: defaultGuardrail,   // limite 20%
      evaluation: makeEvaluation({ suggestedAction: "Aumentar orçamento em 15%" }),
      campaign,
      liveMode: true,
    });
    expect(result.mode).toBe("executed");
    expect(result.blockedBy).toBeUndefined();
  });

  it("modo blocked quando aumento excede o limite do guardrail", () => {
    const result = applyAutopilotGovernance({
      workspaceId: "ws-test",
      guardrail: { ...defaultGuardrail, dailyBudgetIncreaseLimitPct: 20 },
      evaluation: makeEvaluation({ suggestedAction: "Aumentar orçamento em 35%" }),
      campaign,
      liveMode: true,
    });
    expect(result.mode).toBe("blocked");
    expect(result.blockedBy).toMatch(/guardrail/i);
  });

  it("modo blocked quando ação não está na lista allowedActions", () => {
    const result = applyAutopilotGovernance({
      workspaceId: "ws-test",
      guardrail: { ...defaultGuardrail, allowedActions: [] },   // nada permitido
      evaluation: makeEvaluation({ suggestedAction: "Aumentar orçamento em 10%" }),
      campaign,
      liveMode: true,
    });
    expect(result.mode).toBe("blocked");
  });

  it("executionLog sempre tem id único e workspaceId correto", () => {
    const result = applyAutopilotGovernance({
      workspaceId: "ws-erizon",
      guardrail: defaultGuardrail,
      evaluation: makeEvaluation(),
      campaign,
      liveMode: true,
    });
    expect(result.executionLog.workspaceId).toBe("ws-erizon");
    expect(result.executionLog.id).toBeTruthy();
    expect(result.executionLog.campaignId).toBe("cmp-1");
  });

  it("nunca lança exceção mesmo com evaluation vazia", () => {
    expect(() =>
      applyAutopilotGovernance({
        workspaceId: "ws-test",
        guardrail: defaultGuardrail,
        evaluation: makeEvaluation({ suggestedAction: "" }),
        campaign,
        liveMode: true,
      })
    ).not.toThrow();
  });

  it("requiresApproval = true força approval_required independente da ação", () => {
    const result = applyAutopilotGovernance({
      workspaceId: "ws-test",
      guardrail: defaultGuardrail,
      evaluation: makeEvaluation({ requiresApproval: true, suggestedAction: "Reduzir orçamento em 10%" }),
      campaign,
      liveMode: true,
    });
    expect(result.mode).toBe("approval_required");
  });
});
