
import { CampaignSnapshot, ClientAccount, RiskFlag } from "@/types/erizon";
import { evaluateCampaignHealth } from "@/core/decision-engine";

function round(value: number) {
  return Number(value.toFixed(1));
}

export function buildRiskFlags(campaigns: CampaignSnapshot[], clients: ClientAccount[]): RiskFlag[] {
  const flags: RiskFlag[] = [];

  for (const campaign of campaigns) {
    const client = clients.find((item) => item.id === campaign.clientId);
    if (!client) continue;
    const health = evaluateCampaignHealth(campaign, client);
    const ctrDropPct = campaign.lastCtr > 0 ? ((campaign.lastCtr - campaign.ctr) / campaign.lastCtr) * 100 : 0;

    if (campaign.frequency >= 3.5 && ctrDropPct >= 20) {
      flags.push({
        id: `risk-saturation-${campaign.id}`,
        clientName: client.name,
        campaignName: campaign.name,
        severity: campaign.frequency >= 4 ? "Crítico" : "Alto",
        diagnosis: "Saturação criativa em remarketing ou público estreito.",
        cause: `Frequência ${campaign.frequency} com queda de CTR de ${round(ctrDropPct)}%.`,
        action: "Substituir criativo, abrir nova audiência de apoio e limitar sobreposição de remarketing.",
      });
    }

    if (campaign.spendToday > 450 && campaign.revenueToday === 0) {
      flags.push({
        id: `risk-zombie-${campaign.id}`,
        clientName: client.name,
        campaignName: campaign.name,
        severity: "Crítico",
        diagnosis: "Campanha zumbi com gasto improdutivo.",
        cause: `Já consumiu ${campaign.spendToday} no dia sem nenhuma receita atribuída.`,
        action: "Pausar imediatamente e revisar promessa, landing page e evento de conversão.",
      });
    }

    if (health.score < 55 && campaign.cpa > campaign.lastCpa * 1.25) {
      flags.push({
        id: `risk-cpa-${campaign.id}`,
        clientName: client.name,
        campaignName: campaign.name,
        severity: "Médio",
        diagnosis: "Elevação acelerada de CPA.",
        cause: `CPA foi de ${campaign.lastCpa.toFixed(1)} para ${campaign.cpa.toFixed(1)} na última janela.`,
        action: "Revisar criativo, segmentação e ritmo de aprendizado antes de aumentar verba.",
      });
    }
  }

  return flags;
}
