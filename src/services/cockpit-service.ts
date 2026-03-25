// ── Cockpit Service ───────────────────────────────────────────────────────────
// Orquestra geração de decisões, aprovação e execução via Meta Ads API

import { SupabaseClient } from "@supabase/supabase-js";
import { DecisionRepository } from "@/repositories/supabase/decision-repository";
import { generateDecisions } from "@/core/decision-generator";
import type { PendingDecision, AutopilotConfig, CockpitState, CockpitMode } from "@/types/erizon-cockpit";
import type { EngineResult } from "@/app/lib/engine/pulseEngine";

export class CockpitService {
  private repo: DecisionRepository;

  constructor(private db: SupabaseClient) {
    this.repo = new DecisionRepository(db);
  }

  /** Gera novas decisões a partir dos dados do engine, evitando duplicatas */
  async refreshDecisions(workspaceId: string, engine: EngineResult): Promise<void> {
    await this.repo.expireOld();
    const existing = await this.repo.getExistingPairs(workspaceId);
    const newDecisions = generateDecisions(workspaceId, engine, existing);
    await this.repo.insertMany(newDecisions);
  }

  /** Retorna estado completo do cockpit */
  async getState(workspaceId: string): Promise<CockpitState> {
    const [pending, config] = await Promise.all([
      this.repo.getPending(workspaceId),
      this.repo.getConfig(workspaceId),
    ]);

    const total_impact_brl = pending.reduce((s, d) => s + (d.estimated_impact_brl ?? 0), 0);

    const counts = pending.reduce(
      (acc, d) => { acc[d.action_type] = (acc[d.action_type] ?? 0) + 1; return acc; },
      {} as Record<string, number>
    ) as CockpitState["counts"];

    const hasCritical = pending.some(d => d.action_type === "pause" && d.confidence === "high");
    let mode: CockpitMode = "PAZ";
    if (hasCritical) mode = "ALERTA";
    else if (pending.length > 0) mode = "DECISÃO";

    return { mode, pending, config, total_impact_brl, counts };
  }

  /** Aprova e (opcionalmente) executa uma decisão via Meta Ads */
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

    // Marca como aprovada primeiro
    const decision = await this.repo.updateStatus(decisionId, "approved", userId);

    // Se não tem payload de API, só aprova (é um alerta)
    if (!row.meta_payload || row.action_type === "alert") {
      return { decision, executed: false };
    }

    // Tenta executar via Meta Ads
    try {
      const payload = { ...row.meta_payload };

      // Permite override de budget
      if (overrideValue && payload.action === "UPDATE_BUDGET") {
        payload.newBudget = overrideValue;
      }

      const metaRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/meta-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cockpit-token": process.env.CRON_SECRET ?? "",
        },
        body: JSON.stringify({ ...payload, accessToken }),
      });

      const result = await metaRes.json();

      if (!metaRes.ok) throw new Error(result.error ?? "Erro na API Meta");

      await this.repo.updateStatus(decisionId, "executed", userId, result);
      return { decision: { ...decision, status: "executed" }, executed: true };

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
      // Mantém aprovada mesmo se execução falhou — gestor pode retry manual
      await this.repo.updateStatus(decisionId, "approved", userId, { error: errMsg });
      return { decision, executed: false, error: errMsg };
    }
  }

  /** Rejeita uma decisão */
  async reject(decisionId: string, userId: string): Promise<PendingDecision> {
    return this.repo.updateStatus(decisionId, "rejected", userId);
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
