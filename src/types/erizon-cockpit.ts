// ── Tipos do Cockpit: fila de decisões + autopiloto ──────────────────────────

export type ActionType = "pause" | "resume" | "scale_budget" | "reduce_budget" | "alert";
export type DecisionStatus = "pending" | "approved" | "rejected" | "executed" | "expired";
export type ConfidenceLevel = "low" | "medium" | "high";
export type CockpitMode = "ALERTA" | "DECISÃO" | "PAZ";

export interface PendingDecision {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  action_type: ActionType;
  title: string;
  rationale: string;
  estimated_impact_brl: number;
  confidence: ConfidenceLevel;
  status: DecisionStatus;
  meta_payload: Record<string, unknown> | null;
  created_at: string;
  expires_at: string;
  decided_at: string | null;
  decided_by: string | null;
  execution_result: Record<string, unknown> | null;
}

export interface AutopilotConfig {
  workspace_id: string;
  autopilot_enabled: boolean;
  auto_pause: boolean;
  auto_resume: boolean;
  auto_scale_budget: boolean;
  auto_reduce_budget: boolean;
  shield_max_spend_brl: number;
  max_auto_actions_day: number;
  updated_at: string;
}

export interface CockpitState {
  mode: CockpitMode;
  pending: PendingDecision[];
  config: AutopilotConfig | null;
  /** Total de impacto em R$ das decisões pendentes */
  total_impact_brl: number;
  /** Contagem por tipo */
  counts: Record<ActionType, number>;
}

export interface DecisionApprovalRequest {
  decision_id: string;
  workspace_id: string;
  /** Se for scale/reduce_budget, pode enviar novo valor */
  override_value?: number;
}

export interface CockpitSummary {
  total_gasto: number;
  roas_global: number;
  score_global: number;
  ire_score: number | null;
  leads_total: number;
}
