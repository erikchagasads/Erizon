
import { CampaignEconomics, CampaignSnapshot, ClientAccount } from "@/types/erizon";

export function calculateCampaignEconomics(
  campaign: CampaignSnapshot,
  client: ClientAccount,
): CampaignEconomics {
  const adSpend = campaign.spendToday;
  const revenue = campaign.revenueToday;
  const productCost = revenue * client.productCostRate;
  const paymentFees = revenue * client.paymentFeeRate;
  const logistics = revenue * client.logisticsRate;
  const refunds = revenue * client.refundRate;
  const grossProfit = revenue - adSpend - productCost;
  const netProfit = revenue - adSpend - productCost - paymentFees - logistics - refunds;
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
