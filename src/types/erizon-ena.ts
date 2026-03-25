// ─────────────────────────────────────────────────────────────────────────────
// Erizon Neural Attribution (ENA) — Type definitions
// Fase 1: I.R.E. Score + Waste Index
// ─────────────────────────────────────────────────────────────────────────────

// ─── Waste Detection ─────────────────────────────────────────────────────────

export type WasteCampaign = {
  id: string;
  nome: string;
  type: "zombie" | "saturated" | "cannibal";
  spend: number;
};

export type WasteBreakdown = {
  zombieSpend: number;       // campanhas com gasto alto e zero conversão
  saturatedSpend: number;    // campanhas com frequência alta + CTR caindo
  cannibalSpend: number;     // campanhas do mesmo objetivo acima do benchmark
  totalSpend: number;
  wasteIndex: number;        // 0-1: fração do budget desperdiçado
  wasteSpend: number;        // R$ absoluto desperdiçado
  campaigns: WasteCampaign[];
};

// ─── I.R.E. Score ─────────────────────────────────────────────────────────────

export type IREConfidence = "high" | "medium" | "low";

export type IREResult = {
  ireScore: number;          // 0-100: Índice de Real Eficiência
  normRoas: number;          // 0-1: componente ROAS normalizado
  normQuality: number;       // 0-1: componente qualidade do tráfego
  normDecision: number;      // 0-1: componente taxa de acerto das decisões
  normWaste: number;         // 0-1: componente ausência de desperdício
  wasteBreakdown: WasteBreakdown;
  confidence: IREConfidence; // qualidade da estimativa (depende de dias de dado)
  // Resumo textual para exibição no Pulse
  ireLabel: string;          // ex: "Eficiência Alta", "Atenção", "Crítico"
  ireColor: "emerald" | "amber" | "red";
  wasteMessage: string;      // ex: "R$ 1.200 sendo desperdiçados esta semana"
};

// ─── Banco de dados (row da tabela ena_ire_daily) ─────────────────────────────

export type IREDailyRow = {
  id: string;
  workspaceId: string;
  snapshotDate: string;
  ireScore: number;
  normRoas: number;
  normQuality: number;
  normDecision: number;
  normWaste: number;
  wasteIndex: number;
  wasteBreakdown: WasteBreakdown;
  decisionScore: number;
  totalSpend: number;
  totalRevenue: number;
  activeCampaigns: number;
  computedAt: string;
};

// ─── Sugestão com feedback loop ───────────────────────────────────────────────

export type SuggestionDecision = "applied" | "dismissed" | "deferred";
export type SuggestionOutcome  = "improved" | "degraded" | "neutral" | "pending";

export type SuggestionMetricSnapshot = {
  cpl: number;
  roas: number;
  spend: number;
  score?: number;
};

export type AutopilotSuggestionWithOutcome = {
  id: string;
  workspaceId: string;
  campaignId: string;
  suggestionType: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  createdAt?: string;
  decidedAt?: string;
  decidedBy?: string;
  decision?: SuggestionDecision;
  outcome7d?: SuggestionOutcome;
  outcome14d?: SuggestionOutcome;
  outcome30d?: SuggestionOutcome;
  metricBefore?: SuggestionMetricSnapshot;
  metricAfter7d?: SuggestionMetricSnapshot;
};

// ─── Resposta da API /api/ena/ire ─────────────────────────────────────────────

export type IREApiResponse = {
  latest: IREDailyRow | null;
  trend: "up" | "down" | "stable";
  history: IREDailyRow[];
};
