
import {
  AutopilotExecutionLog,
  AutopilotRule,
  ClientAccount,
  CreativeAsset,
  IntegrationCredential,
  NetworkBenchmark,
  OperationSnapshot,
  CampaignSnapshot,
  ProfitSnapshot,
  TimelineEvent,
  WorkspaceIntegration,
} from "@/types/erizon";

const clients: ClientAccount[] = [
  {
    id: "cli-vitaglow",
    name: "Loja VitaGlow",
    niche: "Beauty",
    vertical: "E-commerce skincare",
    platform: "Shopify",
    currency: "BRL",
    averageTicket: 189,
    productCostRate: 0.26,
    refundRate: 0.04,
    paymentFeeRate: 0.045,
    logisticsRate: 0.08,
    monthlyTargetProfit: 120000,
  },
  {
    id: "cli-dermapro",
    name: "Clinic DermaPro",
    niche: "Serviços locais",
    vertical: "Clínica estética",
    platform: "CRM",
    currency: "BRL",
    averageTicket: 420,
    productCostRate: 0.12,
    refundRate: 0.01,
    paymentFeeRate: 0.028,
    logisticsRate: 0,
    monthlyTargetProfit: 70000,
  },
  {
    id: "cli-neurohost",
    name: "NeuroHost",
    niche: "Infoproduto",
    vertical: "SaaS e educação",
    platform: "Hotmart",
    currency: "BRL",
    averageTicket: 297,
    productCostRate: 0.08,
    refundRate: 0.08,
    paymentFeeRate: 0.099,
    logisticsRate: 0,
    monthlyTargetProfit: 90000,
  },
];

const campaigns: CampaignSnapshot[] = [
  {
    id: "cmp-1",
    clientId: "cli-vitaglow",
    name: "Produto X | Conversão | UGC 01",
    objective: "Compra",
    channel: "Meta Ads",
    audience: "Broad feminino 25-44",
    activeDays: 12,
    dailyBudget: 1800,
    spendToday: 1280,
    impressions: 70210,
    clicks: 1994,
    conversions: 31,
    revenueToday: 5980,
    frequency: 1.9,
    cpm: 18.2,
    cpc: 0.64,
    ctr: 2.84,
    cpa: 41.29,
    roas: 4.67,
    lastRoas: 4.1,
    lastCtr: 2.52,
    lastCpa: 46.1,
    currentCreativeId: "crt-1",
    approvedByAutopilot: true,
  },
  {
    id: "cmp-2",
    clientId: "cli-vitaglow",
    name: "Produto X | Remarketing | Oferta",
    objective: "Compra",
    channel: "Meta Ads",
    audience: "Remarketing 30 dias",
    activeDays: 27,
    dailyBudget: 900,
    spendToday: 740,
    impressions: 34210,
    clicks: 482,
    conversions: 12,
    revenueToday: 1840,
    frequency: 4.2,
    cpm: 21.6,
    cpc: 1.53,
    ctr: 1.41,
    cpa: 61.67,
    roas: 2.49,
    lastRoas: 3.02,
    lastCtr: 1.92,
    lastCpa: 51.2,
    currentCreativeId: "crt-2",
    approvedByAutopilot: false,
  },
  {
    id: "cmp-3",
    clientId: "cli-dermapro",
    name: "Lead Magnet | Quiz de Pele",
    objective: "Lead",
    channel: "Meta Ads",
    audience: "Lookalike 1% procedimento facial",
    activeDays: 9,
    dailyBudget: 650,
    spendToday: 520,
    impressions: 20980,
    clicks: 193,
    conversions: 6,
    revenueToday: 0,
    frequency: 3.7,
    cpm: 24.8,
    cpc: 2.69,
    ctr: 0.92,
    cpa: 86.67,
    roas: 0,
    lastRoas: 0,
    lastCtr: 1.24,
    lastCpa: 61.1,
    currentCreativeId: "crt-3",
    approvedByAutopilot: false,
  },
  {
    id: "cmp-4",
    clientId: "cli-neurohost",
    name: "Brand Search | Funil quente",
    objective: "Compra",
    channel: "Google Ads",
    audience: "Search branded + remarketing",
    activeDays: 45,
    dailyBudget: 500,
    spendToday: 340,
    impressions: 8240,
    clicks: 580,
    conversions: 18,
    revenueToday: 3110,
    frequency: 1.2,
    cpm: 41.2,
    cpc: 0.59,
    ctr: 7.04,
    cpa: 18.89,
    roas: 9.15,
    lastRoas: 8.3,
    lastCtr: 6.55,
    lastCpa: 21.3,
    currentCreativeId: "crt-4",
    approvedByAutopilot: true,
  },
];

