import { createServerSupabase } from "@/lib/supabase/server";
import type { DailyCampaignSnapshot } from "@/types/erizon-v7";

export type SnapshotWithObjective = {
  campaign_id: string;
  objective: string | null;
  snapshot_date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  leads: number;
  purchases: number;
  revenue: number;
  cpl: number;
  cpa: number;
  roas: number;
  frequency: number;
};

export class SnapshotRepository {
  private db = createServerSupabase();

  async upsertDailySnapshot(snapshot: DailyCampaignSnapshot): Promise<void> {
    const { error } = await this.db
      .from("campaign_snapshots_daily")
      .upsert({
        workspace_id: snapshot.workspaceId,
        client_id: snapshot.clientId ?? null,
        ad_account_id: snapshot.adAccountId,
        campaign_id: snapshot.campaignId,
        snapshot_date: snapshot.snapshotDate,
        spend: snapshot.spend,
        impressions: snapshot.impressions,
        reach: snapshot.reach,
        clicks: snapshot.clicks,
        ctr: snapshot.ctr,
        cpc: snapshot.cpc,
        cpm: snapshot.cpm,
        leads: snapshot.leads,
        purchases: snapshot.purchases,
        revenue: snapshot.revenue,
        cpl: snapshot.cpl,
        cpa: snapshot.cpa,
        roas: snapshot.roas,
        frequency: snapshot.frequency,
        raw_payload: snapshot.rawPayload ?? null,
      }, { onConflict: "campaign_id,snapshot_date" });

    if (error) throw error;
  }

  /**
   * Lists the latest daily snapshots for a workspace, joined with the
   * campaign's objective so engines can apply objective-aware logic.
   */
  async listLatestWithObjective(workspaceId: string): Promise<SnapshotWithObjective[]> {
    const { data, error } = await this.db
      .from("campaign_snapshots_daily")
      .select(`
        campaign_id,
        snapshot_date,
        spend, impressions, reach, clicks,
        ctr, cpc, cpm, leads, purchases, revenue,
        cpl, cpa, roas, frequency,
        campaigns!inner ( objective )
      `)
      .eq("workspace_id", workspaceId)
      .order("snapshot_date", { ascending: false })
      .limit(200);

    if (error) throw error;

    type SnapshotRow = {
      campaign_id: string;
      snapshot_date: string;
      spend: number | null;
      impressions: number | null;
      reach: number | null;
      clicks: number | null;
      ctr: number | null;
      cpc: number | null;
      cpm: number | null;
      leads: number | null;
      purchases: number | null;
      revenue: number | null;
      cpl: number | null;
      cpa: number | null;
      roas: number | null;
      frequency: number | null;
      campaigns: { objective?: string | null } | { objective?: string | null }[] | null;
    };

    return ((data ?? []) as unknown as SnapshotRow[]).map((row) => ({
      campaign_id: row.campaign_id,
      objective: Array.isArray(row.campaigns)
        ? (row.campaigns[0]?.objective ?? null)
        : (row.campaigns?.objective ?? null),
      snapshot_date: String(row.snapshot_date),
      spend: Number(row.spend ?? 0),
      impressions: Number(row.impressions ?? 0),
      reach: Number(row.reach ?? 0),
      clicks: Number(row.clicks ?? 0),
      ctr: Number(row.ctr ?? 0),
      cpc: Number(row.cpc ?? 0),
      cpm: Number(row.cpm ?? 0),
      leads: Number(row.leads ?? 0),
      purchases: Number(row.purchases ?? 0),
      revenue: Number(row.revenue ?? 0),
      cpl: Number(row.cpl ?? 0),
      cpa: Number(row.cpa ?? 0),
      roas: Number(row.roas ?? 0),
      frequency: Number(row.frequency ?? 0),
    }));
  }
}
