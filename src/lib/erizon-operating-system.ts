import { OperatingSystemService } from "@/services/operating-system-service";
import { formatMoney as formatCurrency } from "@/types/erizon";
import type { OperatingSystemView } from "@/types/erizon";

// Fallback para banco zerado ou falha de conexão
const EMPTY_VIEW: OperatingSystemView = {
  stats: {
    receitaHoje: 0,
    investimentoHoje: 0,
    lucroHoje: 0,
    profitRoasMedio: 0,
    decisoesCriticas: 0,
  },
  campaigns:       [],
  decisions:       [],
  riskFlags:       [],
  creativePatterns:[],
  networkInsights: [],
  automationRules: [],
  timeline:        [],
  portalSummary: {
    cliente: "—",
    investimentoMes: 0,
    receitaMes: 0,
    lucroMes: 0,
    profitRoas: 0,
    mensagem: "Nenhum dado disponível ainda. Conecte sua conta Meta Ads em Configurações.",
  },
};

async function loadView(): Promise<OperatingSystemView> {
  try {
    const service = new OperatingSystemService();
    return await service.getOperatingSystemView();
  } catch (err) {
    console.warn("[Erizon OS] Usando dados vazios — banco não configurado ou erro de conexão:", err);
    return EMPTY_VIEW;
  }
}

const view = await loadView();

export const stats            = view.stats;
export const campaigns        = view.campaigns;
export const decisions        = view.decisions;
export const riskFlags        = view.riskFlags;
export const creativePatterns = view.creativePatterns;
export const networkInsights  = view.networkInsights;
export const automationRules  = view.automationRules;
export const timeline         = view.timeline;
export const portalSummary    = view.portalSummary;

export type DecisionType    = typeof decisions[number]["tipo"];
export type Campaign        = typeof campaigns[number];
export type Decision        = typeof decisions[number];
export type RiskFlag        = typeof riskFlags[number];
export type CreativePattern = typeof creativePatterns[number];
export type TimelineEvent   = typeof timeline[number];
export type AutomationRule  = typeof automationRules[number];
export type NetworkInsight  = typeof networkInsights[number];
export type PortalSummary   = typeof portalSummary;

export const formatMoney = formatCurrency;

export function getHealthScore(campaign: Campaign) {
  const roasScore    = Math.min(campaign.roas * 18, 35);
  const ctrScore     = Math.min(campaign.ctr * 12, 25);
  const profitScore  = Math.max(Math.min(campaign.profitRoas * 20, 25), 0);
  const riskPenalty  = campaign.frequencia > 3.5 ? 15 : campaign.frequencia > 2.5 ? 8 : 0;
  const zombiePenalty= campaign.status === "Zumbi" ? 25 : 0;
  return Math.max(Math.round(roasScore + ctrScore + profitScore - riskPenalty - zombiePenalty), 0);
}