const creatives: CreativeAsset[] = [
  {
    id: "crt-1",
    clientId: "cli-vitaglow",
    campaignId: "cmp-1",
    name: "UGC selfie pergunta direta",
    format: "UGC",
    hookType: "Pergunta",
    durationSeconds: 11,
    captionStyle: "Legenda grande",
    visualStyle: "Selfie",
    ctr: 2.84,
    cpa: 41.29,
    roas: 4.67,
    frequency: 1.9,
    spend: 1280,
    conversions: 31,
  },
  {
    id: "crt-2",
    clientId: "cli-vitaglow",
    campaignId: "cmp-2",
    name: "Oferta remarketing carrossel",
    format: "Estático",
    hookType: "Oferta",
    durationSeconds: 6,
    captionStyle: "Legenda curta",
    visualStyle: "Produto",
    ctr: 1.41,
    cpa: 61.67,
    roas: 2.49,
    frequency: 4.2,
    spend: 740,
    conversions: 12,
  },
  {
    id: "crt-3",
    clientId: "cli-dermapro",
    campaignId: "cmp-3",
    name: "Quiz procedimento facial",
    format: "Storytelling",
    hookType: "Autoridade",
    durationSeconds: 18,
    captionStyle: "Legenda grande",
    visualStyle: "Estúdio",
    ctr: 0.92,
    cpa: 86.67,
    roas: 0,
    frequency: 3.7,
    spend: 520,
    conversions: 6,
  },
  {
    id: "crt-4",
    clientId: "cli-neurohost",
    campaignId: "cmp-4",
    name: "Search branded depoimento",
    format: "Demo",
    hookType: "Prova social",
    durationSeconds: 9,
    captionStyle: "Sem legenda",
    visualStyle: "Produto",
    ctr: 7.04,
    cpa: 18.89,
    roas: 9.15,
    frequency: 1.2,
    spend: 340,
    conversions: 18,
  },
];

const benchmarks: NetworkBenchmark[] = [
  {
    id: "bn-1",
    niche: "Beauty",
    segment: "E-commerce skincare",
    hookType: "Pergunta",
    format: "UGC",
    durationBand: "9-12s",
    ctrAvg: 2.35,
    cpaAvg: 47,
    roasAvg: 3.2,
    profitRoasAvg: 1.18,
    sampleSize: 1820,
  },
  {
    id: "bn-2",
    niche: "Serviços locais",
    segment: "Clínica estética",
    hookType: "Autoridade",
    format: "Storytelling",
    durationBand: "13-20s",
    ctrAvg: 1.08,
    cpaAvg: 68,
    roasAvg: 1.7,
    profitRoasAvg: 0.42,
    sampleSize: 860,
  },
  {
    id: "bn-3",
    niche: "Infoproduto",
    segment: "SaaS e educação",
    hookType: "Prova social",
    format: "Demo",
    durationBand: "9-12s",
    ctrAvg: 4.6,
    cpaAvg: 24,
    roasAvg: 6.8,
    profitRoasAvg: 3.4,
    sampleSize: 1440,
  },
];

const rules: AutopilotRule[] = [
  {
    id: "rule-1",
    name: "Escala com lucro saudável",
    description: "Escala campanhas quando existe margem real e espaço de frequência.",
    enabled: true,
    requiresApproval: false,
    condition: { minProfitRoas: 1.3, minRoas: 3, maxFrequency: 2.2, minCtr: 1.8 },
    action: { type: "increase_budget", percentage: 20 },
  },
  {
    id: "rule-2",
    name: "Pausa gasto sem venda",
    description: "Pausa campanhas que queimam orçamento sem conversão.",
    enabled: true,
    requiresApproval: true,
    condition: { maxSpendWithoutConversion: 450 },
    action: { type: "pause_campaign" },
  },
  {
    id: "rule-3",
    name: "Refresh criativo por saturação",
    description: "Abre refresh de criativo quando frequência sobe e CTR despenca.",
    enabled: true,
    requiresApproval: true,
    condition: { maxFrequency: 3.5, maxCtrDropPct: 25 },
    action: { type: "request_creative_refresh" },
  },
  {
    id: "rule-4",
    name: "Redução por lucro fraco",
    description: "Segura orçamento quando o lucro real já ficou abaixo do saudável.",
    enabled: true,
    requiresApproval: true,
    condition: { maxProfitRoas: 0.6 },
    action: { type: "decrease_budget", percentage: 15 },
  },
];

