// lib/engine/pulseEngine.ts
// Motor financeiro da Erizon — regra de negócio separada da UI.

export interface CampanhaRaw {
  id: string;
  nome_campanha: string;
  gasto_total: number | string | null;
  contatos: number | string | null;
  orcamento: number | string | null;
  ctr?: number | string | null;
  frequencia?: number | string | null;
  status: string;
  criado_at?: string;
  data_insercao?: string;
  data_inicio?: string;
  [key: string]: any;
}

export interface CampanhaProcessada extends CampanhaRaw {
  gastoBase: number;
  leadsBase: number;
  orcamentoBase: number;
  ctrBase: number;
  gastoSimulado: number;
  leadsSimulados: number;
  receitaEstimada: number;
  lucroLiquido: number;
  margem: number;
  roas: number;
  perdaMensalProjetada: number;
  budgetConsumo: number;
  diasAtivo: number;
  recomendacao: string;
  scoreCampanha: number;
  indiceRelevancia: number;
  pausadaLocalmente?: boolean;
  escaladaLocalmente?: boolean;
  acaoPendente?: boolean;
}

export interface EngineConfig {
  ticketMedio: number;
  taxaConversao: number;
  margemAlvo: number;
  roasMinimo?: number;
  diasMaturacao?: number;
}

// ─── Config do usuário vinda do banco (user_configs) ─────────────────────────
export interface UserEngineConfig {
  ticket_medio_cliente?: number | null;
  ticket_medio_global?: number | null;
  taxa_conversao?: number | null;
}

export interface EngineResult {
  campanhas: CampanhaProcessada[];
  totalGasto: number;
  totalReceita: number;
  totalLucro: number;
  totalLeads: number;
  margemGlobal: number;
  roasGlobal: number;
  score: number;
  capitalEmRisco: number;
  gastoCritico: number;
  percentualRisco: number;
  totalAtivos: number;
  melhorAtivo: CampanhaProcessada | null;
  pausadasCount: number;
  saudaveisCount: number;
  gastoSubOtimo: number;
}

export type Periodo = "hoje" | "7d" | "30d" | "custom";

export const DEFAULT_CONFIG: EngineConfig = {
  ticketMedio: 450,
  taxaConversao: 0.04,
  margemAlvo: 0.35,
  roasMinimo: 1.5,
  diasMaturacao: 3,
};

// ─── Resolve config real a partir dos dados do usuário ───────────────────────
// Prioridade: ticket_medio_cliente > ticket_medio_global > DEFAULT_CONFIG
export function resolverConfig(userConfig?: UserEngineConfig | null): EngineConfig {
  if (!userConfig) return DEFAULT_CONFIG;

  const ticketMedio =
    (userConfig.ticket_medio_cliente && userConfig.ticket_medio_cliente > 0)
      ? userConfig.ticket_medio_cliente
      : (userConfig.ticket_medio_global && userConfig.ticket_medio_global > 0)
      ? userConfig.ticket_medio_global
      : DEFAULT_CONFIG.ticketMedio;

  const taxaConversao =
    (userConfig.taxa_conversao && userConfig.taxa_conversao > 0)
      ? userConfig.taxa_conversao
      : DEFAULT_CONFIG.taxaConversao;

  return { ...DEFAULT_CONFIG, ticketMedio, taxaConversao };
}

// ─── Sanitização antifrágil ──────────────────────────────────────────────────
function safeNumber(value: unknown, allowNegative = false): number {
  const n = Number(value);
  if (!isFinite(n) || isNaN(n)) return 0;
  if (!allowNegative && n < 0) return 0;
  return n;
}

function calcularDiasAtivo(c: CampanhaRaw): number {
  const raw = c.data_inicio || c.criado_at || c.data_insercao;
  if (!raw) return 1;
  const ts = new Date(raw).getTime();
  if (isNaN(ts)) return 1;
  return Math.max(1, Math.ceil((Date.now() - ts) / (1000 * 60 * 60 * 24)));
}

