// ── Decision Repository ───────────────────────────────────────────────────────
import { SupabaseClient } from "@supabase/supabase-js";
import type { PendingDecision, AutopilotConfig, DecisionStatus } from "@/types/erizon-cockpit";

export class DecisionRepository {
  constructor(private db: SupabaseClient) {}

  /** Busca decisões pendentes de um workspace */
  async getPending(workspaceId: string): Promise<PendingDecision[]> {
    const { data, error } = await this.db
      .from("pending_decisions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PendingDecision[];
  }

  async expireByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.db
      .from("pending_decisions")
      .update({ status: "expired" })
      .in("id", ids);
    if (error) throw error;
  }

  /** Busca histórico recente (aprovadas/rejeitadas/executadas) */
  async getHistory(workspaceId: string, limit = 10): Promise<PendingDecision[]> {
    const { data, error } = await this.db
      .from("pending_decisions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("status", ["approved", "rejected", "executed"])
      .order("decided_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as PendingDecision[];
  }

  /** Retorna par campaign_id::action_type já pendentes (para evitar duplicatas) */
  async getExistingPairs(workspaceId: string): Promise<Set<string>> {
    const { data } = await this.db
      .from("pending_decisions")
      .select("campaign_id, action_type")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending");
    const pairs = new Set<string>();
    for (const row of data ?? []) {
      pairs.add(`${row.campaign_id ?? "null"}::${row.action_type}`);
    }
    return pairs;
  }

  /** Insere novas decisões (bulk) */
  async insertMany(decisions: Omit<PendingDecision, "id">[]): Promise<void> {
    if (decisions.length === 0) return;
    const { error } = await this.db.from("pending_decisions").insert(decisions);
    if (error) throw error;
  }

  /** Atualiza status de uma decisão */
  async updateStatus(
    id: string,
    status: DecisionStatus,
    userId: string,
    executionResult?: Record<string, unknown>
  ): Promise<PendingDecision> {
    const { data, error } = await this.db
      .from("pending_decisions")
      .update({
        status,
        decided_at: new Date().toISOString(),
        decided_by: userId,
        ...(executionResult ? { execution_result: executionResult } : {}),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as PendingDecision;
  }

  /** Expira decisões vencidas */
  async expireOld(): Promise<void> {
    await this.db
      .from("pending_decisions")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());
  }

  // ── AutopilotConfig ────────────────────────────────────────────────────────

  async getConfig(workspaceId: string): Promise<AutopilotConfig | null> {
    const { data } = await this.db
      .from("autopilot_config")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    return data as AutopilotConfig | null;
  }

  async upsertConfig(config: Partial<AutopilotConfig> & { workspace_id: string }): Promise<AutopilotConfig> {
    const { data, error } = await this.db
      .from("autopilot_config")
      .upsert({ ...config, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data as AutopilotConfig;
  }
}