const timeline: TimelineEvent[] = [
  {
    id: "tm-1",
    timestamp: "2026-03-10T09:12:00-03:00",
    actor: "Autopilot",
    action: "Escalou campanha",
    detail: "Produto X | Conversão | UGC 01 recebeu +20% de orçamento após Profit ROAS 1.71.",
    relatedCampaignId: "cmp-1",
  },
  {
    id: "tm-2",
    timestamp: "2026-03-10T10:34:00-03:00",
    actor: "Risk Radar",
    action: "Abriu alerta crítico",
    detail: "Remarketing de VitaGlow entrou em saturação por frequência 4.2 e queda de CTR.",
    relatedCampaignId: "cmp-2",
  },
  {
    id: "tm-3",
    timestamp: "2026-03-10T11:18:00-03:00",
    actor: "Gestor",
    action: "Aprovou novo criativo",
    detail: "Blueprint UGC com pergunta direta enviado para produção de vídeo.",
    relatedCampaignId: "cmp-2",
  },
  {
    id: "tm-4",
    timestamp: "2026-03-10T13:05:00-03:00",
    actor: "Profit Brain",
    action: "Atualizou ranking de lucro",
    detail: "Brand Search assumiu o topo do lucro líquido do dia com margem 69.6%.",
    relatedCampaignId: "cmp-4",
  },
];

export class MockOperatingRepository {
  async getSnapshot(): Promise<OperationSnapshot> {
    return {
      generatedAt: "2026-03-10T16:00:00-03:00",
      clients,
      campaigns,
      creatives,
      benchmarks,
      rules,
      timeline,
    };
  }

  async getIntegrations(workspaceId: string): Promise<WorkspaceIntegration[]> {
    return [
      {
        id: "int-meta",
        workspaceId,
        kind: "meta_ads",
        status: "connected",
        externalAccountId: "act_123456",
        accessTokenMasked: "••••1234",
        lastSyncedAt: new Date().toISOString(),
      },
      {
        id: "int-ga4",
        workspaceId,
        kind: "ga4",
        status: "connected",
        externalAccountId: "ga4_987654",
        accessTokenMasked: "••••9876",
        lastSyncedAt: new Date().toISOString(),
      },
    ];
  }

  async getCredentials(workspaceId: string): Promise<IntegrationCredential[]> {
    return [
      { workspaceId, provider: "meta_ads", externalAccountId: "act_123456", accessToken: "mock-meta-token" },
      { workspaceId, provider: "ga4", externalAccountId: "ga4_987654", accessToken: "mock-ga4-token" },
      { workspaceId, provider: "shopify", externalAccountId: "shop_vitaglow", accessToken: "mock-shopify-token" },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async upsertCampaignSnapshots(_rows: CampaignSnapshot[]): Promise<void> {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async upsertProfitSnapshots(_rows: ProfitSnapshot[]): Promise<void> {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async saveAutopilotLog(_entry: AutopilotExecutionLog): Promise<void> {
    return;
  }

  async getPreviousSnapshots(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _campaignIds: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _beforeDate: string
  ): Promise<Array<{ id: string; roas: number; ctr: number; cpa: number }>> {
    // Mock retorna valores anteriores fixos para os snapshots padrão
    return [
      { id: "cmp-1", roas: 4.1, ctr: 2.52, cpa: 46.1 },
      { id: "cmp-2", roas: 3.02, ctr: 1.92, cpa: 51.2 },
      { id: "cmp-3", roas: 2.8, ctr: 1.5, cpa: 60.0 },
      { id: "cmp-4", roas: 3.6, ctr: 2.1, cpa: 55.0 },
    ];
  }
}
