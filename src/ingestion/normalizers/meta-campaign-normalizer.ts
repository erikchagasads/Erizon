import type { DailyCampaignSnapshot, MetaCampaignInput } from "@/types/erizon-v7";

export function normalizeMetaCampaignSnapshot(input: {
  workspaceId: string;
  clientId?: string | null;
  adAccountId: string;
  campaignId: string;
  snapshotDate: string;
  raw: MetaCampaignInput;
}): DailyCampaignSnapshot {
  const spend = Number(input.raw.insights?.spend ?? 0);
  const leads = Number(input.raw.insights?.leads ?? 0);
  const purchases = Number(input.raw.insights?.purchases ?? 0);
  const revenue = Number(input.raw.insights?.revenue ?? 0);

  return {
    workspaceId: input.workspaceId,
    clientId: input.clientId ?? null,
    adAccountId: input.adAccountId,
    campaignId: input.campaignId,
    snapshotDate: input.snapshotDate,
    spend,
    impressions: Number(input.raw.insights?.impressions ?? 0),
    reach: Number(input.raw.insights?.reach ?? 0),
    clicks: Number(input.raw.insights?.clicks ?? 0),
    ctr: Number(input.raw.insights?.ctr ?? 0),
    cpc: Number(input.raw.insights?.cpc ?? 0),
    cpm: Number(input.raw.insights?.cpm ?? 0),
    leads,
    purchases,
    revenue,
    cpl: leads > 0 ? spend / leads : 0,
    cpa: purchases > 0 ? spend / purchases : 0,
    roas: spend > 0 ? revenue / spend : 0,
    frequency: Number(input.raw.insights?.frequency ?? 0),
    rawPayload: input.raw,
  };
}