// ─── Recomendação inteligente ─────────────────────────────────────────────────
function calcularRecomendacao(
  c: CampanhaRaw,
  margem: number,
  roas: number,
  budgetConsumo: number,
  diasAtivo: number,
  config: EngineConfig,
  estadoLocal?: "pausada" | "escalada"
): { recomendacao: string; scoreCampanha: number } {
  if (estadoLocal === "pausada")  return { recomendacao: "Pausada",   scoreCampanha: 0   };
  if (estadoLocal === "escalada") return { recomendacao: "Escalando", scoreCampanha: 100 };

  const diasMat = config.diasMaturacao ?? 3;
  const roasMin = config.roasMinimo    ?? 1.5;
  const ctr     = safeNumber(c.ctr);
  const freq    = safeNumber(c.frequencia);

  if (diasAtivo < diasMat)                   return { recomendacao: "Maturando",       scoreCampanha: 70  };
  if (margem < 0)                            return { recomendacao: "Pausar",          scoreCampanha: 35  };
  if (roas < roasMin)                        return { recomendacao: "ROAS crítico",    scoreCampanha: 45  };
  if (budgetConsumo > 90)                    return { recomendacao: "Budget crítico",  scoreCampanha: 55  };
  if (freq > 3.5)                            return { recomendacao: "Saturação",       scoreCampanha: 60  };
  if (ctr > 0 && ctr < 0.9)                 return { recomendacao: "Trocar Criativo", scoreCampanha: 70  };
  if (margem > 0.45 && roas > roasMin * 1.5) return { recomendacao: "Escalar",        scoreCampanha: 100 };
  return                                            { recomendacao: "Manter",          scoreCampanha: 80  };
}

// ─── Score global ─────────────────────────────────────────────────────────────
function calcularScoreGlobal(
  margemGlobal: number,
  roasGlobal: number,
  percentualRisco: number,
  config: EngineConfig
): number {
  let score = 100;
  const roasMin    = config.roasMinimo ?? 1.5;
  const margemAlvo = config.margemAlvo;
  score -= Math.min(35, percentualRisco * 0.9);
  if (margemGlobal < margemAlvo) score -= Math.min(30, (margemAlvo - margemGlobal) * 100);
  if (roasGlobal   < roasMin)    score -= Math.min(20, (roasMin - roasGlobal) * 10);
  return Math.max(0, Math.round(score));
}

function calcularIndiceRelevancia(margem: number, gastoSimulado: number): number {
  if (gastoSimulado <= 0) return 0;
  return margem * Math.log(Math.max(1, gastoSimulado));
}

