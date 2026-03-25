import type { CampaignObjective, ObjectiveBenchmarks } from "@/types/erizon-v7";
import type { CampaignSnapshot, ClientAccount, RiskFlag } from "@/types/erizon";

export type RiskEvent = {
  riskType: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
};

export type RiskInput = {
  objective: CampaignObjective;
  benchmarks: ObjectiveBenchmarks;
  ctr: number;
  cpl: number;
  cpa: number;
  cpm: number;
  cpc: number;
  roas: number;
  frequency: number;
  spend: number;
};

export function buildRiskEvents(input: RiskInput): RiskEvent[] {
  switch (input.objective) {
    case "LEADS":
      return buildLeadsRisks(input);
    case "SALES":
      return buildSalesRisks(input);
    case "TRAFFIC":
      return buildTrafficRisks(input);
    case "AWARENESS":
      return buildAwarenessRisks(input);
    case "ENGAGEMENT":
      return buildEngagementRisks(input);
    case "APP_PROMOTION":
      return buildAppRisks(input);
    case "UNKNOWN":
    default:
      return buildLeadsRisks(input);
  }
}

function buildLeadsRisks({ ctr, cpl, benchmarks }: RiskInput): RiskEvent[] {
  const risks: RiskEvent[] = [];
  if (benchmarks.benchmarkCpl && cpl > benchmarks.benchmarkCpl * 1.25) {
    risks.push({ riskType: "cpl_pressure", severity: "high", title: "CPL acima do benchmark", description: `CPL atual (${fmt(cpl)}) acima do benchmark (${fmt(benchmarks.benchmarkCpl)}).` });
  }
  if (benchmarks.benchmarkCtr && ctr < benchmarks.benchmarkCtr * 0.7) {
    risks.push({ riskType: "ctr_drop", severity: "high", title: "CTR baixo para campanha de leads", description: `CTR (${ctr.toFixed(2)}%) está abaixo do esperado.` });
  }
  return risks;
}
function buildSalesRisks({ cpa, roas, ctr, spend, benchmarks }: RiskInput): RiskEvent[] {
  const risks: RiskEvent[] = [];
  if (benchmarks.benchmarkCpa && cpa > benchmarks.benchmarkCpa * 1.3) risks.push({ riskType: "cpa_pressure", severity: "high", title: "CPA acima do benchmark", description: `CPA (${fmt(cpa)}) acima do benchmark.` });
  if (benchmarks.benchmarkRoas && roas < benchmarks.benchmarkRoas * 0.7) risks.push({ riskType: "roas_drop", severity: "high", title: "ROAS abaixo do mínimo aceitável", description: `ROAS atual (${roas.toFixed(2)}x) abaixo do benchmark.` });
  if (benchmarks.benchmarkCtr && ctr < benchmarks.benchmarkCtr * 0.7 && spend > 0) risks.push({ riskType: "ctr_drop", severity: "medium", title: "CTR baixo para campanha de vendas", description: `CTR (${ctr.toFixed(2)}%) abaixo do esperado.` });
  return risks;
}
function buildTrafficRisks({ ctr, cpc, benchmarks }: RiskInput): RiskEvent[] {
  const risks: RiskEvent[] = [];
  if (benchmarks.benchmarkCtr && ctr < benchmarks.benchmarkCtr * 0.65) risks.push({ riskType: "ctr_drop", severity: "high", title: "CTR crítico para campanha de tráfego", description: `CTR (${ctr.toFixed(2)}%) abaixo do benchmark.` });
  if (benchmarks.benchmarkCpc && cpc > benchmarks.benchmarkCpc * 1.5) risks.push({ riskType: "cpc_pressure", severity: "medium", title: "CPC elevado", description: `CPC (${fmt(cpc)}) acima do benchmark.` });
  return risks;
}
function buildAwarenessRisks({ cpm, frequency, benchmarks }: RiskInput): RiskEvent[] {
  const risks: RiskEvent[] = [];
  if (benchmarks.benchmarkCpm && cpm > benchmarks.benchmarkCpm * 1.4) risks.push({ riskType: "cpm_pressure", severity: "medium", title: "CPM elevado para campaign de awareness", description: `CPM (${fmt(cpm)}) acima do benchmark.` });
  if (benchmarks.benchmarkFrequency && frequency > benchmarks.benchmarkFrequency) risks.push({ riskType: "frequency_saturation", severity: frequency > benchmarks.benchmarkFrequency * 1.5 ? "high" : "medium", title: "Frequência de exibição excessiva", description: `Frequência (${frequency.toFixed(2)}x) acima do limite.` });
  return risks;
}
function buildEngagementRisks({ ctr, cpm, benchmarks }: RiskInput): RiskEvent[] {
  const risks: RiskEvent[] = [];
  if (benchmarks.benchmarkCtr && ctr < benchmarks.benchmarkCtr * 0.6) risks.push({ riskType: "engagement_drop", severity: "high", title: "Taxa de engajamento muito abaixo do esperado", description: `Engajamento (${ctr.toFixed(2)}%) abaixo do benchmark.` });
  if (benchmarks.benchmarkCpm && cpm > benchmarks.benchmarkCpm * 1.5) risks.push({ riskType: "cpm_pressure", severity: "medium", title: "CPM elevado para campanha de engajamento", description: `CPM (${fmt(cpm)}) acima do esperado.` });
  return risks;
}
function buildAppRisks({ cpa, ctr, benchmarks }: RiskInput): RiskEvent[] {
  const risks: RiskEvent[] = [];
  if (benchmarks.benchmarkCpa && cpa > benchmarks.benchmarkCpa * 1.3) risks.push({ riskType: "cpa_pressure", severity: "high", title: "Custo por instalação acima do benchmark", description: `CPA (${fmt(cpa)}) acima do benchmark.` });
  if (benchmarks.benchmarkCtr && ctr < benchmarks.benchmarkCtr * 0.7) risks.push({ riskType: "ctr_drop", severity: "medium", title: "CTR baixo para campanha de app", description: `CTR (${ctr.toFixed(2)}%) abaixo do esperado.` });
  return risks;
}

