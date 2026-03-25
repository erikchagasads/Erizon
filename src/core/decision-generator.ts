// ── Decision Generator ────────────────────────────────────────────────────────
// Recebe dados do engine e gera a fila de PendingDecision para o Cockpit.
// Regras:
//   - Pause:          campanha sem leads + gasto > R$150 por 3+ dias consecutivos (zombie)
//   - Reduce budget:  ROAS < 1.0 + gasto > R$100
//   - Scale budget:   ROAS ≥ 2.5 + score ≥ 80 + leads > 0 (campanha vencedora)
//   - Alert:          ROAS global < 1.5 (sem ação automática, só alerta)
//   - Resume:         campanha pausada cujo CPL benchmark melhorou (heurístico)

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

export function generateDecisions(
  workspaceId: string,
  engine: EngineResult,
  /** Já existentes em DB para evitar duplicatas */
  existingCampaignActionPairs: Set<string>
): Omit<PendingDecision, "id">[] {
  const decisions: Omit<PendingDecision, "id">[] = [];

  const skip = (campaignId: string | null, type: ActionType) =>
    existingCampaignActionPairs.has(`${campaignId ?? "null"}::${type}`);

  // ── 1. Pause: zombie (sem leads, gastando muito) ──────────────────────────
  const zombies = engine.campanhas.filter(c =>
    c.leadsSimulados === 0 &&
    c.gastoSimulado > 150 &&
    !["awareness", "traffic"].includes((c.objetivo as string | undefined)?.toLowerCase() ?? "")
  );

  for (const c of zombies) {
    if (skip(c.id ?? null, "pause")) continue;

    decisions.push(makeDecision(workspaceId, {
      campaign_id: c.id ?? null,
      campaign_name: c.nome_campanha,
      action_type: "pause",
      title: `Pausar "${c.nome_campanha}"`,
      rationale: `Gastou R$${fmtBRL(c.gastoSimulado)} sem gerar nenhum lead. Score: ${c.scoreCampanha}/100. Pausar evita desperdício de R$${fmtBRL(c.gastoSimulado / 7)}/dia.`,
      estimated_impact_brl: c.gastoSimulado / 7,
      confidence: confidence(c.scoreCampanha, c.leadsSimulados + 1),
      meta_payload: {
        action: "PAUSE",
        campaignId: c.id,
        campaignName: c.nome_campanha,
      },
    }));
  }

  // ── 2. Reduce budget: ROAS abaixo de 1 ────────────────────────────────────
  const prejuizos = engine.campanhas.filter(c =>
    c.roas < 1.0 &&
    c.gastoSimulado > 100 &&
    c.leadsSimulados > 0
  );

  for (const c of prejuizos) {
    if (skip(c.id ?? null, "reduce_budget")) continue;

    const novoBudget = Math.max(30, c.gastoSimulado * 0.5);
    decisions.push(makeDecision(workspaceId, {
      campaign_id: c.id ?? null,
      campaign_name: c.nome_campanha,
      action_type: "reduce_budget",
      title: `Reduzir budget de "${c.nome_campanha}"`,
      rationale: `ROAS ${c.roas.toFixed(2)}× está abaixo de 1. Cada R$1 investido retorna R$${c.roas.toFixed(2)}. Reduzir 50% o orçamento limita o prejuízo.`,
      estimated_impact_brl: c.gastoSimulado - novoBudget,
      confidence: confidence(100 - c.scoreCampanha, c.leadsSimulados),
      meta_payload: {
        action: "UPDATE_BUDGET",
        campaignId: c.id,
        campaignName: c.nome_campanha,
        newBudget: novoBudget,
      },
    }));
  }

  // ── 3. Scale budget: vencedoras ───────────────────────────────────────────
  const vencedoras = engine.campanhas.filter(c =>
    c.roas >= 2.5 &&
    c.scoreCampanha >= 80 &&
    c.leadsSimulados > 0 &&
    c.gastoSimulado > 0
  );

  for (const c of vencedoras) {
    if (skip(c.id ?? null, "scale_budget")) continue;

    const aumentoBudget = c.gastoSimulado * 1.3;
    const ganhoEstimado = (aumentoBudget - c.gastoSimulado) * c.roas;
    decisions.push(makeDecision(workspaceId, {
      campaign_id: c.id ?? null,
      campaign_name: c.nome_campanha,
      action_type: "scale_budget",
      title: `Escalar "${c.nome_campanha}"`,
      rationale: `ROAS ${c.roas.toFixed(2)}× com score ${c.scoreCampanha}/100. Campanha vencedora em janela de crescimento. Aumentar 30% o budget pode gerar +R$${fmtBRL(ganhoEstimado)} em receita.`,
      estimated_impact_brl: ganhoEstimado,
      confidence: confidence(c.scoreCampanha, c.leadsSimulados),
      meta_payload: {
        action: "UPDATE_BUDGET",
        campaignId: c.id,
        campaignName: c.nome_campanha,
        newBudget: aumentoBudget,
      },
    }));
  }

  // ── 4. Alert: ROAS global preocupante (sem ação de API, só alerta) ─────────
  if (engine.roasGlobal < 1.5 && engine.totalGasto > 200 && !skip(null, "alert")) {
    decisions.push(makeDecision(workspaceId, {
      campaign_id: null,
      campaign_name: null,
      action_type: "alert",
      title: "ROAS global abaixo do mínimo",
      rationale: `ROAS global ${engine.roasGlobal.toFixed(2)}× está abaixo do break-even de 1.5×. Revise criativos, públicos e configurações de conversão.`,
      estimated_impact_brl: 0,
      confidence: "high",
      meta_payload: null,
    }));
  }

  // Ordenar: maior impacto primeiro, alerts por último
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

// ── Enhanced: generates decisions with audit trail + feedback loop ─────────
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
          .filter((c) => c.id === decision.campaign_id)
          .flatMap((c) => [
            { name: "ROAS", score: Math.round(c.roas * 20) },
            { name: "Score campanha", score: c.scoreCampanha },
          ]);

        // 1. Gerar explicação
        const explanation = await explainabilityService.explainDecision({
          action: decision.action_type,
          campaign_name: decision.campaign_name ?? "Global",
          factors,
          confidence: decision.confidence === "high" ? 0.9 : decision.confidence === "medium" ? 0.7 : 0.5,
        });

        // 2. Registrar predição para feedback loop
        let feedback_id: string | undefined;
        if (decision.campaign_id) {
          const campaignData = engine.campanhas.find((c) => c.id === decision.campaign_id);
          if (campaignData) {
            const fb = await feedbackLoopService.recordPrediction({
              workspace_id: workspaceId,
              decision_id: decision.campaign_id,
              campaign_id: decision.campaign_id,
              predicted_metric: "roas",
              predicted_value: campaignData.roas,
              predicted_confidence: decision.confidence === "high" ? 0.9 : 0.6,
            }).catch(() => null);
            feedback_id = fb?.id;
          }
        }

        // 3. Registrar audit trail
        const audit_trail_id = await auditTrailService.logDecision({
          workspace_id: workspaceId,
          decision_id: decision.campaign_id ?? workspaceId,
          campaign_id: decision.campaign_id ?? workspaceId,
          campaign_snapshot: { campaign_name: decision.campaign_name, roas_global: engine.roasGlobal },
          applied_rules: [],
          reasoning: {
            anomaly_score: engine.roasGlobal < 1.0 ? 0.9 : 0.4,
            confidence: decision.confidence === "high" ? 0.9 : decision.confidence === "medium" ? 0.7 : 0.5,
            factors: factors.map((f) => ({ factor: f.name, score: f.score })),
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
