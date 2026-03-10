import type { IntegrationEnvStatus } from "@/config/env";


export type Channel = "Meta Ads" | "Google Ads";
export type CampaignObjective = "Compra" | "Lead" | "Tráfego" | "Remarketing";

export type ClientAccount = {
  id: string;
  name: string;
  niche: string;
  vertical: string;
  platform: "Shopify" | "Hotmart" | "CRM";
  currency: "BRL";
  averageTicket: number;
  productCostRate: number;
  refundRate: number;
  paymentFeeRate: number;
  logisticsRate: number;
  monthlyTargetProfit: number;
};

export type CampaignSnapshot = {
  id: string;
  clientId: string;
  name: string;
  objective: CampaignObjective;
  channel: Channel;
  audience: string;
  activeDays: number;
  dailyBudget: number;
  spendToday: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenueToday: number;
  frequency: number;
  cpm: number;
  cpc: number;
  ctr: number;
  cpa: number;
  roas: number;
  lastRoas: number;
  lastCtr: number;
  lastCpa: number;
  currentCreativeId: string;
  approvedByAutopilot: boolean;
};

export type CreativeAsset = {
  id: string;
  clientId: string;
  campaignId: string;
  name: string;
  format: "UGC" | "Estático" | "Storytelling" | "Demo";
  hookType: "Pergunta" | "Prova social" | "Oferta" | "Autoridade";
  durationSeconds: number;
  captionStyle: "Legenda grande" | "Legenda curta" | "Sem legenda";
  visualStyle: "Selfie" | "Produto" | "Antes e depois" | "Estúdio";
  ctr: number;
  cpa: number;
  roas: number;
  frequency: number;
  spend: number;
  conversions: number;
};

export type NetworkBenchmark = {
  id: string;
  niche: string;
  segment: string;
  hookType: CreativeAsset["hookType"];
  format: CreativeAsset["format"];
  durationBand: "0-8s" | "9-12s" | "13-20s" | "20s+";
  ctrAvg: number;
  cpaAvg: number;
  roasAvg: number;
  profitRoasAvg: number;
  sampleSize: number;
};

export type AutopilotRule = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiresApproval: boolean;
  condition: {
    minProfitRoas?: number;
    minRoas?: number;
    maxFrequency?: number;
    minCtr?: number;
    maxSpendWithoutConversion?: number;
    maxCtrDropPct?: number;
    maxProfitRoas?: number;
  };
  action:
    | { type: "increase_budget"; percentage: number }
    | { type: "pause_campaign" }
    | { type: "request_creative_refresh" }
    | { type: "decrease_budget"; percentage: number };
};

export type TimelineEvent = {
  id: string;
  timestamp: string;
  actor: "Autopilot" | "Risk Radar" | "Profit Brain" | "Creative Factory" | "Gestor";
  action: string;
  detail: string;
  relatedCampaignId?: string;
};

export type OperationSnapshot = {
  generatedAt: string;
  clients: ClientAccount[];
  campaigns: CampaignSnapshot[];
  creatives: CreativeAsset[];
  benchmarks: NetworkBenchmark[];
  rules: AutopilotRule[];
  timeline: TimelineEvent[];
};

export type CampaignEconomics = {
  adSpend: number;
  productCost: number;
  paymentFees: number;
  logistics: number;
  refunds: number;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  marginPct: number;
  profitRoas: number;
};

export type CampaignHealth = {
  score: number;
  scalePotential: number;
  riskLevel: "baixo" | "medio" | "alto" | "critico";
  status: "Escalando" | "Estável" | "Em risco" | "Zumbi";
};

export type DecisionRecommendation = {
  id: string;
  type: "scale" | "pause" | "creative" | "profit" | "risk";
  clientName: string;
  campaignName: string;
  title: string;
  reason: string;
  estimatedImpact: string;
  confidence: number;
  priority: "Crítica" | "Alta" | "Média";
  execution: string;
};

export type RiskFlag = {
  id: string;
  clientName: string;
  campaignName: string;
  severity: "Crítico" | "Alto" | "Médio";
  diagnosis: string;
  cause: string;
  action: string;
};

export type CreativeInsight = {
  id: string;
  name: string;
  format: string;
  hook: string;
  benchmarkCtr: number;
  benchmarkCpa: number;
  liftCtr: number;
  status: "Vencedor" | "Saturando" | "Teste";
};

export type NetworkInsight = {
  id: string;
  niche: string;
  cut: string;
  insight: string;
  gain: string;
};

export type PortalSummary = {
  clientName: string;
  investimentoMes: number;
  receitaMes: number;
  lucroMes: number;
  profitRoas: number;
  mensagem: string;
};

export type AutomationPreview = {
  id: string;
  nome: string;
  condicao: string;
  acao: string;
  status: "Ativa" | "Revisão";
  ultimaExecucao: string;
};

