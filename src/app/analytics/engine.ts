// src/app/dados/engine.ts — v3.0
// ─────────────────────────────────────────────────────────────────────────────
// CHANGELOG v3.0:
//   - Integração completa com tipoCampanha.ts
//   - calcMetricas() agora delega para calcMetricasPorTipo() quando tipo disponível
//   - calcScore() adaptado por tipo de campanha
//   - gerarAlertas() com alertas específicos por tipo
//   - 100% retrocompatível: todos os componentes existentes continuam funcionando
// ─────────────────────────────────────────────────────────────────────────────

import type { Campanha, Metricas, ScoreBadge, Alerta, CTA, Periodo } from "./types";
import {
  type TipoCampanha,
  type InputMetricasTipo,
  calcMetricasPorTipo,
  resolverTipo,
  badgeTipo,
  ctaDoTipo,
  BENCHMARKS_POR_TIPO,
} from "./tipoCampanha";

// Re-exporta TipoCampanha para componentes que precisarem
export type { TipoCampanha };

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — Decision Intelligence (mantidos da v2)
// ─────────────────────────────────────────────────────────────────────────────

export interface CampanhaBase {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  receita_estimada?: number;
  orcamento?: number;
  dias_ativo?: number;
  impressoes?: number;
  cliques?: number;
  score?: number;
  roas?: number;
  // v3: campos novos do banco
  tipo_campanha?: string | null;
  visualizacoes?: number;
  instalacoes?: number;
  engajamentos?: number;
  mensagens_iniciadas?: number;
}

export interface SnapshotCampanha {
  campanha_id: string;
  data: string;
  gasto: number;
  leads: number;
  receita?: number;
  roas?: number;
  cpl?: number;
}

export interface FatorRisco {
  nome: string;
  peso: number;
  valor: string;
  proporcional: boolean;
}

export interface RiscoProgressivoResult {
  scoreAjustado: number;
  pesoTotal: number;
  fatores: FatorRisco[];
  justificativa: string;
  confianca: number;
}

export interface TendenciaConta {
  roasDelta: number;
  roasDeltaPct: number;
  cplDelta: number;
  cplDeltaPct: number;
  scoreDelta: number;
  lucroDelta: number;
  lucroDeltaPct: number;
  direcao: "melhorando" | "estavel" | "piorando";
  periodoBase: string;
  confianca: number;
}

export interface PrincipalRisco {
  fator: string;
  peso: number;
  valor: string;
  benchmarkStr: string;
  acao: string;
}

export interface ProjecaoDinamica {
  escalaPercent: number;
  novoGasto: number;
  novoLucro: number;
  novoRoas: number;
  novoScore: number;
  novoIndiceRisco: number;
  deltaLucro: number;
  viavel: boolean;
  avisos: string[];
}

export interface AcaoRankeada {
  rank: number;
  tipo: "pausar" | "escalar" | "ajustar_segmentacao" | "revisar_criativo";
  campanhaId: string;
  campanhaNome: string;
  impactoScoreEstimado: number;
  impactoLucroEstimado: number;
  urgencia: "imediata" | "esta_semana" | "proximo_ciclo";
  justificativa: string;
}

export interface ScorePreditivo7d {
  scoreAtual: number;
  scoreProjetado: number;
  delta: number;
  direcao: "subindo" | "estavel" | "caindo";
  drivers: string[];
  confianca: number;
}

export interface ResumoExecutivo {
  scoreAtual: number;
  riscoPrincipal: string;
  oportunidadePrincipal: string;
  tendencia: string;
  acaoRecomendada: string;
  linhas: string[];
}

export interface ConcentracaoRisco {
  pctBudgetEmCriticas: number;
  dependenciaVencedora: number;
  riscoEstrutural: boolean;
  campanhaVencedora?: string;
  alertas: string[];
}

export interface LogDecisao {
  timestamp: string;
  campanhaId: string;
  campanhaNome: string;
  acao: string;
  tipo: "pausar" | "escalar" | "ajustar" | "ignorar";
  contexto: {
    scoreAntes: number;
    scoreProjetado: number;
    roasAntes: number;
    cplAntes: number;
    lucroAntes: number;
    indiceRiscoAntes: number;
    tendencia: string;
    confiancaEngine: number;
  };
  justificativaEngine: string;
  impactoEstimado: string;
  resultado?: {
    scoreDepois?: number;
    lucroDepois?: number;
    acertou?: boolean;
  };
}

