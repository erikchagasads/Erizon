// Cockpit Service
// Orquestra geracao de decisoes, aprovacao e execucao via Meta Ads API.
// v2: integra TrainingDataService para coleta automatica de dados de fine-tuning.

import { SupabaseClient } from "@supabase/supabase-js";
import { DecisionRepository } from "@/repositories/supabase/decision-repository";
import { generateDecisions } from "@/core/decision-generator";
import { TrainingDataService } from "@/services/training-data-service";
import type { PendingDecision, AutopilotConfig, CockpitState, CockpitMode } from "@/types/erizon-cockpit";
import type { EngineResult } from "@/app/lib/engine/pulseEngine";

export class CockpitService {
  private repo: DecisionRepository;
  private training: TrainingDataService;

  constructor(private db: SupabaseClient) {
    this.repo = new DecisionRepository(db);
    this.training = new TrainingDataService(db);
  }

  async refreshDecisions(workspaceId: string, engine: EngineResult): Promise<void> {
    await this.repo.expireOld();
    const existing = await this.repo.getExistingPairs(workspaceId);
    const newDecisions = generateDecisions(workspaceId, engine, existing);
    await this.repo.insertMany(newDecisions);
  }

  async getState(workspaceId: string): Promise<CockpitState> {
    const [pending, config] = await Promise.all([
      this.repo.getPending(workspaceId),
      this.repo.getConfig(workspaceId),
    ]);

    const totalImpactBrl = pending.reduce((sum, decision) => sum + (decision.estimated_impact_brl ?? 0), 0);
    const counts = pending.reduce(
      (acc, decision) => {
        acc[decision.action_type] = (acc[decision.action_type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ) as CockpitState["counts"];

    const hasCritical = pending.some((decision) => decision.action_type === "pause" && decision.confidence === "high");
    let mode: CockpitMode = "PAZ";
    if (hasCritical) mode = "ALERTA";
    else if (pending.length > 0) mode = "DECISÃO";

    return { mode, pending, config, total_impact_brl: totalImpactBrl, counts };
  }

  async approve(
    decisionId: string,
    userId: string,
    accessToken: string,
    overrideValue?: number
  ): Promise<{ decision: PendingDecision; executed: boolean; error?: string }> {
    const { data: row } = await this.db
      .from("pending_decisions")
      .select("*")
      .eq("id", decisionId)
      .single();

    if (!row) throw new Error("Decisão não encontrada");
    if (row.status !== "pending") throw new Error(`Decisão já está com status: ${row.status}`);

    const decision = await this.repo.updateStatus(decisionId, "approved", userId);

    if (!row.meta_payload || row.action_type === "alert") {
      await this.training.recordFromDecision({
        workspaceId: row.workspace_id,
        decisionId,
        campaignId: row.campaign_id ?? "",
        actionType: row.action_type,
        rationale: row.rationale,
        campaignContext: row.meta_payload ?? {},
        executionSuccess: false,
      }).catch(() => {});

      return { decision, executed: false };
    }

    try {
      const payload = { ...row.meta_payload };
      if (overrideValue && payload.action === "UPDATE_BUDGET") {
        payload.newBudget = overrideValue;
      }

      const metaRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/meta-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cockpit-token": process.env.CRON_SECRET ?? "",
        },
        body: JSON.stringify({ ...payload, accessToken, decisionId, workspaceId: row.workspace_id }),
      });

      const result = await metaRes.json();

      if (!metaRes.ok) throw new Error(result.error ?? "Erro na API Meta");

      await this.repo.updateStatus(decisionId, "executed", userId, result);

      await this.training.recordFromDecision({
        workspaceId: row.workspace_id,
        decisionId,
        campaignId: row.campaign_id ?? "",
        actionType: row.action_type,
        rationale: row.rationale,
        campaignContext: row.meta_payload ?? {},
        executionSuccess: true,
      }).catch(() => {});

      return { decision: { ...decision, status: "executed" }, executed: true };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
      await this.repo.updateStatus(decisionId, "approved", userId, { error: errMsg });
      return { decision, executed: false, error: errMsg };
    }
  }

  async reject(decisionId: string, userId: string): Promise<PendingDecision> {
    const { data: row } = await this.db
      .from("pending_decisions")
      .select("workspace_id, action_type, rationale, campaign_id, meta_payload")
      .eq("id", decisionId)
      .maybeSingle();

    const result = await this.repo.updateStatus(decisionId, "rejected", userId);

    if (row) {
      try {
        const { error } = await this.db.from("training_rejections").insert({
          workspace_id: row.workspace_id,
          decision_id: decisionId,
          action_type: row.action_type,
          rationale: row.rationale,
          campaign_id: row.campaign_id,
          context: row.meta_payload,
          rejected_by: userId,
          created_at: new Date().toISOString(),
        });

        if (error) {
          throw error;
        }
      } catch {
        // Falha no log auxiliar nao deve bloquear a rejeicao principal.
      }
    }

    return result;
  }

  async getConfig(workspaceId: string): Promise<AutopilotConfig | null> {
    return this.repo.getConfig(workspaceId);
  }

  async updateConfig(config: Partial<AutopilotConfig> & { workspace_id: string }): Promise<AutopilotConfig> {
    return this.repo.upsertConfig(config);
  }

  async getHistory(workspaceId: string) {
    return this.repo.getHistory(workspaceId);
  }
}