// ─── Core engine ──────────────────────────────────────────────────────────────
export function processarCampanhas(
  dados: CampanhaRaw[],
  config: EngineConfig = DEFAULT_CONFIG,
  simuladorEscala: number = 1.0,
  estadosLocais: Record<string, "pausada" | "escalada"> = {},
  acoesPendentes: Record<string, boolean> = {}
): EngineResult {
  if (dados.length === 0) {
    return {
      campanhas: [], totalGasto: 0, totalReceita: 0, totalLucro: 0,
      totalLeads: 0, margemGlobal: 0, roasGlobal: 0, score: 0,
      capitalEmRisco: 0, gastoCritico: 0, percentualRisco: 0,
      totalAtivos: 0, melhorAtivo: null, pausadasCount: 0, saudaveisCount: 0,
      gastoSubOtimo: 0,
    };
  }

  const escala          = Math.max(0.1, safeNumber(simuladorEscala, false) || 1.0);
  const fatorEficiencia = Math.max(0.5, 1 - ((escala - 1) * 0.12));

  const campanhas: CampanhaProcessada[] = dados.map(c => {
    const gastoBase     = safeNumber(c.gasto_total);
    const leadsBase     = safeNumber(c.contatos);
    const orcamentoBase = safeNumber(c.orcamento);
    const ctrBase       = safeNumber(c.ctr);

    const gastoSimulado   = gastoBase * escala;
    const leadsSimulados  = leadsBase * escala * Math.max(0, fatorEficiencia);
    const receitaEstimada = leadsSimulados * config.taxaConversao * config.ticketMedio;
    const lucroLiquido    = receitaEstimada - gastoSimulado;

    const margem = receitaEstimada > 0 ? lucroLiquido / receitaEstimada : -1;
    const roas   = gastoSimulado   > 0 ? receitaEstimada / gastoSimulado : 0;

    const diasAtivo = calcularDiasAtivo(c);
    const perdaMensalProjetada =
      diasAtivo >= (config.diasMaturacao ?? 3) && margem < 0
        ? Math.abs((lucroLiquido / diasAtivo) * 30)
        : 0;
    const budgetConsumo = orcamentoBase > 0 ? (gastoSimulado / orcamentoBase) * 100 : 0;

    const { recomendacao, scoreCampanha } = calcularRecomendacao(
      c, margem, roas, budgetConsumo, diasAtivo, config, estadosLocais[c.id]
    );
    const indiceRelevancia = calcularIndiceRelevancia(margem, gastoSimulado);

    return {
      ...c,
      gastoBase, leadsBase, orcamentoBase, ctrBase,
      gastoSimulado, leadsSimulados, receitaEstimada, lucroLiquido,
      margem, roas, perdaMensalProjetada, budgetConsumo,
      diasAtivo, recomendacao, scoreCampanha, indiceRelevancia,
      pausadaLocalmente:  estadosLocais[c.id] === "pausada",
      escaladaLocalmente: estadosLocais[c.id] === "escalada",
      acaoPendente: !!acoesPendentes[c.id],
    };
  });

  const totalGasto      = campanhas.reduce((a, c) => a + c.gastoSimulado,   0);
  const totalReceita    = campanhas.reduce((a, c) => a + c.receitaEstimada, 0);
  const totalLucro      = totalReceita - totalGasto;
  const totalLeads      = campanhas.reduce((a, c) => a + c.leadsSimulados,  0);
  const margemGlobal    = totalReceita > 0 ? totalLucro / totalReceita  : 0;
  const roasGlobal      = totalGasto   > 0 ? totalReceita / totalGasto   : 0;
  const gastoCritico    = campanhas.filter(c => c.margem < 0 && estadosLocais[c.id] !== "pausada").reduce((a, c) => a + c.gastoSimulado, 0);
  const percentualRisco = totalGasto > 0 ? (gastoCritico / totalGasto) * 100 : 0;
  const capitalEmRisco  = campanhas.reduce((a, c) => a + c.perdaMensalProjetada, 0);
  const gastoSubOtimo   = campanhas.filter(c => c.margem > 0 && c.margem < config.margemAlvo).reduce((a, c) => a + c.gastoSimulado, 0);

  const saturadas            = campanhas.filter(c => safeNumber(c.frequencia) > 3.5).length;
  const penalizacaoSaturacao = Math.min(10, saturadas * 2);
  const score = Math.max(0, calcularScoreGlobal(margemGlobal, roasGlobal, percentualRisco, config) - penalizacaoSaturacao);

  const melhorAtivo = campanhas
    .filter(c => c.margem > 0 && c.roas >= (config.roasMinimo ?? 1.5) && estadosLocais[c.id] !== "pausada")
    .sort((a, b) => b.indiceRelevancia - a.indiceRelevancia)[0] || null;

  const pausadasCount  = campanhas.filter(c => c.scoreCampanha < 50 || estadosLocais[c.id] === "pausada").length;
  const saudaveisCount = campanhas.filter(c => c.scoreCampanha >= 75 && estadosLocais[c.id] !== "pausada").length;

  return {
    campanhas, totalGasto, totalReceita, totalLucro, totalLeads,
    margemGlobal, roasGlobal, score,
    capitalEmRisco, gastoCritico, percentualRisco,
    totalAtivos: campanhas.length, melhorAtivo,
    pausadasCount, saudaveisCount, gastoSubOtimo,
  };
}

// ─── Helpers reutilizáveis ────────────────────────────────────────────────────
export function formatBRL(value: number): string {
  const safe = isFinite(value) ? value : 0;
  return safe.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function calcularCPL(totalGasto: number, totalLeads: number): number {
  return totalLeads > 0 ? totalGasto / totalLeads : 0;
}

export function variacaoPct(anterior: number, atual: number): number {
  if (!isFinite(anterior) || anterior === 0) return 0;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export function filtrarAtivas(campanhas: CampanhaRaw[]): CampanhaRaw[] {
  const ativos = new Set(["ATIVO", "ACTIVE", "ATIVA"]);
  return campanhas.filter(c => ativos.has(String(c.status ?? "").toUpperCase().trim()));
}

export function rangeParaPeriodo(periodo: Periodo): { inicio: string; fim: string } {
  const hoje   = new Date();
  const fim    = hoje.toISOString().split("T")[0];
  const inicio = new Date(hoje);
  if (periodo === "7d")  inicio.setDate(hoje.getDate() - 6);
  if (periodo === "30d") inicio.setDate(hoje.getDate() - 29);
  return { inicio: inicio.toISOString().split("T")[0], fim };
}

export function calcularImpactoAcumulado(historico: { impacto: string }[]): number {
  return historico.reduce((total, d) => {
    const match = d.impacto.replace(/\./g, "").replace(",", ".").match(/[\d.]+/);
    return total + (match ? parseFloat(match[0]) : 0);
  }, 0);
}