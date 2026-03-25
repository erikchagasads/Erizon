import { createServerSupabase } from "@/lib/supabase/server";
import { IntelligenceService } from "@/services/intelligence-service";

export class PulseService {
  private db = createServerSupabase();
  private intelligenceService = new IntelligenceService();

  async getOverview(workspaceId: string) {
    // Use SQL aggregation instead of fetching N rows and summing in JS
    const { data: totalsRow, error } = await this.db
      .from("campaign_snapshots_daily")
      .select("spend.sum(), revenue.sum(), campaign_id.count()")
      .eq("workspace_id", workspaceId)
      .eq("snapshot_date", new Date().toISOString().slice(0, 10))
      .single();

    // Fallback: if the aggregation syntax is not supported by the client version,
    // use an RPC or a raw aggregation query
    let spend = 0;
    let revenue = 0;
    let activeCampaigns = 0;

    if (!error && totalsRow) {
      spend = Number((totalsRow as Record<string, unknown>)["sum"] ?? 0);
      revenue = Number((totalsRow as Record<string, unknown>)["sum_1"] ?? 0);
      activeCampaigns = Number((totalsRow as Record<string, unknown>)["count"] ?? 0);
    } else {
      // Safe fallback via RPC aggregate
      const { data: agg } = await this.db.rpc("get_workspace_daily_totals", {
        p_workspace_id: workspaceId,
        p_snapshot_date: new Date().toISOString().slice(0, 10),
      });

      if (agg) {
        spend = Number(agg.total_spend ?? 0);
        revenue = Number(agg.total_revenue ?? 0);
        activeCampaigns = Number(agg.campaign_count ?? 0);
      }
    }

    const intelligence = await this.intelligenceService.getOverview(workspaceId);

    return {
      totals: {
        spend,
        revenue,
        profit: revenue - spend,
        activeCampaigns,
      },
      anomalies: intelligence.anomalies,
      risks: intelligence.risks,
      opportunities: intelligence.opportunities,
      autopilotSuggestions: intelligence.suggestions,
    };
  }
}
