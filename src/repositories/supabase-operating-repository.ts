
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { MockOperatingRepository } from "@/repositories/mock-operating-repository";
import { OperatingRepository } from "@/repositories/operating-repository";
import {
  AutopilotExecutionLog,
  CampaignSnapshot,
  IntegrationCredential,
  OperationSnapshot,
  ProfitSnapshot,
  WorkspaceIntegration,
} from "@/types/erizon";

export class SupabaseOperatingRepository implements OperatingRepository {
  private readonly fallback = new MockOperatingRepository();

  async getSnapshot(): Promise<OperationSnapshot> {
    const supabase = getSupabaseServerClient();

    const [clientsRes, campaignsRes, creativesRes, benchmarksRes, rulesRes, timelineRes] = await Promise.all([
      supabase.from("clients").select("*"),
      supabase.from("campaign_snapshots").select("*").order("snapshot_date", { ascending: false }).limit(100),
      supabase.from("creative_assets").select("*"),
      supabase.from("network_benchmarks").select("*"),
      supabase.from("autopilot_rules").select("*"),
      supabase.from("timeline_events").select("*").order("timestamp", { ascending: false }).limit(50),
    ]);

    if ([clientsRes, campaignsRes, creativesRes, benchmarksRes, rulesRes, timelineRes].some((item) => item.error)) {
      return this.fallback.getSnapshot();
    }

    return {
      generatedAt: new Date().toISOString(),
      clients: (clientsRes.data ?? []) as OperationSnapshot["clients"],
      campaigns: (campaignsRes.data ?? []) as OperationSnapshot["campaigns"],
      creatives: (creativesRes.data ?? []) as OperationSnapshot["creatives"],
      benchmarks: (benchmarksRes.data ?? []) as OperationSnapshot["benchmarks"],
      rules: (rulesRes.data ?? []) as OperationSnapshot["rules"],
      timeline: (timelineRes.data ?? []) as OperationSnapshot["timeline"],
    };
  }

  async getIntegrations(workspaceId: string): Promise<WorkspaceIntegration[]> {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("workspace_integrations").select("*").eq("workspace_id", workspaceId);
    if (error) return [];
    return (data ?? []).map((item) => ({
      id: item.id,
      workspaceId: item.workspace_id,
      kind: item.kind,
      status: item.status,
      externalAccountId: item.external_account_id,
      accessTokenMasked: item.access_token_masked,
      refreshTokenMasked: item.refresh_token_masked,
      lastSyncedAt: item.last_synced_at,
    })) as WorkspaceIntegration[];
  }

  async getCredentials(workspaceId: string): Promise<IntegrationCredential[]> {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("integration_credentials").select("*").eq("workspace_id", workspaceId);
    if (error) return [];
    return (data ?? []).map((item) => ({
      workspaceId: item.workspace_id,
      provider: item.provider,
      externalAccountId: item.external_account_id,
      accessToken: item.access_token,
      refreshToken: item.refresh_token ?? undefined,
      expiresAt: item.expires_at ?? undefined,
      metadata: item.metadata ?? undefined,
    })) as IntegrationCredential[];
  }

  async upsertCampaignSnapshots(rows: CampaignSnapshot[]): Promise<void> {
    const supabase = getSupabaseServerClient();
    await supabase.from("campaign_snapshots").upsert(
      rows.map((row) => ({
        id: row.id,
        client_id: row.clientId,
        name: row.name,
        objective: row.objective,
        channel: row.channel,
        audience: row.audience,
        active_days: row.activeDays,
        daily_budget: row.dailyBudget,
        spend_today: row.spendToday,
        impressions: row.impressions,
        clicks: row.clicks,
        conversions: row.conversions,
        revenue_today: row.revenueToday,
        frequency: row.frequency,
        cpm: row.cpm,
        cpc: row.cpc,
        ctr: row.ctr,
        cpa: row.cpa,
        roas: row.roas,
        last_roas: row.lastRoas,
        last_ctr: row.lastCtr,
        last_cpa: row.lastCpa,
        current_creative_id: row.currentCreativeId,
        approved_by_autopilot: row.approvedByAutopilot,
        snapshot_date: new Date().toISOString(),
      })),
      { onConflict: "id" },
    );
  }

  async upsertProfitSnapshots(rows: ProfitSnapshot[]): Promise<void> {
    const supabase = getSupabaseServerClient();
    await supabase.from("profit_snapshots").upsert(
      rows.map((row) => ({
        id: row.id,
        client_id: row.clientId,
        campaign_id: row.campaignId,
        snapshot_date: row.snapshotDate,
        revenue: row.revenue,
        ad_spend: row.adSpend,
        product_cost: row.productCost,
        payment_fees: row.paymentFees,
        logistics: row.logistics,
        refunds: row.refunds,
        net_profit: row.netProfit,
        margin_pct: row.marginPct,
        profit_roas: row.profitRoas,
      })),
      { onConflict: "id" },
    );
  }

  async saveAutopilotLog(entry: AutopilotExecutionLog): Promise<void> {
    const supabase = getSupabaseServerClient();
    await supabase.from("autopilot_execution_logs").insert({
      id: entry.id,
      workspace_id: entry.workspaceId,
      campaign_id: entry.campaignId,
      action: entry.action,
      mode: entry.mode,
      reason: entry.reason,
      created_at: entry.createdAt,
    });
  }

  async getPreviousSnapshots(
    campaignIds: string[],
    beforeDate: string
  ): Promise<Array<{ id: string; roas: number; ctr: number; cpa: number }>> {
    if (campaignIds.length === 0) return [];

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaign_snapshots")
      .select("id, roas, ctr, cpa, snapshot_date")
      .in("id", campaignIds)
      .lt("snapshot_date", beforeDate)
      .order("snapshot_date", { ascending: false });

    if (error || !data) return [];

    // Retorna apenas o snapshot mais recente por campaign_id (já ordenado desc)
    const seen = new Set<string>();
    return data
      .filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      })
      .map((row) => ({
        id: row.id,
        roas: row.roas ?? 0,
        ctr: row.ctr ?? 0,
        cpa: row.cpa ?? 0,
      }));
  }
}
