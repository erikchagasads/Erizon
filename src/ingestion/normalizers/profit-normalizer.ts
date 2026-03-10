
import { CampaignSnapshot, ClientAccount, ExternalOrderRecord, ProfitSnapshot } from "@/types/erizon";

export function normalizeProfitSnapshot(params: {
  campaign: CampaignSnapshot;
  client: ClientAccount;
  order?: ExternalOrderRecord;
}): ProfitSnapshot {
  const { campaign, client, order } = params;
  const revenue = order?.grossRevenue ?? campaign.revenueToday;
  const refunds = order?.refunds ?? revenue * client.refundRate;
  const paymentFees = order?.fees ?? revenue * client.paymentFeeRate;
  const logistics = order?.logistics ?? revenue * client.logisticsRate;
  const productCost = order?.productCost ?? revenue * client.productCostRate;
  const netProfit = revenue - campaign.spendToday - refunds - paymentFees - logistics - productCost;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const profitRoas = campaign.spendToday > 0 ? netProfit / campaign.spendToday : 0;

  return {
    id: `profit-${campaign.id}-${new Date().toISOString().slice(0, 10)}`,
    clientId: client.id,
    campaignId: campaign.id,
    snapshotDate: new Date().toISOString(),
    revenue,
    adSpend: campaign.spendToday,
    productCost,
    paymentFees,
    logistics,
    refunds,
    netProfit,
    marginPct,
    profitRoas,
  };
}
