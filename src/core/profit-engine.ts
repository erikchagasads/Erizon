import type { CampaignEconomics, CampaignSnapshot, ClientAccount } from "@/types/erizon";

export function calculateProfit(spend: number, revenue: number) {
  const profit = revenue - spend;
  const roi = spend > 0 ? revenue / spend : 0;
  return { spend, revenue, profit, roi, roas: roi };
}

export function calculateCampaignEconomics(
  campaign: CampaignSnapshot,
  client: ClientAccount,
): CampaignEconomics {
  const revenue = Number(campaign.revenueToday ?? 0);
  const adSpend = Number(campaign.spendToday ?? 0);
  const productCost = revenue * Number(client.productCostRate ?? 0);
  const paymentFees = revenue * Number(client.paymentFeeRate ?? 0);
  const logistics = revenue * Number(client.logisticsRate ?? 0);
  const refunds = revenue * Number(client.refundRate ?? 0);
  const grossProfit = revenue - adSpend - productCost;
  const netProfit = grossProfit - paymentFees - logistics - refunds;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const profitRoas = adSpend > 0 ? netProfit / adSpend : 0;

  return {
    adSpend,
    productCost,
    paymentFees,
    logistics,
    refunds,
    revenue,
    grossProfit,
    netProfit,
    marginPct,
    profitRoas,
  };
}
