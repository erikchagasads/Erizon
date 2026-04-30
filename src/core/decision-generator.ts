// Decision Generator
// Recebe dados do engine e gera a fila de PendingDecision para o Cockpit.
// Regras alinhadas com a leitura da analytics:
//   - Pause: campanhas criticas com score baixo ou ROAS abaixo do minimo saudavel
//   - Reduce budget: ROAS abaixo de 1.5 em campanhas com algum resultado
//   - Scale budget: ROAS >= 2.5 com score >= 70
//   - Alert: ROAS global < 1.5 (sem acao automatica, so alerta)

import type { ActionType, ConfidenceLevel, PendingDecision } from "@/types/erizon-cockpit";
import type { EngineResult } from "@/app/lib/engine/pulseEngine";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function makeDecision(
  workspaceId: string,
  partial: Omit<PendingDecision, "id" | "workspace_id" | "created_at" | "expires_at" | "decided_at" | "decided_by" | "execution_result" | "status">
): Omit<PendingDecision, "id"> {
  return {
    ...partial,
    workspace_id: workspaceId,
    status: "pending",
    decided_at: null,
    decided_by: null,
    execution_result: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function confidence(score: number, dataPoints: number): ConfidenceLevel {
  if (dataPoints < 3) return "low";
  if (score >= 80 || score <= 20) return "high";
  if (score >= 60 || score <= 40) return "medium";
  return "low";
}

function metaCampaignId(campaign: { id?: string; meta_campaign_id?: string | null }): string | undefined {
  return campaign.meta_campaign_id ?? campaign.id;
}

export function generateDecisions(
  workspaceId: string,
  engine: EngineResult,
  existingCampaignActionPairs: Set<string>
): Omit<PendingDecision, "id">[] {
  const decisions: Omit<PendingDecision, "id">[] = [];

  const skip = (campaignId: string | null, type: ActionType) =>
    existingCampaignActionPairs.has(`${campaignId ?? "null"}::${type}`);

  const criticalCampaigns = engine.campanhas.filter((campaign) => {
    const objective = String((campaign as { objective?: string; objetivo?: string }).objective ?? (campaign as { objective?: string; objetivo?: string }).objetivo ?? "").toLowerCase();
    const isAwareness = objective.includes("awareness") || objective.includes("traffic") || objective.includes("reach");

    return !isAwareness && campaign.gastoSimulado >= 50 && (
      campaign.recomendacao === "Pausar" ||
      campaign.recomendacao === "ROAS crÃ­tico" ||
      campaign.scoreCampanha <= 45 ||
      (campaign.roas > 0 && campaign.roas < 1)
    );
  });

  for (const campaign of criticalCampaigns) {
    if (skip(campaign.id ?? null, "pause")) continue;

    const spendPerDay = campaign.gastoSimulado / Math.max(1, campaign.diasAtivo);
    const rationale = campaign.leadsSimulados > 0
      ? `ROAS ${campaign.roas.toFixed(2)}x com score ${campaign.scoreCampanha}/100 esta abaixo do minimo saudavel. A campanha consome R$${fmtBRL(spendPerDay)}/dia com retorno insuficiente.`
      : `Gastou R$${fmtBRL(campaign.gastoSimulado)} sem gerar resultado util. Score ${campaign.scoreCampanha}/100. Pausar evita desperdicio adicional de R$${fmtBRL(spendPerDay)}/dia.`;

    decisions.push(makeDecision(workspaceId, {
      campaign_id: campaign.id ?? null,
      campaign_name: campaign.nome_campanha,
      action_type: "pause",
      title: `Pausar "${campaign.nome_campanha}"`,
      rationale,
      estimated_impact_brl: Math.max(spendPerDay * 7, campaign.gastoSimulado * 0.25),
      confidence: confidence(campaign.scoreCampanha, campaign.leadsSimulados + 1),
      meta_payload: {
        action: "PAUSE",
        campaignId: metaCampaignId(campaign),
        campaignName: campaign.nome_campanha,
      },
    }));
  }

  const budgetReductionCandidates = engine.campanhas.filter((campaign) =>
    campaign.roas < 1.5 &&
    campaign.gastoSimulado > 100 &&
    campaign.leadsSimulados > 0 &&
    campaign.scoreCampanha > 45
  );

  for (const campaign of budgetReductionCandidates) {
    if (skip(campaign.id ?? null, "reduce_budget")) continue;

    const newBudget = Math.max(30, campaign.gastoSimulado * 0.5);
    decisions.push(makeDecision(workspaceId, {
      campaign_id: campaign.id ?? null,
      campaign_name: campaign.nome_campanha,
      action_type: "reduce_budget",
      title: `Reduzir budget de "${campaign.nome_campanha}"`,
      rationale: `ROAS ${campaign.roas.toFixed(2)}x esta abaixo do minimo saudavel. Reduzir 50% do orcamento limita o prejuizo sem desligar totalmente a campanha.`,
      estimated_impact_brl: campaign.gastoSimulado - newBudget,
      confidence: confidence(100 - campaign.scoreCampanha, campaign.leadsSimulados),
      meta_payload: {
        action: "UPDATE_BUDGET",
        campaignId: metaCampaignId(campaign),
        campaignName: campaign.nome_campanha,
        value: newBudget,
      },
    }));
  }

  const scaleCandidates = engine.campanhas.filter((campaign) =>
    campaign.roas >= 2.5 &&
    campaign.scoreCampanha >= 80 &&
    campaign.gastoSimulado > 0
  );

  for (const campaign of scaleCandidates) {
    if (skip(campaign.id ?? null, "scale_budget")) continue;

    const newBudget = campaign.gastoSimulado * 1.3;
    const estimatedRevenueLift = (newBudget - campaign.gastoSimulado) * campaign.roas;
    decisions.push(makeDecision(workspaceId, {
      campaign_id: campaign.id ?? null,
      campaign_name: campaign.nome_campanha,
      action_type: "scale_budget",
      title: `Escalar "${campaign.nome_campanha}"`,
      rationale: `ROAS ${campaign.roas.toFixed(2)}x com score ${campaign.scoreCampanha}/100. A campanha esta performando como oportunidade real de escala. Aumentar 30% o budget pode gerar +R$${fmtBRL(estimatedRevenueLift)} em receita.`,
      estimated_impact_brl: estimatedRevenueLift,
      confidence: confidence(campaign.scoreCampanha, campaign.leadsSimulados),
      meta_payload: {
        action: "UPDATE_BUDGET",
        campaignId: metaCampaignId(campaign),
        campaignName: campaign.nome_campanha,
        value: newBudget,
      },
    }));
  }

  if (engine.roasGlobal < 1.5 && engine.totalGasto > 200 && !skip(null, "alert")) {
    decisions.push(makeDecision(workspaceId, {
      campaign_id: null,
      campaign_name: null,
      action_type: "alert",
      title: "ROAS global abaixo do minimo",
      rationale: `ROAS global ${engine.roasGlobal.toFixed(2)}x esta abaixo do break-even de 1.5x. Revise criativos, publicos e configuracoes de conversao.`,
      estimated_impact_brl: 0,
      confidence: "high",
      meta_payload: null,
    }));
  }

  return decisions.sort((a, b) => {
    if (a.action_type === "alert" && b.action_type !== "alert") return 1;
    if (b.action_type === "alert" && a.action_type !== "alert") return -1;
    return b.estimated_impact_brl - a.estimated_impact_brl;
  });
}

export function resolveCockpitMode(
  engine: EngineResult,
  pendingCount: number
): "ALERTA" | "DECISÃO" | "PAZ" {
  if (engine.roasGlobal < 1.0 || engine.capitalEmRisco > engine.totalGasto * 0.4) return "ALERTA";
  if (pendingCount > 0) return "DECISÃO";
  return "PAZ";
}

export async function generateDecisionsWithAudit(
  workspaceId: string,
  engine: EngineResult,
  existingCampaignActionPairs: Set<string>
): Promise<Array<Omit<PendingDecision, "id"> & { audit_trail_id?: string; feedback_id?: string }>> {
  const decisions = generateDecisions(workspaceId, engine, existingCampaignActionPairs);

  const [{ explainabilityService }, { auditTrailService }, { feedbackLoopService }] =
    await Promise.all([
      import("@/services/explainability-service"),
      import("@/services/audit-trail-service"),
      import("@/services/feedback-loop-service"),
    ]);

  return Promise.all(
    decisions.map(async (decision) => {
      try {
        const factors = engine.campanhas
          .filter((campaign) => campaign.id === decision.campaign_id)
          .flatMap((campaign) => [
            { name: "ROAS", score: Math.round(campaign.roas * 20) },
            { name: "Score campanha", score: campaign.scoreCampanha },
          ]);

        const explanation = await explainabilityService.explainDecision({
          action: decision.action_type,
          campaign_name: decision.campaign_name ?? "Global",
          factors,
          confidence: decision.confidence === "high" ? 0.9 : decision.confidence === "medium" ? 0.7 : 0.5,
        });

        let feedback_id: string | undefined;
        if (decision.campaign_id) {
          const campaignData = engine.campanhas.find((campaign) => campaign.id === decision.campaign_id);
          if (campaignData) {
            const feedback = await feedbackLoopService.recordPrediction({
              workspace_id: workspaceId,
              decision_id: decision.campaign_id,
              campaign_id: decision.campaign_id,
              predicted_metric: "roas",
              predicted_value: campaignData.roas,
              predicted_confidence: decision.confidence === "high" ? 0.9 : 0.6,
            }).catch(() => null);
            feedback_id = feedback?.id;
          }
        }

        const audit_trail_id = await auditTrailService.logDecision({
          workspace_id: workspaceId,
          decision_id: decision.campaign_id ?? workspaceId,
          campaign_id: decision.campaign_id ?? workspaceId,
          campaign_snapshot: { campaign_name: decision.campaign_name, roas_global: engine.roasGlobal },
          applied_rules: [],
          reasoning: {
            anomaly_score: engine.roasGlobal < 1.0 ? 0.9 : 0.4,
            confidence: decision.confidence === "high" ? 0.9 : decision.confidence === "medium" ? 0.7 : 0.5,
            factors: factors.map((factor) => ({ factor: factor.name, score: factor.score })),
          },
          decision: {
            action: decision.action_type,
            impact_estimated: decision.estimated_impact_brl,
          },
          explanation,
          auto_approved: decision.confidence === "high",
        }).catch(() => undefined);

        return { ...decision, explanation, audit_trail_id, feedback_id };
      } catch {
        return decision;
      }
    })
  );
}
