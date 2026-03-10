
import {
  CampaignHealth,
  CampaignSnapshot,
  ClientAccount,
  CreativeAsset,
  DecisionRecommendation,
  NetworkBenchmark,
} from "@/types/erizon";
import { calculateCampaignEconomics } from "@/core/profit-engine";

function round(value: number) {
  return Number(value.toFixed(2));
}

export function evaluateCampaignHealth(
  campaign: CampaignSnapshot,
  client: ClientAccount,
): CampaignHealth {
  const economics = calculateCampaignEconomics(campaign, client);
  const ctrDeltaPct = campaign.lastCtr > 0 ? ((campaign.ctr - campaign.lastCtr) / campaign.lastCtr) * 100 : 0;
  const roasDeltaPct = campaign.lastRoas > 0 ? ((campaign.roas - campaign.lastRoas) / campaign.lastRoas) * 100 : 0;

  const ctrScore = Math.min(campaign.ctr * 10, 25);
  const roasScore = Math.min(campaign.roas * 4, 30);
  const profitScore = Math.max(Math.min(economics.profitRoas * 18, 25), 0);
  const convScore = Math.min(campaign.conversions * 0.8, 10);
  const frequencyPenalty = campaign.frequency > 4 ? 18 : campaign.frequency > 3 ? 10 : campaign.frequency > 2.5 ? 5 : 0;
  const declinePenalty = ctrDeltaPct < -25 || roasDeltaPct < -20 ? 10 : 0;
  const noSalesPenalty = campaign.spendToday > 450 && campaign.conversions === 0 ? 25 : 0;

  const score = Math.max(Math.round(ctrScore + roasScore + profitScore + convScore - frequencyPenalty - declinePenalty - noSalesPenalty), 0);

  let riskLevel: CampaignHealth["riskLevel"] = "baixo";
  if (score < 35 || economics.profitRoas < 0) riskLevel = "critico";
  else if (score < 50 || campaign.frequency >= 3.5) riskLevel = "alto";
  else if (score < 70 || economics.profitRoas < 1) riskLevel = "medio";

  let status: CampaignHealth["status"] = "Estável";
  if (economics.profitRoas >= 1.4 && campaign.frequency < 2.2 && campaign.ctr > campaign.lastCtr) status = "Escalando";
  else if (riskLevel === "critico" && campaign.conversions <= 1) status = "Zumbi";
  else if (riskLevel === "alto" || riskLevel === "critico") status = "Em risco";

  const scalePotential = Math.max(
    Math.min(
      round((campaign.ctr * 12) + (economics.profitRoas * 18) + (campaign.roas * 4) - (campaign.frequency * 9)),
      100,
    ),
    0,
  );

  return { score, scalePotential, riskLevel, status };
}

function toImpactCurrency(value: number) {
  const abs = Math.round(value);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(abs);
}

export function buildDecisionRecommendations(params: {
  campaigns: CampaignSnapshot[];
  clients: ClientAccount[];
  creatives: CreativeAsset[];
  benchmarks: NetworkBenchmark[];
}): DecisionRecommendation[] {
  const { campaigns, clients, creatives, benchmarks } = params;
  const decisions: DecisionRecommendation[] = [];

  for (const campaign of campaigns) {
    const client = clients.find((item) => item.id === campaign.clientId);
    if (!client) continue;
    const health = evaluateCampaignHealth(campaign, client);
    const economics = calculateCampaignEconomics(campaign, client);
    const creative = creatives.find((item) => item.id === campaign.currentCreativeId);

    if (economics.profitRoas >= 1.4 && campaign.frequency < 2.2 && campaign.ctr >= 1.6) {
      decisions.push({
        id: `dec-scale-${campaign.id}`,
        type: "scale",
        clientName: client.name,
        campaignName: campaign.name,
        title: "Escalar campanha vencedora",
        reason: `Profit ROAS ${round(economics.profitRoas)}x, frequência ${campaign.frequency} e CTR ${campaign.ctr}% indicam espaço de escala sem degradar margem.`,
        estimatedImpact: `${toImpactCurrency(economics.netProfit * 0.28)} de lucro incremental estimado em 24h.`,
        confidence: 92,
        priority: "Alta",
        execution: "Aumentar orçamento em 20% e manter monitoramento de frequência a cada 6 horas.",
      });
    }

    const ctrDropPct = campaign.lastCtr > 0 ? ((campaign.lastCtr - campaign.ctr) / campaign.lastCtr) * 100 : 0;
    if (campaign.frequency >= 3.5 && ctrDropPct >= 25) {
      const benchmark = benchmarks.find((item) => item.niche === client.niche && item.format === creative?.format && item.hookType === creative?.hookType);
      decisions.push({
        id: `dec-creative-${campaign.id}`,
        type: "creative",
        clientName: client.name,
        campaignName: campaign.name,
        title: "Trocar criativo saturado",
        reason: `A frequência subiu para ${campaign.frequency} e o CTR caiu ${round(ctrDropPct)}% versus a janela anterior.`,
        estimatedImpact: `Recuperar até ${benchmark ? `${round(((benchmark.ctrAvg - campaign.ctr) / Math.max(benchmark.ctrAvg, 0.1)) * -100)}% do gap` : "o CTR perdido"} com nova peça.`,
        confidence: 88,
        priority: "Crítica",
        execution: "Abrir Creative Factory com blueprint derivado do melhor hook da conta e pausar a peça atual após aprovação.",
      });
    }

    if (economics.profitRoas < 0.6 && campaign.conversions > 0) {
      decisions.push({
        id: `dec-profit-${campaign.id}`,
        type: "profit",
        clientName: client.name,
        campaignName: campaign.name,
        title: "Defender margem antes de escalar",
        reason: `ROAS ${campaign.roas}x parece aceitável, mas o Profit ROAS real está em ${round(economics.profitRoas)}x após custos, taxas e reembolsos.`,
        estimatedImpact: `Evitar perda de ${toImpactCurrency(Math.abs(economics.netProfit) * 0.4)} se a verba continuar no mesmo ritmo.`,
        confidence: 84,
        priority: "Alta",
        execution: "Reduzir orçamento em 15% e redirecionar verba para campanha com margem superior.",
      });
    }

    if (campaign.spendToday > 450 && campaign.revenueToday === 0) {
      decisions.push({
        id: `dec-risk-${campaign.id}`,
        type: "risk",
        clientName: client.name,
        campaignName: campaign.name,
        title: "Cortar campanha zumbi",
        reason: `A campanha já gastou ${toImpactCurrency(campaign.spendToday)} hoje sem gerar receita e o health score caiu para ${health.score}.`,
        estimatedImpact: `Preservar ${toImpactCurrency(campaign.spendToday * 0.65)} de caixa até a próxima janela de teste.`,
        confidence: 95,
        priority: "Crítica",
        execution: "Pausar campanha imediatamente e mover verba para o experimento com melhor taxa de conversão.",
      });
    }
  }

  return decisions.sort((a, b) => {
    const priorityWeight = { "Crítica": 3, "Alta": 2, "Média": 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority] || b.confidence - a.confidence;
  });
}
