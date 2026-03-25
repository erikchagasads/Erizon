import { createServerSupabase } from "@/lib/supabase/server";
import type { IREResult } from "@/types/erizon-ena";
import type { IREDailyRow } from "@/types/erizon-ena";

type IREDailyInsert = {
  workspace_id: string;
  snapshot_date: string;
  ire_score: number;
  norm_roas: number;
  norm_quality: number;
  norm_decision: number;
  norm_waste: number;
  waste_index: number;
  waste_breakdown: unknown;
  decision_score: number;
  total_spend: number;
  total_revenue: number;
  active_campaigns: number;
};

function mapRow(row: Record<string, unknown>): IREDailyRow {
  return {
    id:               String(row.id),
    workspaceId:      String(row.workspace_id),
    snapshotDate:     String(row.snapshot_date),
    ireScore:         Number(row.ire_score ?? 0),
    normRoas:         Number(row.norm_roas ?? 0),
    normQuality:      Number(row.norm_quality ?? 0),
    normDecision:     Number(row.norm_decision ?? 0),
    normWaste:        Number(row.norm_waste ?? 0),
    wasteIndex:       Number(row.waste_index ?? 0),
    wasteBreakdown:   (row.waste_breakdown as IREDailyRow["wasteBreakdown"]) ?? { zombieSpend: 0, saturatedSpend: 0, cannibalSpend: 0, totalSpend: 0, wasteIndex: 0, wasteSpend: 0, campaigns: [] },
    decisionScore:    Number(row.decision_score ?? 0.5),
    totalSpend:       Number(row.total_spend ?? 0),
    totalRevenue:     Number(row.total_revenue ?? 0),
    activeCampaigns:  Number(row.active_campaigns ?? 0),
    computedAt:       String(row.computed_at ?? new Date().toISOString()),
  };
}

export class IRERepository {
  private db = createServerSupabase();

  async upsertDaily(
    workspaceId: string,
    snapshotDate: string,
    result: IREResult,
    decisionScore: number,
    totalSpend: number,
    totalRevenue: number,
    activeCampaigns: number,
  ): Promise<void> {
    const row: IREDailyInsert = {
      workspace_id:     workspaceId,
      snapshot_date:    snapshotDate,
      ire_score:        result.ireScore,
      norm_roas:        result.normRoas,
      norm_quality:     result.normQuality,
      norm_decision:    result.normDecision,
      norm_waste:       result.normWaste,
      waste_index:      result.wasteBreakdown.wasteIndex,
      waste_breakdown:  result.wasteBreakdown,
      decision_score:   decisionScore,
      total_spend:      totalSpend,
      total_revenue:    totalRevenue,
      active_campaigns: activeCampaigns,
    };

    const { error } = await this.db
      .from("ena_ire_daily")
      .upsert(row, { onConflict: "workspace_id,snapshot_date" });

    if (error) throw error;
  }

  async getLatest(workspaceId: string): Promise<IREDailyRow | null> {
    const { data, error } = await this.db
      .from("ena_ire_daily")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapRow(data as Record<string, unknown>);
  }

  async getHistory(workspaceId: string, days = 30): Promise<IREDailyRow[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data, error } = await this.db
      .from("ena_ire_daily")
      .select("*")
      .eq("workspace_id", workspaceId)
      .gte("snapshot_date", sinceStr)
      .order("snapshot_date", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
  }

  /**
   * Calcula a taxa de acerto das decisões (decision score) para um workspace.
   * Retorna 0.5 (neutro) quando não há histórico suficiente.
   */
  async getDecisionScore(workspaceId: string): Promise<number> {
    const { data, error } = await this.db
      .from("autopilot_suggestions")
      .select("outcome_7d")
      .eq("workspace_id", workspaceId)
      .eq("decision", "applied")
      .not("outcome_7d", "eq", "pending")
      .not("outcome_7d", "is", null);

    if (error || !data || data.length === 0) return 0.5;

    const total    = data.length;
    const improved = data.filter(r => r.outcome_7d === "improved").length;
    return total >= 5 ? improved / total : 0.5; // neutro enquanto amostra pequena
  }
}
