
import { calculateCampaignEconomics } from "@/core/profit-engine";
import { CampaignSnapshot, ClientAccount, DecisionCalibration, DecisionValidationResult } from "@/types/erizon";

export function validateDecisionInputs(params: {
  campaign: CampaignSnapshot;
  client: ClientAccount;
  calibration?: Partial<DecisionCalibration>;
}): DecisionValidationResult {
  const { campaign, client } = params;
  const calibration: DecisionCalibration = {
    minCtr: params.calibration?.minCtr ?? 1.1,
    minRoas: params.calibration?.minRoas ?? 1.8,
    maxFrequency: params.calibration?.maxFrequency ?? 3.8,
    minProfitRoas: params.calibration?.minProfitRoas ?? 0.7,
    maxSpendWithoutConversion: params.calibration?.maxSpendWithoutConversion ?? 250,
  };

  const notes: string[] = [];
  const economics = calculateCampaignEconomics(campaign, client);

  if (campaign.ctr < calibration.minCtr) notes.push("CTR abaixo do threshold calibrado");
  if (campaign.roas < calibration.minRoas) notes.push("ROAS abaixo do threshold calibrado");
  if (campaign.frequency > calibration.maxFrequency) notes.push("Frequência acima do teto seguro");
  if (economics.profitRoas < calibration.minProfitRoas) notes.push("Profit ROAS abaixo da meta mínima");
  if (campaign.spendToday > calibration.maxSpendWithoutConversion && campaign.conversions === 0) {
    notes.push("Gasto sem conversão acima do limite");
  }

  if (campaign.impressions <= 0 || campaign.clicks < 0) {
    return {
      campaignId: campaign.id,
      status: "bloqueado",
      confidence: 0,
      notes: ["snapshot inválido ou incompleto"],
    };
  }

  if (notes.length >= 3) {
    return {
      campaignId: campaign.id,
      status: "recalibrar",
      confidence: 48,
      notes,
    };
  }

  return {
    campaignId: campaign.id,
    status: "validado",
    confidence: Math.max(60, 96 - (notes.length * 12)),
    notes,
  };
}
