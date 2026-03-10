
import { ExternalCampaignRecord, NormalizedCampaignSnapshot } from "@/types/erizon";

export function normalizeCampaignRecord(record: ExternalCampaignRecord): NormalizedCampaignSnapshot {
  return {
    id: record.campaignId,
    clientId: record.clientId,
    name: record.name,
    objective: record.objective,
    channel: record.channel,
    audience: record.audience,
    activeDays: record.activeDays,
    dailyBudget: record.dailyBudget,
    spendToday: record.spend,
    impressions: record.impressions,
    clicks: record.clicks,
    conversions: record.conversions,
    revenueToday: record.revenue,
    frequency: record.frequency,
    cpm: record.cpm,
    cpc: record.cpc,
    ctr: record.ctr,
    cpa: record.cpa,
    roas: record.roas,
    lastRoas: record.previousRoas,
    lastCtr: record.previousCtr,
    lastCpa: record.previousCpa,
    currentCreativeId: record.creativeId,
    approvedByAutopilot: false,
    source: "meta_ads",
    snapshotDate: record.date,
    externalAccountId: record.accountId,
  };
}