export type OperatingSystemView = {
  stats: {
    receitaHoje: number;
    investimentoHoje: number;
    lucroHoje: number;
    profitRoasMedio: number;
    decisoesCriticas: number;
  };
  campaigns: Array<{
    id: string;
    nome: string;
    cliente: string;
    objetivo: CampaignObjective;
    plataforma: Channel;
    investimentoHoje: number;
    receitaHoje: number;
    lucroHoje: number;
    roas: number;
    profitRoas: number;
    ctr: number;
    cpa: number;
    cpm: number;
    frequencia: number;
    conversoes: number;
    status: CampaignHealth["status"];
    publico: string;
    criativoAtual: string;
  }>;
  decisions: Array<{
    id: string;
    tipo: DecisionRecommendation["type"];
    cliente: string;
    campanha: string;
    titulo: string;
    motivo: string;
    impacto: string;
    confianca: number;
    prioridade: DecisionRecommendation["priority"];
    executar: string;
  }>;
  riskFlags: Array<{
    id: string;
    cliente: string;
    campanha: string;
    severidade: RiskFlag["severity"];
    diagnostico: string;
    causa: string;
    acao: string;
  }>;
  creativePatterns: Array<{
    id: string;
    nome: string;
    formato: string;
    hook: string;
    benchmarkCtr: number;
    benchmarkCpa: number;
    liftCtr: number;
    status: CreativeInsight["status"];
  }>;
  networkInsights: Array<{
    id: string;
    nicho: string;
    recorte: string;
    insight: string;
    ganho: string;
  }>;
  automationRules: Array<{
    id: string;
    nome: string;
    condicao: string;
    acao: string;
    status: AutomationPreview["status"];
    ultimaExecucao: string;
  }>;
  timeline: Array<{
    id: string;
    hora: string;
    ator: TimelineEvent["actor"];
    acao: string;
    detalhe: string;
  }>;
  portalSummary: {
    cliente: string;
    investimentoMes: number;
    receitaMes: number;
    lucroMes: number;
    profitRoas: number;
    mensagem: string;
  };
};

export function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}


export type WorkspaceIntegration = {
  id: string;
  workspaceId: string;
  kind: "meta_ads" | "ga4" | "shopify" | "hotmart" | "crm";
  status: "connected" | "expired" | "pending";
  externalAccountId: string;
  accessTokenMasked: string;
  refreshTokenMasked?: string;
  lastSyncedAt?: string;
};

export type IngestionSource = "meta_ads" | "ga4" | "shopify" | "hotmart" | "crm";

export type ExternalCampaignRecord = {
  campaignId: string;
  accountId: string;
  clientId: string;
  name: string;
  objective: CampaignObjective;
  channel: Channel;
  audience: string;
  activeDays: number;
  dailyBudget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  frequency: number;
  cpm: number;
  cpc: number;
  ctr: number;
  cpa: number;
  roas: number;
  previousRoas: number;
  previousCtr: number;
  previousCpa: number;
  creativeId: string;
  date: string;
};

export type ExternalOrderRecord = {
  orderId: string;
  clientId: string;
  platform: "Shopify" | "Hotmart" | "CRM";
  date: string;
  grossRevenue: number;
  refunds: number;
  fees: number;
  logistics: number;
  productCost: number;
};

export type NormalizedCampaignSnapshot = CampaignSnapshot & {
  source: IngestionSource;
  snapshotDate: string;
  externalAccountId: string;
};

export type ProfitSnapshot = {
  id: string;
  clientId: string;
  campaignId: string;
  snapshotDate: string;
  revenue: number;
  adSpend: number;
  productCost: number;
  paymentFees: number;
  logistics: number;
  refunds: number;
  netProfit: number;
  marginPct: number;
  profitRoas: number;
};

export type IntegrationCredential = {
  workspaceId: string;
  provider: "meta_ads" | "ga4" | "shopify" | "hotmart" | "crm";
  externalAccountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  metadata?: Record<string, string>;
};

export type AutopilotGuardrail = {
  id: string;
  workspaceId: string;
  name: string;
  dailyBudgetIncreaseLimitPct: number;
  pauseRequiresApproval: boolean;
  simulationOnly: boolean;
  allowedActions: Array<"increase_budget" | "decrease_budget" | "pause_campaign" | "request_creative_refresh">;
};

export type AutopilotExecutionLog = {
  id: string;
  workspaceId: string;
  campaignId: string;
  action: string;
  mode: "simulation" | "approval_required" | "executed" | "blocked";
  reason: string;
  createdAt: string;
};

export type DecisionCalibration = {
  minCtr: number;
  minRoas: number;
  maxFrequency: number;
  minProfitRoas: number;
  maxSpendWithoutConversion: number;
};

export type DecisionValidationResult = {
  campaignId: string;
  status: "validado" | "recalibrar" | "bloqueado";
  confidence: number;
  notes: string[];
};


export type IntegrationReadiness = {
  env: IntegrationEnvStatus;
  connectedProviders: WorkspaceIntegration[];
  missingProviders: Array<"meta_ads" | "ga4" | "shopify" | "hotmart" | "crm">;
};

export type DataSourceKind = "mock" | "supabase";