export function buildRiskFlags(campaigns: CampaignSnapshot[], clients: ClientAccount[]): RiskFlag[] {
  const flags: RiskFlag[] = [];
  for (const campaign of campaigns) {
    const client = clients.find((c) => c.id === campaign.clientId);
    if (!client) continue;

    const ctrDropPct = campaign.lastCtr > 0 ? ((campaign.lastCtr - campaign.ctr) / campaign.lastCtr) * 100 : 0;
    const cpaGrowthPct = campaign.lastCpa > 0 ? ((campaign.cpa - campaign.lastCpa) / campaign.lastCpa) * 100 : 0;

    if (campaign.frequency >= 3.5 && ctrDropPct >= 20) {
      flags.push({
        id: `risk-saturation-${campaign.id}`,
        clientName: client.name,
        campaignName: campaign.name,
        severity: "Crítico",
        diagnosis: "Saturação criativa detectada",
        cause: `Frequência ${campaign.frequency.toFixed(1)}x com queda de CTR de ${ctrDropPct.toFixed(0)}%.`,
        action: "Trocar criativo e considerar ampliar audiência.",
      });
    }

    if (campaign.spendToday > 450 && campaign.revenueToday <= 0 && campaign.conversions <= 0) {
      flags.push({
        id: `risk-zombie-${campaign.id}`,
        clientName: client.name,
        campaignName: campaign.name,
        severity: "Crítico",
        diagnosis: "Campanha zumbi",
        cause: `Gastou ${fmt(campaign.spendToday)} sem gerar receita nem conversões.`,
        action: "Pausar campanha e revisar oferta, segmentação e criativo.",
      });
    }

    if (campaign.cpa > 0 && campaign.lastCpa > 0 && cpaGrowthPct >= 80 && campaign.roas < 2) {
      flags.push({
        id: `risk-cpa-${campaign.id}`,
        clientName: client.name,
        campaignName: campaign.name,
        severity: "Médio",
        diagnosis: "Elevação acelerada de CPA",
        cause: `CPA subiu ${cpaGrowthPct.toFixed(0)}% vs. janela anterior.`,
        action: "Reduzir verba, revisar público e analisar funil da campanha.",
      });
    }
  }
  return flags;
}

function fmt(value: number): string { return `R$ ${value.toFixed(2)}`; }