export interface AnaliseCompleta {
  riscos: RiscoProgressivoResult[];
  tendencia: TendenciaConta;
  principaisRiscos: (PrincipalRisco | null)[];
  ranking: AcaoRankeada[];
  preditivo: ScorePreditivo7d;
  resumoExecutivo: ResumoExecutivo;
  concentracao: ConcentracaoRisco;
  confiancas: number[];
  scoreGlobal: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARKS LEGADOS (mantidos para retrocompatibilidade)
// ─────────────────────────────────────────────────────────────────────────────

const BENCHMARKS = {
  ROAS_MINIMO:      2.5,
  ROAS_EXCELENTE:   4.0,
  CPL_IDEAL:        30,
  CPL_CRITICO:      80,
  MARGEM_MINIMA:    0.20,
  MARGEM_BOA:       0.35,
  DIAS_MIN_DADOS:   3,
  INVESTIMENTO_MIN: 200,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtBRL0 = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function _calcROAS(c: CampanhaBase): number {
  if (!c.receita_estimada || c.gasto_total <= 0) return 0;
  return c.receita_estimada / c.gasto_total;
}

function _calcCPL(c: CampanhaBase): number {
  if (!c.contatos || c.contatos <= 0 || c.gasto_total <= 0) return 0;
  return c.gasto_total / c.contatos;
}

function _calcMargem(c: CampanhaBase): number {
  if (!c.receita_estimada || c.receita_estimada <= 0) return 0;
  return (c.receita_estimada - c.gasto_total) / c.receita_estimada;
}

function _calcLucro(c: CampanhaBase): number {
  return (c.receita_estimada ?? 0) - c.gasto_total;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES LEGADAS (mantidas para retrocompatibilidade total)
// ─────────────────────────────────────────────────────────────────────────────

export function calcScore(cpl: number, ctr: number, pctGasto: number, resultado: number): number {
  let s = 100;
  if (cpl > 80) s -= 35; else if (cpl > 40) s -= 20; else if (cpl > 20) s -= 8;
  if (ctr === 0) s -= 20; else if (ctr < 0.8) s -= 18; else if (ctr < 1.5) s -= 8;
  if (pctGasto > 95) s -= 15; else if (pctGasto > 85) s -= 8;
  if (resultado === 0) s -= 25;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function badgeDoScore(score: number): ScoreBadge {
  if (score >= 80) return { label: "Escalar",  color: "text-emerald-400", textRing: "#10b981", glow: true  };
  if (score >= 60) return { label: "Saudável", color: "text-sky-400",     textRing: "#0ea5e9", glow: false };
  if (score >= 40) return { label: "Atenção",  color: "text-amber-400",   textRing: "#f59e0b", glow: false };
  return               { label: "Risco",    color: "text-red-400",     textRing: "#ef4444", glow: false };
}

export function ctaDoScore(score: number, alertas: Alerta[]): CTA {
  if (score < 40) {
    return {
      label: "Pausar campanha",
      acao:  "pausar",
      color: "text-red-400 border-red-500/20 hover:bg-red-500/10",
    };
  }
  if (score < 80 && alertas.some(a => a.texto.toLowerCase().includes("criativo"))) {
    return {
      label: "Testar novo criativo",
      acao:  "criativo",
      color: "text-amber-400 border-amber-500/20 hover:bg-amber-500/10",
    };
  }
  if (score < 60) {
    return {
      label: "Revisar segmentação",
      acao:  "segmentacao",
      color: "text-amber-400 border-amber-500/20 hover:bg-amber-500/10",
    };
  }
  if (score < 80) {
    return {
      label: "Registrar análise",
      acao:  "revisar",
      color: "text-sky-400 border-sky-500/20 hover:bg-sky-500/10",
    };
  }
  return {
    label: "Escalar 20%",
    acao:  "escalar",
    color: "text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10",
  };
}

export function gerarAlertas(cpl: number, ctr: number, pctGasto: number, resultado: number): Alerta[] {
  const a: Alerta[] = [];
  if (ctr > 0 && ctr < 0.8) a.push({ tipo: "warning", texto: "CTR baixo — criativo pode estar saturado" });
  if (cpl > 80)              a.push({ tipo: "danger",  texto: "CPL elevado — revisar segmentação" });
  if (pctGasto > 90)         a.push({ tipo: "warning", texto: `Budget ${pctGasto.toFixed(0)}% utilizado` });
  if (resultado === 0)       a.push({ tipo: "danger",  texto: "Nenhum resultado neste período" });
  if (ctr >= 2.5 && cpl < 30) a.push({ tipo: "success", texto: "Alta eficiência — pronta para escala" });
  return a.slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTAS POR TIPO (v3 — específicos por tipo de campanha)
// ─────────────────────────────────────────────────────────────────────────────

export function gerarAlertasPorTipo(
  tipo: TipoCampanha,
  dados: {
    cpl: number; ctr: number; pctGasto: number; contatos: number;
    roas: number; cpm: number; cpc: number;
    cpv?: number; cpi?: number; cpe?: number;
    viewRate?: number;
  }
): Alerta[] {
  const alertas: Alerta[] = [];
  const bench = BENCHMARKS_POR_TIPO[tipo];

  switch (tipo) {
    case "leads":
    case "mensagens": {
      const cplIdeal   = bench.cplIdeal   ?? 30;
      const cplCritico = bench.cplCritico ?? 80;
      if (dados.cpl > cplCritico) alertas.push({ tipo: "danger",  texto: `CPL R$${dados.cpl.toFixed(0)} acima do limite (R$${cplCritico})` });
      else if (dados.cpl > cplIdeal)   alertas.push({ tipo: "warning", texto: `CPL R$${dados.cpl.toFixed(0)} acima do ideal (R$${cplIdeal})` });
      if (dados.contatos === 0)        alertas.push({ tipo: "danger",  texto: "Nenhum lead gerado neste período" });
      if (dados.ctr > 0 && dados.ctr < (bench.ctrMinimo ?? 0.8)) alertas.push({ tipo: "warning", texto: "CTR baixo — criativo pode estar saturado" });
      if (dados.cpl > 0 && dados.cpl < cplIdeal * 0.5) alertas.push({ tipo: "success", texto: "CPL excelente — pronto para escalar" });
      break;
    }

    case "conversao":
    case "vendas":
    case "catalogo":
    case "retargeting": {
      const roasMin = bench.roasMinimo ?? 2.5;
      const roasExc = bench.roasExcelente ?? 5.0;
      if (dados.roas < roasMin * 0.5) alertas.push({ tipo: "danger",  texto: `ROAS ${dados.roas.toFixed(2)}× muito abaixo do mínimo (${roasMin}×)` });
      else if (dados.roas < roasMin)  alertas.push({ tipo: "warning", texto: `ROAS ${dados.roas.toFixed(2)}× abaixo do mínimo (${roasMin}×)` });
      else if (dados.roas >= roasExc) alertas.push({ tipo: "success", texto: `ROAS ${dados.roas.toFixed(2)}× excelente — oportunidade de escala` });
      if (dados.contatos === 0)       alertas.push({ tipo: "danger",  texto: "Nenhuma conversão registrada" });
      break;
    }

    case "trafego": {
      const cpcMax = bench.cpcMaximo ?? 2.0;
      if (dados.cpc > cpcMax * 1.5)  alertas.push({ tipo: "danger",  texto: `CPC R$${dados.cpc.toFixed(2)} muito elevado (max R$${cpcMax})` });
      else if (dados.cpc > cpcMax)   alertas.push({ tipo: "warning", texto: `CPC R$${dados.cpc.toFixed(2)} acima do ideal (R$${cpcMax})` });
      if (dados.ctr < (bench.ctrMinimo ?? 1.0)) alertas.push({ tipo: "warning", texto: "CTR abaixo do esperado para campanha de tráfego" });
      break;
    }

    case "alcance":
    case "branding": {
      const cpmMax = bench.cpmMaximo ?? 25;
      if (dados.cpm > cpmMax * 1.5)  alertas.push({ tipo: "danger",  texto: `CPM R$${dados.cpm.toFixed(2)} muito alto (max R$${cpmMax})` });
      else if (dados.cpm > cpmMax)   alertas.push({ tipo: "warning", texto: `CPM R$${dados.cpm.toFixed(2)} acima do ideal` });
      else if (dados.cpm < cpmMax * 0.4) alertas.push({ tipo: "success", texto: `CPM eficiente — R$${dados.cpm.toFixed(2)} por mil impressões` });
      break;
    }

    case "video": {
      const cpvMax  = bench.cpvMaximo      ?? 0.30;
      const vrMin   = bench.viewRateMinimo ?? 25;
      if (dados.cpv !== undefined && dados.cpv > cpvMax) alertas.push({ tipo: "warning", texto: `CPV R$${dados.cpv.toFixed(3)} acima do ideal (R$${cpvMax})` });
      if (dados.viewRate !== undefined && dados.viewRate < vrMin) alertas.push({ tipo: "warning", texto: `Taxa de visualização ${dados.viewRate.toFixed(1)}% abaixo do mínimo (${vrMin}%)` });
      break;
    }

    case "app": {
      const cpiMax = bench.cpiMaximo ?? 15;
      if (dados.cpi !== undefined && dados.cpi > cpiMax) alertas.push({ tipo: "warning", texto: `CPI R$${dados.cpi.toFixed(2)} acima do ideal (R$${cpiMax})` });
      break;
    }

    case "engajamento": {
      const cpeMax = bench.cpeMaximo ?? 0.50;
      if (dados.cpe !== undefined && dados.cpe > cpeMax) alertas.push({ tipo: "warning", texto: `CPE R$${dados.cpe.toFixed(3)} acima do ideal (R$${cpeMax})` });
      break;
    }

    default:
      // Fallback para alertas legados
      if (dados.ctr > 0 && dados.ctr < 0.8) alertas.push({ tipo: "warning", texto: "CTR baixo — criativo pode estar saturado" });
      if (dados.cpl > 80)                    alertas.push({ tipo: "danger",  texto: "CPL elevado — revisar segmentação" });
  }

  // Alertas universais
  if (dados.pctGasto > 95) alertas.push({ tipo: "warning", texto: `Budget ${dados.pctGasto.toFixed(0)}% utilizado` });

  return alertas.slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// calcMetricas — v3: usa tipo de campanha quando disponível
// ─────────────────────────────────────────────────────────────────────────────

export function calcMetricas(c: Campanha, ticket = 450, conv = 0.04): Metricas {
  const investimento = c.gasto_total ?? 0;
  const resultado    = c.contatos ?? 0;
  const impressoes   = c.impressoes ?? 0;
  const alcance      = c.alcance ?? 0;
  const cliques      = c.cliques ?? 0;

  // CTR real ou do banco
  let ctr = 0, ctrReal = false;
  if (cliques > 0 && impressoes > 0) { ctr = (cliques / impressoes) * 100; ctrReal = true; }
  else if (c.ctr && c.ctr > 0)       { ctr = c.ctr; ctrReal = true; }

  const freq     = alcance > 0 && impressoes > 0 ? impressoes / alcance : (c.frequencia ?? 0);
  const cpm      = impressoes > 0 ? (investimento / impressoes) * 1000 : 0;
  const pctGasto = c.orcamento > 0 ? Math.min((investimento / c.orcamento) * 100, 100) : 0;

  // ── v3: resolve tipo e delega para calcMetricasPorTipo ──────────────────
  const tipo = resolverTipo(
    c.nome_campanha ?? "",
    (c as any).tipo_campanha,
    { cliques, contatos: resultado, impressoes, ctr, cpm, gasto_total: investimento }
  );

  const inputTipo: InputMetricasTipo = {
    gasto_total: investimento,
    contatos: resultado,
    impressoes,
    cliques,
    ctr,
    cpm,
    alcance,
    orcamento: c.orcamento ?? 0,
    visualizacoes:     (c as any).visualizacoes,
    instalacoes:       (c as any).instalacoes,
    engajamentos:      (c as any).engajamentos,
    mensagens_iniciadas: (c as any).mensagens_iniciadas,
    receita_estimada:  (c as any).receita_estimada,
  };

  const mt = calcMetricasPorTipo(inputTipo, tipo, ticket, conv);

  // Constrói alertas e CTA usando lógica por tipo
  const alertas = gerarAlertasPorTipo(tipo, {
    cpl: mt.cpl,
    ctr: mt.ctr,
    pctGasto,
    contatos: resultado,
    roas: mt.roas,
    cpm: mt.cpm,
    cpc: mt.cpc,
    cpv: mt.cpv,
    cpi: mt.cpi,
    cpe: mt.cpe,
    viewRate: mt.viewRate,
  });

  const scoreBadge = badgeDoScore(mt.score);
  const cta        = ctaDoScore(mt.score, alertas);

  return {
    investimento,
    resultado,
    lucro:      mt.lucro,
    margem:     mt.margem,
    cpl:        mt.cpl,
    ctr:        mt.ctr,
    ctrReal,
    freq,
    cpm:        mt.cpm,
    pctGasto,
    score:      mt.score,
    scoreBadge,
    alertas,
    cta,
    roas:       mt.roas,
    // v3 extras (acessíveis via cast se necessário)
    // tipo, metricaPrincipal, scoreDetalhado
  };
}

export function dentroDoperiodo(dataStr: string, periodo: Periodo): boolean {
  if (!dataStr) return true;
  const data = new Date(dataStr);
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  if (periodo === "hoje") {
    const i = new Date(); i.setHours(0, 0, 0, 0); return data >= i;
  }
  if (periodo === "7d") {
    const i = new Date(); i.setDate(hoje.getDate() - 6); i.setHours(0, 0, 0, 0); return data >= i;
  }
  if (periodo === "30d") {
    const i = new Date(); i.setDate(hoje.getDate() - 29); i.setHours(0, 0, 0, 0); return data >= i;
  }
  if (periodo === "mes") {
    const i = new Date(hoje.getFullYear(), hoje.getMonth(), 1); return data >= i;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// RISCO PROGRESSIVO (v3: usa benchmarks do tipo)
// ─────────────────────────────────────────────────────────────────────────────

export function calcularRiscoProgressivo(campanha: CampanhaBase): RiscoProgressivoResult {
  const roas   = _calcROAS(campanha);
  const cpl    = _calcCPL(campanha);
  const margem = _calcMargem(campanha);
  const dias   = campanha.dias_ativo ?? 7;
  const invest = campanha.gasto_total;

  // v3: usa benchmarks do tipo específico quando possível
  const tipo = resolverTipo(
    campanha.nome_campanha,
    campanha.tipo_campanha,
    { contatos: campanha.contatos, impressoes: campanha.impressoes, cliques: campanha.cliques, gasto_total: campanha.gasto_total }
  );
  const bench = BENCHMARKS_POR_TIPO[tipo];
  const ROAS_MIN = bench.roasMinimo ?? BENCHMARKS.ROAS_MINIMO;
  const ROAS_EXC = bench.roasExcelente ?? BENCHMARKS.ROAS_EXCELENTE;
  const CPL_IDEAL = bench.cplIdeal ?? BENCHMARKS.CPL_IDEAL;

  const fatores: FatorRisco[] = [];
  let pesoTotal = 0;

  if (roas > 0) {
    if (roas < ROAS_MIN) {
      const desvio = (ROAS_MIN - roas) / ROAS_MIN;
      const peso   = -Math.round(desvio * 35);
      fatores.push({ nome: "ROAS abaixo do mínimo", peso, valor: `${roas.toFixed(2)}×`, proporcional: true });
      pesoTotal += peso;
    } else if (roas >= ROAS_EXC) {
      const bonus = Math.min(Math.round((roas - ROAS_EXC) * 5), 15);
      fatores.push({ nome: "ROAS excelente", peso: bonus, valor: `${roas.toFixed(2)}×`, proporcional: true });
      pesoTotal += bonus;
    }
  } else if (dias >= BENCHMARKS.DIAS_MIN_DADOS && invest >= BENCHMARKS.INVESTIMENTO_MIN) {
    fatores.push({ nome: "Sem retorno registrado", peso: -35, valor: "0×", proporcional: false });
    pesoTotal -= 35;
  }

  if (cpl > 0) {
    if (cpl > CPL_IDEAL) {
      const desvioFrac = Math.min((cpl / CPL_IDEAL) - 1, 2);
      const peso = -Math.round(desvioFrac * 0.5 * 20);
      fatores.push({ nome: "CPL acima do ideal", peso, valor: `R$${Math.round(cpl)}`, proporcional: true });
      pesoTotal += peso;
    } else {
      const bonus = Math.min(Math.round((1 - cpl / CPL_IDEAL) * 10), 10);
      fatores.push({ nome: "CPL eficiente", peso: bonus, valor: `R$${Math.round(cpl)}`, proporcional: true });
      pesoTotal += bonus;
    }
  }

  if (margem !== 0) {
    if (margem < BENCHMARKS.MARGEM_MINIMA) {
      const desvio = BENCHMARKS.MARGEM_MINIMA - margem;
      const peso = margem < 0
        ? -Math.round(Math.min(desvio * 100, 1) * 25)
        : -Math.round((desvio / BENCHMARKS.MARGEM_MINIMA) * 15);
      fatores.push({ nome: "Margem insuficiente", peso, valor: `${(margem * 100).toFixed(1)}%`, proporcional: true });
      pesoTotal += peso;
    } else if (margem >= BENCHMARKS.MARGEM_BOA) {
      const bonus = Math.min(Math.round((margem - BENCHMARKS.MARGEM_BOA) * 50), 12);
      fatores.push({ nome: "Margem saudável", peso: bonus, valor: `${(margem * 100).toFixed(1)}%`, proporcional: true });
      pesoTotal += bonus;
    }
  }

  if (campanha.contatos === 0) {
    if (dias < BENCHMARKS.DIAS_MIN_DADOS) {
      fatores.push({ nome: "Sem leads (aguardando dados)", peso: -5, valor: "0 leads", proporcional: false });
      pesoTotal -= 5;
    } else {
      const penalidade = Math.min(Math.round((dias / 7) * 10), 20);
      fatores.push({ nome: `Sem leads em ${dias} dias`, peso: -penalidade, valor: "0 leads", proporcional: true });
      pesoTotal -= penalidade;
    }
  }

  if (invest >= BENCHMARKS.INVESTIMENTO_MIN && campanha.contatos > 0 && roas >= ROAS_MIN) {
    const bonus = Math.min(Math.round(Math.log10(invest / BENCHMARKS.INVESTIMENTO_MIN + 1) * 5), 8);
    fatores.push({ nome: "Volume comprovado", peso: bonus, valor: `R$${Math.round(invest)}`, proporcional: true });
    pesoTotal += bonus;
  }

  const scoreBase     = campanha.score ?? 50;
  const scoreAjustado = clamp(scoreBase + pesoTotal, 0, 100);
  const confianca     = calcularConfiancaAvancada(campanha, []);

  const riscosOrdenados = fatores.filter(f => f.peso < 0).sort((a, b) => a.peso - b.peso);
  const bonusOrdenados  = fatores.filter(f => f.peso > 0).sort((a, b) => b.peso - a.peso);
  let justificativa = "";
  if (riscosOrdenados.length > 0) {
    const p = riscosOrdenados[0];
    justificativa = `Principal risco: ${p.nome} (${p.valor}, ${Math.abs(p.peso)} pts)`;
    if (bonusOrdenados.length > 0) justificativa += `. Ponto positivo: ${bonusOrdenados[0].nome} (+${bonusOrdenados[0].peso} pts)`;
  } else if (bonusOrdenados.length > 0) {
    justificativa = `Campanha saudável. Destaque: ${bonusOrdenados[0].nome} (${bonusOrdenados[0].valor})`;
  } else {
    justificativa = "Dados insuficientes para análise completa.";
  }

  return { scoreAjustado, pesoTotal, fatores, justificativa, confianca };
}

// ─────────────────────────────────────────────────────────────────────────────
// TENDÊNCIA (mantida da v2)
// ─────────────────────────────────────────────────────────────────────────────

export function calcularTendenciaConta(
  snapshots: SnapshotCampanha[],
  campanhas: CampanhaBase[]
): TendenciaConta {
  const agora = new Date();
  const dia7  = new Date(agora.getTime() - 7  * 24 * 3600 * 1000);
  const dia14 = new Date(agora.getTime() - 14 * 24 * 3600 * 1000);

  const recentes   = snapshots.filter(s => new Date(s.data) >= dia7);
  const anteriores = snapshots.filter(s => new Date(s.data) >= dia14 && new Date(s.data) < dia7);

  function media(arr: SnapshotCampanha[], campo: keyof SnapshotCampanha): number {
    const vals = arr.map(s => s[campo] as number).filter(v => v > 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  function soma(arr: SnapshotCampanha[], campo: keyof SnapshotCampanha): number {
    return arr.reduce((s, a) => s + ((a[campo] as number) ?? 0), 0);
  }

  const roasAtual    = media(recentes,   "roas");
  const roasAnterior = media(anteriores, "roas");
  const cplAtual     = media(recentes,   "cpl");
  const cplAnterior  = media(anteriores, "cpl");
  const lucroAtual    = soma(recentes,   "receita") - soma(recentes,   "gasto");
  const lucroAnterior = soma(anteriores, "receita") - soma(anteriores, "gasto");

  const roasDelta     = roasAtual - roasAnterior;
  const cplDelta      = cplAtual  - cplAnterior;
  const lucroDelta    = lucroAtual - lucroAnterior;
  const roasDeltaPct  = roasAnterior > 0 ? (roasDelta  / roasAnterior)              * 100 : 0;
  const cplDeltaPct   = cplAnterior  > 0 ? (cplDelta   / cplAnterior)               * 100 : 0;
  const lucroDeltaPct = lucroAnterior !== 0 ? (lucroDelta / Math.abs(lucroAnterior)) * 100 : 0;

  const confianca = recentes.length > 0 && anteriores.length > 0
    ? clamp(Math.round((Math.min(recentes.length, anteriores.length) / 7) * 100), 20, 90)
    : 15;

  let pontosMelhora = 0, pontospiora = 0;
  if (roasDelta > 0.3)  pontosMelhora += 2; else if (roasDelta  < -0.3) pontospiora += 2;
  if (cplDelta  < -5)   pontosMelhora += 1; else if (cplDelta   >  5)   pontospiora += 1;
  if (lucroDelta > 0)   pontosMelhora += 1; else if (lucroDelta < 0)    pontospiora += 1;

  const direcao: TendenciaConta["direcao"] =
    pontosMelhora >= 3 ? "melhorando" :
    pontospiora   >= 3 ? "piorando"   : "estavel";

  return { roasDelta, roasDeltaPct, cplDelta, cplDeltaPct, scoreDelta: 0, lucroDelta, lucroDeltaPct, direcao, periodoBase: "7 dias anteriores", confianca };
}

// ─────────────────────────────────────────────────────────────────────────────
// FATOR PRINCIPAL DE RISCO (mantido da v2)
// ─────────────────────────────────────────────────────────────────────────────

export function identificarPrincipalRisco(campanha: CampanhaBase): PrincipalRisco | null {
  const { fatores } = calcularRiscoProgressivo(campanha);
  const riscos = fatores.filter(f => f.peso < 0).sort((a, b) => a.peso - b.peso);
  if (riscos.length === 0) return null;
  const principal = riscos[0];
  const acoes: Record<string, string> = {
    "ROAS abaixo do mínimo":        "Revisar criativos e segmentação",
    "Sem retorno registrado":       "Pausar e revisar toda a estrutura",
    "CPL acima do ideal":           "Testar novos criativos e públicos",
    "Margem insuficiente":          "Ajustar oferta ou preço de venda",
    "Sem leads (aguardando dados)": "Aguardar mais dados",
  };
  let benchmarkStr = "";
  if (principal.nome.includes("ROAS"))   benchmarkStr = `mínimo saudável: ${BENCHMARKS.ROAS_MINIMO}×`;
  if (principal.nome.includes("CPL"))    benchmarkStr = `ideal: R$${BENCHMARKS.CPL_IDEAL}`;
  if (principal.nome.includes("Margem")) benchmarkStr = `mínimo: ${BENCHMARKS.MARGEM_MINIMA * 100}%`;
  return { fator: principal.nome, peso: Math.abs(principal.peso), valor: principal.valor, benchmarkStr, acao: acoes[principal.nome] ?? "Revisar configuração da campanha" };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIANÇA (mantida da v2)
// ─────────────────────────────────────────────────────────────────────────────

export function calcularConfiancaAvancada(campanha: CampanhaBase, snapshots: SnapshotCampanha[]): number {
  const dias   = campanha.dias_ativo ?? 7;
  const invest = campanha.gasto_total;
  const leads  = campanha.contatos ?? 0;
  const fatorDias   = clamp(Math.round(Math.log2(dias + 1) * 5), 0, 25);
  const fatorVolume = invest >= 5000 ? 20 : invest >= 2000 ? 15 : invest >= 500 ? 10 : invest >= 200 ? 5 : 0;
  const fatorLeads  = leads >= 100 ? 20 : leads >= 30 ? 15 : leads >= 10 ? 10 : leads >= 3 ? 5 : 0;
  const snapsCamp = snapshots.filter(s => s.campanha_id === campanha.id).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 7);
  let fatorInstabilidade = 0;
  if (snapsCamp.length >= 3) {
    const vals = snapsCamp.map(s => s.roas ?? 0).filter(v => v > 0);
    if (vals.length >= 2) {
      const mediaVal = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variancia = vals.reduce((s, v) => s + (v - mediaVal) ** 2, 0) / vals.length;
      const cv = mediaVal > 0 ? Math.sqrt(variancia) / mediaVal : 0;
      fatorInstabilidade = cv > 0.5 ? -15 : cv > 0.3 ? -8 : cv < 0.1 ? 5 : 0;
    }
  }
  return clamp(40 + fatorDias + fatorVolume + fatorLeads + fatorInstabilidade, 20, 97);
}

export function calcularConfianca(diasAtivo: number, gasto: number, leads: number): number {
  let conf = 50;
  if (diasAtivo >= 14) conf += 20; else if (diasAtivo >= 7) conf += 10;
  if (gasto > 500) conf += 10; else if (gasto > 200) conf += 5;
  if (leads > 20)  conf += 10; else if (leads > 5)   conf += 5;
  return Math.min(97, Math.max(60, conf));
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJEÇÃO DINÂMICA (mantida da v2)
// ─────────────────────────────────────────────────────────────────────────────

export function calcularProjecaoDinamica(campanha: CampanhaBase, escalaPercent: number, scoreGlobal: number, indiceRiscoGlobal: number, temCampanhasCriticas: boolean): ProjecaoDinamica {
  const escala = clamp(escalaPercent / 100, 0, 0.5);
  const roas   = _calcROAS(campanha);
  const lucro  = _calcLucro(campanha);
  const invest = campanha.gasto_total;

  const tipo   = resolverTipo(campanha.nome_campanha, campanha.tipo_campanha);
  const bench  = BENCHMARKS_POR_TIPO[tipo];
  const ROAS_MIN = bench.roasMinimo ?? BENCHMARKS.ROAS_MINIMO;
  const ROAS_EXC = bench.roasExcelente ?? BENCHMARKS.ROAS_EXCELENTE;

  const eficienciaMarginal = Math.max(1 - escala * 0.4, 0.6);
  const novoGasto  = invest * (1 + escala);
  const novoRoas   = roas * eficienciaMarginal;
  const novoLucro  = novoGasto * (novoRoas - 1);
  const deltaLucro = novoLucro - lucro;
  const impactoScore = roas >= ROAS_MIN ? Math.round(escala * 15 * eficienciaMarginal) : 0;
  const novoScore    = clamp(scoreGlobal + impactoScore, 0, 100);
  const indiceRiscoNovo = roas >= ROAS_EXC ? Math.max(indiceRiscoGlobal - Math.round(escala * 10), 0) : indiceRiscoGlobal;
  const viavel  = !temCampanhasCriticas || roas >= ROAS_EXC;
  const avisos: string[] = [];
  if (temCampanhasCriticas && roas < ROAS_EXC) avisos.push("Conta tem campanhas críticas ativas. Pause-as antes de escalar para maximizar o retorno.");
  if (escala > 0.3 && novoRoas < ROAS_MIN) avisos.push("ROAS projetado pode ficar abaixo do mínimo com esta escala. Recomendamos no máximo 20%.");
  if (escala === 0.5) avisos.push("Escala de 50% pode saturar o público. Considere 20–30% primeiro.");
  return { escalaPercent, novoGasto: Math.round(novoGasto), novoLucro: Math.round(novoLucro), novoRoas, novoScore, novoIndiceRisco: indiceRiscoNovo, deltaLucro: Math.round(deltaLucro), viavel, avisos };
}

// ─────────────────────────────────────────────────────────────────────────────
// RANKING (mantido da v2)
// ─────────────────────────────────────────────────────────────────────────────

export function gerarRankingAcoes(campanhas: CampanhaBase[], scoreGlobal: number): AcaoRankeada[] {
  const acoes: AcaoRankeada[] = [];
  campanhas.forEach(c => {
    const risco = calcularRiscoProgressivo(c);
    const roas  = _calcROAS(c);
    const cpl   = _calcCPL(c);
    const lucro = _calcLucro(c);
    const dias  = c.dias_ativo ?? 7;

    const tipo  = resolverTipo(c.nome_campanha, c.tipo_campanha);
    const bench = BENCHMARKS_POR_TIPO[tipo];
    const ROAS_MIN = bench.roasMinimo ?? BENCHMARKS.ROAS_MINIMO;
    const ROAS_EXC = bench.roasExcelente ?? BENCHMARKS.ROAS_EXCELENTE;

    if (risco.scoreAjustado < 40 && dias >= BENCHMARKS.DIAS_MIN_DADOS) {
      acoes.push({ rank: 0, tipo: "pausar", campanhaId: c.id, campanhaNome: c.nome_campanha, impactoScoreEstimado: Math.round((scoreGlobal - risco.scoreAjustado) / Math.max(1, campanhas.length) * 2), impactoLucroEstimado: Math.round(c.gasto_total * 0.3 * 4), urgencia: risco.scoreAjustado < 20 ? "imediata" : "esta_semana", justificativa: risco.justificativa });
    }
    if (roas >= ROAS_MIN && risco.scoreAjustado >= 75) {
      acoes.push({ rank: 0, tipo: "escalar", campanhaId: c.id, campanhaNome: c.nome_campanha, impactoScoreEstimado: Math.round(risco.pesoTotal > 0 ? risco.pesoTotal * 0.1 : 5), impactoLucroEstimado: Math.round(lucro * 0.2 * 4), urgencia: roas >= ROAS_EXC ? "imediata" : "esta_semana", justificativa: `ROAS ${roas.toFixed(2)}× com margem positiva — headroom disponível.` });
    }
    if (cpl > BENCHMARKS.CPL_CRITICO && roas > 0) {
      acoes.push({ rank: 0, tipo: "ajustar_segmentacao", campanhaId: c.id, campanhaNome: c.nome_campanha, impactoScoreEstimado: 5, impactoLucroEstimado: Math.round((cpl - BENCHMARKS.CPL_IDEAL) * (c.contatos ?? 0) * 0.3), urgencia: "proximo_ciclo", justificativa: `CPL R$${Math.round(cpl)} vs ideal R$${BENCHMARKS.CPL_IDEAL}. Revisar criativos e segmentação.` });
    }
  });
  return acoes.sort((a, b) => (b.impactoScoreEstimado * 1000 + b.impactoLucroEstimado / 100) - (a.impactoScoreEstimado * 1000 + a.impactoLucroEstimado / 100)).slice(0, 3).map((a, i) => ({ ...a, rank: i + 1 }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE PREDITIVO, RESUMO EXECUTIVO, CONCENTRAÇÃO DE RISCO (mantidos da v2)
// ─────────────────────────────────────────────────────────────────────────────

export function calcularScorePreditivo7d(scoreAtual: number, tendencia: TendenciaConta, campanhas: CampanhaBase[], snapshots: SnapshotCampanha[]): ScorePreditivo7d {
  const criticas = campanhas.filter(c => (c.score ?? 50) < 40).length;
  const otimas   = campanhas.filter(c => (c.score ?? 50) >= 80).length;
  const taxaDiaria = tendencia.direcao === "melhorando" ? 0.8 : tendencia.direcao === "piorando" ? -0.8 : 0;
  const delta = Math.round((taxaDiaria * 7) - (criticas * 1.5 * 7 / 10) + (otimas * 0.3 * 7 / 10));
  const scoreProjetado = clamp(scoreAtual + delta, 0, 100);
  const direcao: ScorePreditivo7d["direcao"] = delta > 3 ? "subindo" : delta < -3 ? "caindo" : "estavel";
  const drivers: string[] = [];
  if (criticas > 0) drivers.push(`${criticas} campanha${criticas > 1 ? "s" : ""} crítica${criticas > 1 ? "s" : ""} deteriorando sem ação`);
  if (tendencia.direcao === "melhorando" && tendencia.confianca > 40) drivers.push("Tendência de ROAS melhorando nos últimos 7 dias");
  if (tendencia.direcao === "piorando") drivers.push("Tendência negativa de ROAS e lucro");
  if (otimas > 0) drivers.push(`${otimas} campanha${otimas > 1 ? "s" : ""} em crescimento orgânico`);
  if (drivers.length === 0) drivers.push("Sem mudanças detectadas — operação estável");
  return { scoreAtual, scoreProjetado, delta, direcao, drivers, confianca: clamp(Math.round(tendencia.confianca * 0.7 + (snapshots.length > 10 ? 20 : 5)), 20, 85) };
}

export function gerarResumoExecutivo(scoreAtual: number, tendencia: TendenciaConta, principalRisco: PrincipalRisco | null, melhorOportunidade: AcaoRankeada | null, rankingAcoes: AcaoRankeada[], preditivo: ScorePreditivo7d): ResumoExecutivo {
  const nivelStr = scoreAtual < 30 ? "Crítico" : scoreAtual < 50 ? "Baixo" : scoreAtual < 70 ? "Moderado" : scoreAtual < 85 ? "Bom" : "Excelente";
  const tendStr  = tendencia.direcao === "melhorando" ? "↑ Melhorando" : tendencia.direcao === "piorando" ? "↓ Piorando" : "→ Estável";
  const riscoPrincipal = principalRisco ? `${principalRisco.fator}: ${principalRisco.valor} (−${principalRisco.peso} pts)` : "Nenhum risco crítico detectado";
  const oportunidade   = melhorOportunidade ? `${melhorOportunidade.campanhaNome} — +R$${fmtBRL0(melhorOportunidade.impactoLucroEstimado)}/mês` : "Nenhuma oportunidade imediata";
  const acaoTop = rankingAcoes[0];
  const acaoStr = acaoTop ? `${acaoTop.tipo === "pausar" ? "Pausar" : "Escalar"} "${acaoTop.campanhaNome}" (+${acaoTop.impactoScoreEstimado} pts score)` : "Monitorar tendências";
  return { scoreAtual, riscoPrincipal, oportunidadePrincipal: oportunidade, tendencia: tendStr, acaoRecomendada: acaoStr, linhas: [`Score ${scoreAtual}/100 (${nivelStr}) · ${tendStr} · Em 7 dias: ${preditivo.scoreProjetado}/100`, `Risco: ${riscoPrincipal}`, `Oportunidade: ${oportunidade}`, `Ação: ${acaoStr}`] };
}

export function analisarConcentracaoRisco(campanhas: CampanhaBase[]): ConcentracaoRisco {
  const totalBudget   = campanhas.reduce((s, c) => s + c.gasto_total, 0);
  const budgetCritico = campanhas.filter(c => (c.score ?? 50) < 40).reduce((s, c) => s + c.gasto_total, 0);
  const lucros        = campanhas.map(c => ({ nome: c.nome_campanha, lucro: _calcLucro(c) }));
  const totalLucro    = lucros.reduce((s, c) => s + Math.max(0, c.lucro), 0);
  const melhor        = [...lucros].sort((a, b) => b.lucro - a.lucro)[0];
  const pctBudgetEmCriticas  = totalBudget > 0 ? (budgetCritico / totalBudget) * 100 : 0;
  const dependenciaVencedora = totalLucro > 0 && melhor?.lucro > 0 ? (melhor.lucro / totalLucro) * 100 : 0;
  const alertas: string[] = [];
  if (pctBudgetEmCriticas >= 30) alertas.push(`${Math.round(pctBudgetEmCriticas)}% do budget investido em campanhas com score crítico.`);
  if (dependenciaVencedora >= 60) alertas.push(`${Math.round(dependenciaVencedora)}% do lucro concentrado em "${melhor?.nome}". Alta vulnerabilidade.`);
  if (campanhas.length === 1) alertas.push("Conta com campanha única. Qualquer instabilidade impacta toda a receita.");
  return { pctBudgetEmCriticas: Math.round(pctBudgetEmCriticas * 10) / 10, dependenciaVencedora: Math.round(dependenciaVencedora * 10) / 10, riscoEstrutural: pctBudgetEmCriticas >= 30 || dependenciaVencedora >= 60 || campanhas.length === 1, campanhaVencedora: dependenciaVencedora >= 40 ? melhor?.nome : undefined, alertas };
}

export function construirLogDecisao(campanha: CampanhaBase, acao: string, tipo: LogDecisao["tipo"], contexto: { scoreAtual: number; scoreProjetado: number; roasAtual: number; cplAtual: number; lucroAtual: number; indiceRiscoAtual: number; tendencia: TendenciaConta; confiancaEngine: number }, justificativaEngine: string): LogDecisao {
  const lucroImpacto = tipo === "pausar" ? `Evitar ~R$${fmtBRL0(campanha.gasto_total * 0.3 * 4)}/mês de budget sem retorno` : `Potencial +R$${fmtBRL0(_calcLucro(campanha) * 0.2 * 4)}/mês com escala de 20%`;
  return { timestamp: new Date().toISOString(), campanhaId: campanha.id, campanhaNome: campanha.nome_campanha, acao, tipo, contexto: { scoreAntes: contexto.scoreAtual, scoreProjetado: contexto.scoreProjetado, roasAntes: Math.round(contexto.roasAtual * 100) / 100, cplAntes: Math.round(contexto.cplAtual), lucroAntes: Math.round(contexto.lucroAtual), indiceRiscoAntes: contexto.indiceRiscoAtual, tendencia: contexto.tendencia.direcao, confiancaEngine: contexto.confiancaEngine }, justificativaEngine, impactoEstimado: lucroImpacto };
}

// ─────────────────────────────────────────────────────────────────────────────
// ORQUESTRADOR (mantido da v2)
// ─────────────────────────────────────────────────────────────────────────────

export function analisarConta(campanhas: CampanhaBase[], snapshots: SnapshotCampanha[], scoreGlobal: number): AnaliseCompleta {
  const riscos           = campanhas.map(c => calcularRiscoProgressivo(c));
  const tendencia        = calcularTendenciaConta(snapshots, campanhas);
  const principaisRiscos = campanhas.map(c => identificarPrincipalRisco(c));
  const confiancas       = campanhas.map(c => calcularConfiancaAvancada(c, snapshots));
  const ranking          = gerarRankingAcoes(campanhas, scoreGlobal);
  const preditivo        = calcularScorePreditivo7d(scoreGlobal, tendencia, campanhas, snapshots);
  const concentracao     = analisarConcentracaoRisco(campanhas);
  const riscoGlobalPrincipal = principaisRiscos.filter(Boolean).sort((a, b) => (b?.peso ?? 0) - (a?.peso ?? 0))[0] ?? null;
  const melhorOportunidade   = ranking.find(a => a.tipo === "escalar") ?? null;
  const resumoExecutivo = gerarResumoExecutivo(scoreGlobal, tendencia, riscoGlobalPrincipal, melhorOportunidade, ranking, preditivo);
  return { riscos, tendencia, principaisRiscos, ranking, preditivo, resumoExecutivo, concentracao, confiancas, scoreGlobal };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS v3: utilitários de tipo (para usar em componentes)
// ─────────────────────────────────────────────────────────────────────────────

/** Retorna badge de tipo para exibição nos cards */
export { badgeTipo, ctaDoTipo, resolverTipo, calcMetricasPorTipo };