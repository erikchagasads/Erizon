/**
 * algoritmoErizon.ts — v4
 *
 * Novidades v4:
 *   - Projeção 72h (urgência imediata além dos 7 dias)
 *   - Velocidade de degradação (quando metricas_snapshot_diario existir)
 *   - Resumo operacional em 1 frase automático
 *   - Índice de Prioridade de Decisão (ordena ações por urgência × impacto)
 */

export interface CampanhaInput {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  orcamento: number;
  impressoes?: number;
  alcance?: number;
  cliques?: number;
  ctr?: number;
  frequencia?: number;
  data_inicio?: string;
  data_insercao?: string;
}

// Snapshot histórico — vem de metricas_snapshot_diario se existir
export interface SnapshotHistorico {
  campanha_id: string;
  cpl_ontem?: number;
  cpl_semana?: number;
  ctr_ontem?: number;
  ctr_semana?: number;
  leads_ontem?: number;
  gasto_ontem?: number;
}

export type FlagTipo =
  | "escala" | "risco" | "saturacao" | "sem_leads"
  | "budget_critico" | "criativo_forte" | "fadiga_criativa" | "alavancagem_alta"
  | "degradando_rapido";

export type UrgenciaNivel = "critico" | "atencao" | "estavel" | "oportunidade";

export interface Flag {
  tipo: FlagTipo;
  label: string;
  descricao: string;
  cor: "emerald" | "red" | "amber" | "purple";
}

export interface VelocidadeDegradacao {
  temDados: boolean;
  cplDelta?: number;       // % mudança CPL (positivo = piorando)
  ctrDelta?: number;       // % mudança CTR (negativo = piorando)
  leadsDelta?: number;     // % mudança leads
  tendencia: "piorando_rapido" | "piorando" | "estavel" | "melhorando";
  urgenciaExtra: boolean;  // adiciona urgência ao score
}

export interface RecomendacaoAcao {
  prioridade: 1 | 2 | 3;
  acao: string;
  campanha: string;
  impacto: string;
  impactoFinanceiro: number;
  lucroPotencial: number;
  tipo: "escalar" | "pausar" | "criativo" | "budget" | "segmentacao";
}

export interface ScoresAvancados {
  creativeEfficiency: number;
  saturacaoReal: number;
  alavancagem: number;
  narrativa: string;
  narrativaTipo: "sucesso" | "atencao" | "risco" | "neutro";
  urgencia: UrgenciaNivel;
  urgenciaLabel: string;
  indicePrioridade: number;
  degradacao: VelocidadeDegradacao;
}

export interface MediaConta {
  cpl: number;
  ctr: number;
  roas: number;
  cpm: number;
  freq: number;
  margem: number;
}

export interface CampanhaEnriquecidaAlgo {
  id: string;
  nome_campanha: string;
  gasto: number;
  leads: number;
  receita: number;
  lucro: number;
  margem: number;
  roas: number;
  cpl: number;
  ctr: number;
  ctrReal: boolean;
  freq: number;
  cpm: number;
  score: number;
  flags: Flag[];
  scores: ScoresAvancados;
  diasAtivo: number;
  alavancagem: number;
}

export interface RadarItem {
  tipo: "critico" | "escala" | "saturacao";
  campanhas: string[];
  count: number;
  valorEmJogo: number;
  mensagem: string;
}

export interface Projecao72h {
  lucroEmRisco72h: number;
  lucroPotencial72h: number;
  receiaEmRisco72h: number;
  receitaPotencial72h: number;
  campanhasCriticas: string[];
  campanhasOportunidade: string[];
}

export interface HealthResult {
  score: number;
  label: string;
  corLabel: string;
  urgenciaGlobal: UrgenciaNivel;
  urgenciaLabel: string;
  resumoFrase: string;          // resumo em 1 frase para o topo do Radar
  dinheiroEmRisco: number;
  lucroEmRisco: number;
  margemMedia: number;
  oportunidadeEscala: number;
  // 7 dias
  perdaProjetada7d: number;
  lucroPerda7d: number;
  ganhoProjetado7d: number;
  lucroPotencial7d: number;
  // 72 horas
  projecao72h: Projecao72h;
  cplMedio: number;
  roasMedio: number;
  mediaConta: MediaConta;
  campanhasProblema: number;
  campanhasEscala: number;
  campanhasSaturacao: number;
  campanhasDegradando: number;
  radar: RadarItem[];
  recomendacoes: RecomendacaoAcao[];
  flagsPorCampanha: Record<string, Flag[]>;
  scoresPorCampanha: Record<string, ScoresAvancados>;
  enriched: CampanhaEnriquecidaAlgo[];
}

// ── Engine Params (vindos do user_configs) ────────────────────────────────────
export interface EngineParams {
  ticket: number;          // ticket_medio_cliente ?? ticket_medio_global ?? 450
  conv: number;            // taxa_conversao ?? 0.04
  valorLeadQualificado: number;  // para negócios de alto valor (imobiliário, serviços premium)
  usarValorLead: boolean;  // true = usa valorLeadQualificado ao invés de ticket × conv
}

export function resolverEngineParams(config?: {
  ticket_medio_cliente?: number | null;
  ticket_medio_global?: number | null;
  taxa_conversao?: number | null;
  valor_lead_qualificado?: number | null;
}): EngineParams {
  const ticket = config?.ticket_medio_cliente ?? config?.ticket_medio_global ?? 450;
  const conv   = config?.taxa_conversao ?? 0.04;
  const valorLead = config?.valor_lead_qualificado ?? 0;
  const usarValorLead = valorLead > 0;
  return { ticket, conv, valorLeadQualificado: valorLead, usarValorLead };
}

// Calcula receita por lead levando em conta o modo do engine
export function calcReceita(leads: number, gasto: number, params: EngineParams): number {
  if (params.usarValorLead) {
    // Modo alto valor: cada lead qualificado tem valor fixo conhecido
    return leads * params.valorLeadQualificado;
  }
  // Modo padrão: lead × taxa de conversão × ticket
  return leads * params.conv * params.ticket;
}

// ── Benchmarks ───────────────────────────────────────────────────────────────
const B = {
  CPL_EXCELENTE: 15, CPL_BOM: 30, CPL_ATENCAO: 50, CPL_CRITICO: 80,
  CTR_BAIXO: 0.9,    CTR_BOM: 2.0, CTR_OTIMO: 3.0,
  FREQ_ATENCAO: 2.5, FREQ_CRITICA: 3.5,
  BUDGET_ATENCAO: 85, BUDGET_CRITICO: 95,
  ROAS_MINIMO: 1.5,  ROAS_BOM: 2.0, ROAS_ESCALA: 2.5,
  SCORE_ESCALA: 70,
  MARGEM_ALVO: 0.30,
  DEGRADACAO_RAPIDA_CPL: 25,   // % de aumento de CPL que é "rápido"
  DEGRADACAO_RAPIDA_CTR: -20,  // % de queda de CTR que é "rápida"
};

function safe(v: unknown): number {
  const n = Number(v);
  return isFinite(n) && !isNaN(n) ? Math.max(0, n) : 0;
}
function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}
function diasAtivo(c: CampanhaInput): number {
  const raw = c.data_inicio ?? c.data_insercao;
  if (!raw) return 7;
  return Math.max(1, Math.ceil((Date.now() - new Date(raw).getTime()) / 86_400_000));
}
function resolverCTR(c: CampanhaInput): { ctr: number; real: boolean } {
  const imp = safe(c.impressoes), cli = safe(c.cliques);
  if (cli > 0 && imp > 0) return { ctr: (cli / imp) * 100, real: true };
  if (safe(c.ctr) > 0)    return { ctr: safe(c.ctr), real: true };
  return { ctr: 0, real: false };
}

// ── Score base ───────────────────────────────────────────────────────────────
export function scoreCampanha(c: CampanhaInput, ticket = 450, conv = 0.04, params?: EngineParams): number {
  const g = safe(c.gasto_total), l = safe(c.contatos), orc = safe(c.orcamento);
  const fr = safe(c.frequencia);
  const { ctr, real } = resolverCTR(c);
  const cpl  = l > 0 ? g / l : 0;
  const receita = params ? calcReceita(l, g, params) : l * conv * ticket;
  const roas = g > 0 ? receita / g : 0;
  const pct  = orc > 0 ? (g / orc) * 100 : 0;
  let s = 100;
  if (cpl > B.CPL_CRITICO)       s -= 30;
  else if (cpl > B.CPL_ATENCAO)  s -= 15;
  else if (cpl > B.CPL_BOM)      s -= 5;
  if (l === 0 && g > 50)         s -= 30;
  if (real && ctr > 0) {
    if (ctr < B.CTR_BAIXO)       s -= 18;
    else if (ctr < B.CTR_BOM)    s -= 6;
  }
  if (roas < B.ROAS_MINIMO && g > 0)    s -= 20;
  else if (roas < B.ROAS_BOM && g > 0)  s -= 8;
  if (pct > B.BUDGET_CRITICO)    s -= 12;
  else if (pct > B.BUDGET_ATENCAO) s -= 5;
  if (fr > B.FREQ_CRITICA)       s -= 12;
  else if (fr > B.FREQ_ATENCAO)  s -= 5;
  return clamp(s);
}

// ── Creative Efficiency ───────────────────────────────────────────────────────
function creativeEfficiency(c: CampanhaInput): number {
  const { ctr, real } = resolverCTR(c);
  const fr = safe(c.frequencia), dias = diasAtivo(c);
  if (!real || ctr === 0) return 50;
  let base = ctr >= B.CTR_OTIMO ? 90 : ctr >= B.CTR_BOM ? 70 : ctr >= B.CTR_BAIXO ? 40 : 20;
  base -= Math.min(40, (fr / B.FREQ_CRITICA) * 25);
  if (dias <= 7 && ctr >= B.CTR_BOM)  base += 10;
  if (dias > 21 && ctr < B.CTR_BOM)   base -= 10;
  return clamp(base);
}

// ── Saturação ─────────────────────────────────────────────────────────────────
function saturacaoReal(c: CampanhaInput): number {
  const fr = safe(c.frequencia), dias = diasAtivo(c);
  const { ctr, real } = resolverCTR(c);
  const alc = safe(c.alcance), imp = safe(c.impressoes);
  let s = 0;
  if (fr >= B.FREQ_CRITICA) s += 50; else if (fr >= B.FREQ_ATENCAO) s += 25;
  if (dias > 30) s += 20; else if (dias > 14) s += 10;
  if (real && ctr > 0 && ctr < B.CTR_BAIXO && fr >= B.FREQ_ATENCAO) s += 20;
  if (alc > 0 && imp > 0 && (imp / alc) >= B.FREQ_CRITICA) s += 10;
  return clamp(s);
}

// ── Alavancagem ───────────────────────────────────────────────────────────────
function indiceAlavancagem(c: CampanhaInput, score: number, ticket = 450, conv = 0.04): number {
  const g = safe(c.gasto_total), l = safe(c.contatos), orc = safe(c.orcamento);
  const fr = safe(c.frequencia);
  const roas = g > 0 ? (l * conv * ticket) / g : 0;
  const pct  = orc > 0 ? (g / orc) * 100 : 0;
  if (roas < B.ROAS_MINIMO) return 0;
  let a = Math.min(50, ((roas - B.ROAS_MINIMO) / B.ROAS_MINIMO) * 30);
  a += Math.min(25, (100 - pct) * 0.3);
  if (fr < B.FREQ_ATENCAO)        a += 15;
  else if (fr > B.FREQ_CRITICA)   a -= 20;
  if (score >= B.SCORE_ESCALA)    a += 10;
  return clamp(a);
}

// ── Velocidade de degradação ──────────────────────────────────────────────────
function calcDegradacao(
  c: CampanhaInput,
  snapshot: SnapshotHistorico | undefined,
  cplAtual: number
): VelocidadeDegradacao {
  if (!snapshot) {
    return { temDados: false, tendencia: "estavel", urgenciaExtra: false };
  }
  const { ctr: ctrAtual } = resolverCTR(c);

  let cplDelta: number | undefined;
  let ctrDelta: number | undefined;
  let leadsDelta: number | undefined;

  if (snapshot.cpl_semana && cplAtual > 0) {
    cplDelta = ((cplAtual - snapshot.cpl_semana) / snapshot.cpl_semana) * 100;
  }
  if (snapshot.ctr_semana && ctrAtual > 0) {
    ctrDelta = ((ctrAtual - snapshot.ctr_semana) / snapshot.ctr_semana) * 100;
  }
  if (snapshot.leads_ontem !== undefined && safe(c.contatos) > 0) {
    leadsDelta = ((safe(c.contatos) - snapshot.leads_ontem) / Math.max(1, snapshot.leads_ontem)) * 100;
  }

  // Determinar tendência
  const cplPiorando = cplDelta !== undefined && cplDelta >= B.DEGRADACAO_RAPIDA_CPL;
  const ctrCaindo   = ctrDelta !== undefined && ctrDelta <= B.DEGRADACAO_RAPIDA_CTR;
  const urgenciaExtra = cplPiorando || ctrCaindo;

  let tendencia: VelocidadeDegradacao["tendencia"] = "estavel";
  if (cplPiorando && ctrCaindo) tendencia = "piorando_rapido";
  else if (cplPiorando || ctrCaindo) tendencia = "piorando";
  else if (cplDelta !== undefined && cplDelta < -10) tendencia = "melhorando";

  return { temDados: true, cplDelta, ctrDelta, leadsDelta, tendencia, urgenciaExtra };
}

// ── Urgência ──────────────────────────────────────────────────────────────────
function calcUrgencia(
  score: number, roas: number, gasto: number, leads: number,
  lucro: number, margem: number, sat: number,
  degradacao: VelocidadeDegradacao
): { nivel: UrgenciaNivel; label: string; indicePrioridade: number } {
  // CRÍTICO com degradação rápida — urgência máxima
  if (degradacao.tendencia === "piorando_rapido" && score < 60) {
    return { nivel: "critico", label: "Degradando rápido", indicePrioridade: clamp(95 + gasto / 100) };
  }
  if ((leads === 0 && gasto > 100) || (roas < B.ROAS_MINIMO && gasto > 200)) {
    const ip = clamp(80 + gasto / 50 + (degradacao.urgenciaExtra ? 10 : 0));
    return { nivel: "critico", label: "Ação imediata", indicePrioridade: ip };
  }
  if (score < 40 && gasto > 100) {
    return { nivel: "critico", label: "Ação imediata", indicePrioridade: clamp(70 + (degradacao.urgenciaExtra ? 15 : 0)) };
  }
  if (score >= 80 && roas >= B.ROAS_ESCALA && margem >= B.MARGEM_ALVO) {
    return { nivel: "oportunidade", label: "Escalar agora", indicePrioridade: clamp(60 + roas * 5) };
  }
  if (sat >= 60 || score < 60 || degradacao.tendencia === "piorando") {
    const ip = clamp(40 + (60 - score) + (degradacao.urgenciaExtra ? 10 : 0));
    return { nivel: "atencao", label: degradacao.tendencia === "piorando" ? "Tendência negativa" : "Monitorar", indicePrioridade: ip };
  }
  return { nivel: "estavel", label: "Estável", indicePrioridade: clamp(score / 3) };
}

// ── Narrativa ─────────────────────────────────────────────────────────────────
function gerarNarrativa(
  c: CampanhaInput, score: number, roas: number, cpl: number, lucro: number,
  margem: number, ctr: number, ctrReal: boolean, fr: number, pctBudget: number,
  media: MediaConta | null, ce: number, sat: number, alav: number,
  urgencia: UrgenciaNivel, degradacao: VelocidadeDegradacao
): { texto: string; tipo: "sucesso" | "atencao" | "risco" | "neutro" } {
  const dias  = diasAtivo(c);
  const leads = safe(c.contatos);
  const gasto = safe(c.gasto_total);
  const margemPct = (margem * 100).toFixed(0);

  // Degradação rápida tem prioridade na narrativa
  if (degradacao.temDados && degradacao.tendencia === "piorando_rapido") {
    const partes: string[] = [];
    if (degradacao.cplDelta !== undefined && degradacao.cplDelta > 0) {
      partes.push(`CPL subiu ${degradacao.cplDelta.toFixed(0)}% na semana`);
    }
    if (degradacao.ctrDelta !== undefined && degradacao.ctrDelta < 0) {
      partes.push(`CTR caiu ${Math.abs(degradacao.ctrDelta).toFixed(0)}%`);
    }
    return { texto: `⚡ ${partes.join(" e ")} — performance deteriorando rapidamente. Intervenção urgente.`, tipo: "risco" };
  }
  if (degradacao.temDados && degradacao.tendencia === "piorando" && score < 60) {
    const parte = degradacao.cplDelta !== undefined && degradacao.cplDelta > 0
      ? `CPL crescendo ${degradacao.cplDelta.toFixed(0)}% na semana`
      : `CTR caindo ${Math.abs(degradacao.ctrDelta ?? 0).toFixed(0)}%`;
    return { texto: `Tendência negativa — ${parte}. Monitorar e ajustar antes que piore.`, tipo: "atencao" };
  }

  if (urgencia === "critico" && leads === 0 && gasto > 50) {
    return { texto: `R$${gasto.toFixed(0)} investidos sem nenhum resultado. Cada dia sem ação é budget queimado.`, tipo: "risco" };
  }
  if (urgencia === "critico" && roas < B.ROAS_MINIMO) {
    return { texto: `ROAS ${roas.toFixed(2)}× — operando no prejuízo. Prejuízo estimado R$${Math.abs(lucro).toFixed(0)} no período.`, tipo: "risco" };
  }
  if (urgencia === "oportunidade") {
    const delta = media?.cpl && cpl > 0 ? Math.round(((media.cpl - cpl) / media.cpl) * 100) : null;
    return {
      texto: `Margem ${margemPct}% com ROAS ${roas.toFixed(2)}×.${delta && delta > 10 ? ` CPL ${delta}% abaixo da média da conta.` : ""} Budget com ${(100 - pctBudget).toFixed(0)}% disponível.`,
      tipo: "sucesso",
    };
  }
  if (ce >= 75 && sat < 30 && dias <= 14) {
    return { texto: `Criativo performando bem${ctrReal ? ` — CTR ${ctr.toFixed(1)}%` : ""}. Frequência ${fr.toFixed(1)}× controlada. Bom momento para expandir.`, tipo: "sucesso" };
  }
  if (sat >= 60) {
    return { texto: `Frequência ${fr.toFixed(1)}× em ${dias} dias — audiência saturando. Renovar criativo ou expandir público.`, tipo: "atencao" };
  }
  if (media?.cpl && cpl > media.cpl * 1.3 && cpl > 0) {
    const pct = Math.round(((cpl - media.cpl) / media.cpl) * 100);
    return { texto: `CPL R$${cpl.toFixed(0)} está ${pct}% acima da média da conta. Margem atual: ${margemPct}%.`, tipo: "atencao" };
  }
  if (score >= 60) {
    return { texto: `Performance estável. Margem ${margemPct}% com ROAS ${roas.toFixed(2)}× e CPL R$${cpl > 0 ? cpl.toFixed(0) : "—"}.`, tipo: "neutro" };
  }
  return { texto: `Score ${score}/100 — revisar métricas. Margem atual ${margemPct}%.`, tipo: "atencao" };
}

// ── Flags ─────────────────────────────────────────────────────────────────────
export function calcularFlags(
  c: CampanhaInput,
  media: MediaConta | null = null,
  snapshot?: SnapshotHistorico,
  ticket = 450, conv = 0.04,
  params?: EngineParams
): Flag[] {
  const g = safe(c.gasto_total), l = safe(c.contatos), orc = safe(c.orcamento);
  const fr = safe(c.frequencia);
  const { ctr, real } = resolverCTR(c);
  const cpl    = l > 0 ? g / l : 0;
  const receita = params ? calcReceita(l, g, params) : l * conv * ticket;
  const lucro  = receita - g;
  const margem = receita > 0 ? lucro / receita : 0;
  const roas   = g > 0 ? receita / g : 0;
  const pct    = orc > 0 ? (g / orc) * 100 : 0;
  const score  = scoreCampanha(c, ticket, conv);
  const ce     = creativeEfficiency(c);
  const sat    = saturacaoReal(c);
  const alav   = indiceAlavancagem(c, score, ticket, conv);
  const deg    = calcDegradacao(c, snapshot, cpl);
  const flags: Flag[] = [];

  // Flag de degradação rápida — tem prioridade visual
  if (deg.temDados && (deg.tendencia === "piorando_rapido" || deg.tendencia === "piorando")) {
    const partes: string[] = [];
    if (deg.cplDelta && deg.cplDelta > 0) partes.push(`CPL +${deg.cplDelta.toFixed(0)}%`);
    if (deg.ctrDelta && deg.ctrDelta < 0) partes.push(`CTR ${deg.ctrDelta.toFixed(0)}%`);
    flags.push({
      tipo: "degradando_rapido",
      label: deg.tendencia === "piorando_rapido" ? "Degradando rápido" : "Tendência negativa",
      descricao: partes.join(" · ") + " na semana",
      cor: deg.tendencia === "piorando_rapido" ? "red" : "amber",
    });
  }

  if (roas >= B.ROAS_ESCALA && cpl > 0 && cpl < B.CPL_BOM && score >= B.SCORE_ESCALA && alav >= 50) {
    flags.push({ tipo: "escala", label: "Escalar agora", descricao: `ROAS ${roas.toFixed(2)}× · Margem ${(margem*100).toFixed(0)}% · Headroom ${alav}%`, cor: "emerald" });
  }
  if (ce >= 75 && !flags.some(f => f.tipo === "escala")) {
    flags.push({ tipo: "criativo_forte", label: "Criativo forte", descricao: `Creative Efficiency: ${ce}/100`, cor: "purple" });
  }
  if (ce < 35 && fr >= B.FREQ_ATENCAO && real) {
    flags.push({ tipo: "fadiga_criativa", label: "Fadiga criativa", descricao: `CTR ${ctr.toFixed(1)}% com freq ${fr.toFixed(1)}×`, cor: "amber" });
  }
  if (l === 0 && g > 50) {
    flags.push({ tipo: "sem_leads", label: "Sem resultados", descricao: `R$${g.toFixed(0)} sem nenhum lead`, cor: "red" });
  }
  if (roas < B.ROAS_MINIMO && g > 0 && l > 0) {
    flags.push({ tipo: "risco", label: "Operando no prejuízo", descricao: `ROAS ${roas.toFixed(2)}× · Prejuízo R$${Math.abs(lucro).toFixed(0)}`, cor: "red" });
  }
  if (sat >= 60) {
    flags.push({ tipo: "saturacao", label: sat >= 80 ? "Saturação crítica" : "Audiência saturando", descricao: `Índice de saturação ${sat}/100`, cor: sat >= 80 ? "red" : "amber" });
  }
  if (pct > B.BUDGET_ATENCAO) {
    flags.push({ tipo: "budget_critico", label: pct > B.BUDGET_CRITICO ? "Budget esgotando" : "Budget alto", descricao: `${pct.toFixed(0)}% consumido`, cor: pct > B.BUDGET_CRITICO ? "red" : "amber" });
  }
  if (alav >= 75 && !flags.some(f => f.tipo === "escala") && score >= 60) {
    flags.push({ tipo: "alavancagem_alta", label: "Potencial de escala", descricao: `Headroom ${alav}/100`, cor: "purple" });
  }
  return flags;
}

// ── Resumo em 1 frase ─────────────────────────────────────────────────────────
function gerarResumoFrase(
  nCriticas: number, nEscala: number, nSaturadas: number, nDegradando: number,
  lucroEmRisco: number, lucroPotencial: number, margemMedia: number
): string {
  const partes: string[] = [];
  if (nCriticas > 0) partes.push(`${nCriticas} campanha${nCriticas > 1 ? "s" : ""} queimando orçamento`);
  if (nDegradando > 0 && nDegradando !== nCriticas) partes.push(`${nDegradando} com tendência negativa`);
  if (nSaturadas > 0) partes.push(`${nSaturadas} entrando em saturação`);
  if (nEscala > 0) partes.push(`${nEscala} pronta${nEscala > 1 ? "s" : ""} para escalar`);

  const financeiro: string[] = [];
  if (lucroEmRisco > 10) financeiro.push(`−R$${lucroEmRisco.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} lucro em risco`);
  if (lucroPotencial > 10) financeiro.push(`+R$${lucroPotencial.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} potencial`);

  if (partes.length === 0 && financeiro.length === 0) {
    return `Operação estável com margem média de ${(margemMedia * 100).toFixed(1)}%. Nenhuma ação urgente.`;
  }

  const base = partes.length > 0 ? partes.join(", ") : "Operação com pontos de atenção";
  const fin  = financeiro.length > 0 ? `. ${financeiro.join(" · ")}.` : ".";
  return `${base.charAt(0).toUpperCase() + base.slice(1)}${fin}`;
}

// ── Health Score global ───────────────────────────────────────────────────────
export function calcularHealth(
  campanhas: CampanhaInput[],
  snapshots: SnapshotHistorico[] = [],
  ticket = 450,
  conv = 0.04,
  params?: EngineParams
): HealthResult {
  const snapshotMap = Object.fromEntries(snapshots.map(s => [s.campanha_id, s]));

  const VAZIO: HealthResult = {
    score: 0, label: "Sem dados", corLabel: "text-white/30",
    urgenciaGlobal: "estavel", urgenciaLabel: "Sem dados", resumoFrase: "Sem campanhas no período.",
    dinheiroEmRisco: 0, lucroEmRisco: 0, margemMedia: 0,
    oportunidadeEscala: 0,
    perdaProjetada7d: 0, lucroPerda7d: 0, ganhoProjetado7d: 0, lucroPotencial7d: 0,
    projecao72h: { lucroEmRisco72h: 0, lucroPotencial72h: 0, receiaEmRisco72h: 0, receitaPotencial72h: 0, campanhasCriticas: [], campanhasOportunidade: [] },
    cplMedio: 0, roasMedio: 0,
    mediaConta: { cpl: 0, ctr: 0, roas: 0, cpm: 0, freq: 0, margem: 0 },
    campanhasProblema: 0, campanhasEscala: 0, campanhasSaturacao: 0, campanhasDegradando: 0,
    radar: [], recomendacoes: [], flagsPorCampanha: {}, scoresPorCampanha: {}, enriched: [],
  };
  if (campanhas.length === 0) return VAZIO;

  // Pass 1: média da conta
  const pre = campanhas.map(c => {
    const g = safe(c.gasto_total), l = safe(c.contatos);
    const imp = safe(c.impressoes), alc = safe(c.alcance);
    const { ctr } = resolverCTR(c);
    const fr   = safe(c.frequencia) || (alc > 0 && imp > 0 ? imp / alc : 0);
    const cpm  = imp > 0 ? (g / imp) * 1000 : 0;
    const rec  = params ? calcReceita(l, g, params) : l * conv * ticket;
    const luc  = rec - g;
    const roas = g > 0 ? rec / g : 0;
    const cpl  = l > 0 ? g / l : 0;
    const mar  = rec > 0 ? luc / rec : 0;
    return { g, l, rec, luc, roas, cpl, ctr, fr, cpm, mar };
  });

  const totalG   = pre.reduce((s, c) => s + c.g, 0);
  const totalL   = pre.reduce((s, c) => s + c.l, 0);
  const totalRec = pre.reduce((s, c) => s + c.rec, 0);
  const totalLuc = pre.reduce((s, c) => s + c.luc, 0);
  const comCtr = pre.filter(c => c.ctr > 0);
  const comCpm = pre.filter(c => c.cpm > 0);
  const comFr  = pre.filter(c => c.fr  > 0);

  const media: MediaConta = {
    cpl:    totalL > 0 ? totalG / totalL : 0,
    ctr:    comCtr.length > 0 ? comCtr.reduce((s, c) => s + c.ctr, 0) / comCtr.length : 0,
    roas:   totalG > 0 ? totalRec / totalG : 0,
    cpm:    comCpm.length > 0 ? comCpm.reduce((s, c) => s + c.cpm, 0) / comCpm.length : 0,
    freq:   comFr.length  > 0 ? comFr.reduce((s, c)  => s + c.fr,  0) / comFr.length  : 0,
    margem: totalRec > 0 ? totalLuc / totalRec : 0,
  };

  // Pass 2: enriquecer
  const enriched: CampanhaEnriquecidaAlgo[] = campanhas.map((c, i) => {
    const { g, l, rec, luc, roas, cpl, ctr, fr, cpm, mar } = pre[i];
    const { real: ctrReal } = resolverCTR(c);
    const orc   = safe(c.orcamento);
    const pct   = orc > 0 ? (g / orc) * 100 : 0;
    const snap  = snapshotMap[c.id];
    const score = scoreCampanha(c, ticket, conv, params);
    const ce    = creativeEfficiency(c);
    const sat   = saturacaoReal(c);
    const alav  = indiceAlavancagem(c, score, ticket, conv);
    const deg   = calcDegradacao(c, snap, cpl);
    const flags = calcularFlags(c, media, snap, ticket, conv, params);
    const { nivel: urgNivel, label: urgLabel, indicePrioridade } =
      calcUrgencia(score, roas, g, l, luc, mar, sat, deg);
    const { texto: nar, tipo: narTipo } = gerarNarrativa(
      c, score, roas, cpl, luc, mar, ctr, ctrReal, fr, pct,
      media, ce, sat, alav, urgNivel, deg
    );

    return {
      id: c.id, nome_campanha: c.nome_campanha,
      gasto: g, leads: l, receita: rec, lucro: luc, margem: mar,
      roas, cpl, ctr, ctrReal, freq: fr, cpm,
      score, flags, diasAtivo: diasAtivo(c), alavancagem: alav,
      scores: {
        creativeEfficiency: ce, saturacaoReal: sat, alavancagem: alav,
        narrativa: nar, narrativaTipo: narTipo,
        urgencia: urgNivel, urgenciaLabel: urgLabel, indicePrioridade, degradacao: deg,
      },
    };
  });

  const scoreGlobal = totalG > 0
    ? clamp(enriched.reduce((s, c) => s + c.score * c.gasto, 0) / totalG)
    : clamp(enriched.reduce((s, c) => s + c.score, 0) / enriched.length);

  const label    = scoreGlobal >= 75 ? "Saudável" : scoreGlobal >= 50 ? "Atenção" : "Crítico";
  const corLabel = scoreGlobal >= 75 ? "text-emerald-400" : scoreGlobal >= 50 ? "text-amber-400" : "text-red-400";

  const urgenciaGlobal: UrgenciaNivel =
    enriched.some(c => c.scores.urgencia === "critico")     ? "critico" :
    enriched.some(c => c.scores.urgencia === "atencao")     ? "atencao" :
    enriched.some(c => c.scores.urgencia === "oportunidade") ? "oportunidade" : "estavel";
  const urgenciaLabel =
    urgenciaGlobal === "critico"     ? "Ação imediata necessária" :
    urgenciaGlobal === "atencao"     ? "Requer atenção" :
    urgenciaGlobal === "oportunidade"? "Oportunidade de escala" : "Operação estável";

  const problema    = enriched.filter(c => c.score < 40);
  const escalaReady = enriched.filter(c => c.roas >= B.ROAS_ESCALA && c.cpl > 0 && c.cpl < B.CPL_BOM && c.score >= B.SCORE_ESCALA);
  const saturadas   = enriched.filter(c => c.scores.saturacaoReal >= 60);
  const degradando  = enriched.filter(c => c.scores.degradacao.tendencia === "piorando" || c.scores.degradacao.tendencia === "piorando_rapido");

  const dinheiroEmRisco    = problema.reduce((s, c) => s + c.gasto, 0);
  const lucroEmRisco       = problema.reduce((s, c) => s + Math.abs(Math.min(0, c.lucro)), 0);
  const oportunidadeEscala = escalaReady.reduce((s, c) => s + c.gasto * 0.2, 0);
  const margemMedia        = totalRec > 0 ? totalLuc / totalRec : 0;

  // Projeções 7d
  const perdaProjetada7d = problema.reduce((s, c) => {
    const daily = c.gasto / Math.max(1, c.diasAtivo);
    return s + daily * 7 * Math.max(0, 1 - c.roas);
  }, 0);
  const lucroPerda7d = problema.reduce((s, c) => {
    const daily = Math.abs(Math.min(0, c.lucro)) / Math.max(1, c.diasAtivo);
    return s + daily * 7;
  }, 0);
  const ganhoProjetado7d  = escalaReady.reduce((s, c) => s + c.gasto * 0.2 * c.roas, 0);
  const lucroPotencial7d  = escalaReady.reduce((s, c) => s + (c.gasto * 0.2 * c.roas) - (c.gasto * 0.2), 0);

  // ── Projeção 72h (3 dias = 3/7 da projeção semanal) ──────────────────────
  const fator72h = 3 / 7;
  const projecao72h: Projecao72h = {
    receiaEmRisco72h:   perdaProjetada7d * fator72h,
    lucroEmRisco72h:    lucroPerda7d * fator72h,
    receitaPotencial72h: ganhoProjetado7d * fator72h,
    lucroPotencial72h:  lucroPotencial7d * fator72h,
    campanhasCriticas:  problema.map(c => c.nome_campanha),
    campanhasOportunidade: escalaReady.map(c => c.nome_campanha),
  };

  // Resumo em 1 frase
  const resumoFrase = gerarResumoFrase(
    problema.length, escalaReady.length, saturadas.length, degradando.length,
    lucroEmRisco, Math.max(0, lucroPotencial7d), margemMedia
  );

  // Radar
  const radar: RadarItem[] = [];
  if (escalaReady.length > 0) radar.push({ tipo: "escala", campanhas: escalaReady.map(c => c.nome_campanha), count: escalaReady.length, valorEmJogo: oportunidadeEscala, mensagem: `${escalaReady.length} campanha${escalaReady.length > 1 ? "s prontas" : " pronta"} para escalar` });
  if (problema.length > 0)    radar.push({ tipo: "critico", campanhas: problema.map(c => c.nome_campanha), count: problema.length, valorEmJogo: dinheiroEmRisco, mensagem: `${problema.length} campanha${problema.length > 1 ? "s queimando" : " queimando"} orçamento` });
  if (saturadas.length > 0)   radar.push({ tipo: "saturacao", campanhas: saturadas.map(c => c.nome_campanha), count: saturadas.length, valorEmJogo: saturadas.reduce((s, c) => s + c.gasto, 0), mensagem: `${saturadas.length} campanha${saturadas.length > 1 ? "s" : ""} entrando em saturação` });

  // Recomendações
  const recs: RecomendacaoAcao[] = [];
  const criticas = enriched.filter(c => c.scores.urgencia === "critico").sort((a, b) => b.scores.indicePrioridade - a.scores.indicePrioridade);
  if (criticas[0]) {
    const c = criticas[0];
    const perda = (c.gasto / Math.max(1, c.diasAtivo)) * 30 * Math.max(0, 1 - c.roas);
    recs.push({ prioridade: 1, acao: "Pausar imediatamente", campanha: c.nome_campanha, impacto: `Evita ~R$${perda.toFixed(0)}/mês em budget sem retorno`, impactoFinanceiro: perda, lucroPotencial: Math.abs(Math.min(0, c.lucro)), tipo: "pausar" });
  }
  const melhorEscala = [...escalaReady].sort((a, b) => b.roas * b.alavancagem - a.roas * a.alavancagem)[0];
  if (melhorEscala) {
    const extraRec = melhorEscala.gasto * 0.2 * melhorEscala.roas;
    const extraLuc = extraRec - melhorEscala.gasto * 0.2;
    recs.push({ prioridade: recs.length === 0 ? 1 : 2, acao: "Escalar budget em 20%", campanha: melhorEscala.nome_campanha, impacto: `+R$${extraRec.toFixed(0)} receita · +R$${extraLuc.toFixed(0)} lucro líquido`, impactoFinanceiro: extraRec, lucroPotencial: Math.max(0, extraLuc), tipo: "escalar" });
  }
  const fadiga = enriched.filter(c => c.flags.some(f => f.tipo === "fadiga_criativa")).sort((a, b) => b.gasto - a.gasto)[0];
  if (fadiga) {
    recs.push({ prioridade: recs.length < 2 ? 2 : 3, acao: "Renovar criativo", campanha: fadiga.nome_campanha, impacto: `CTR em queda com freq ${fadiga.freq.toFixed(1)}× — novo criativo pode dobrar resultados`, impactoFinanceiro: fadiga.gasto * 0.3, lucroPotencial: fadiga.gasto * 0.3 * Math.max(0, fadiga.roas - 1), tipo: "criativo" });
  }
  recs.sort((a, b) => b.impactoFinanceiro - a.impactoFinanceiro);
  recs.forEach((r, i) => { r.prioridade = (i + 1) as 1 | 2 | 3; });

  const flagsPorCampanha: Record<string, Flag[]>           = {};
  const scoresPorCampanha: Record<string, ScoresAvancados> = {};
  enriched.forEach(c => { flagsPorCampanha[c.id] = c.flags; scoresPorCampanha[c.id] = c.scores; });

  return {
    score: scoreGlobal, label, corLabel,
    urgenciaGlobal, urgenciaLabel, resumoFrase,
    dinheiroEmRisco, lucroEmRisco, margemMedia,
    oportunidadeEscala,
    perdaProjetada7d: Math.max(0, perdaProjetada7d),
    lucroPerda7d: Math.max(0, lucroPerda7d),
    ganhoProjetado7d: Math.max(0, ganhoProjetado7d),
    lucroPotencial7d: Math.max(0, lucroPotencial7d),
    projecao72h,
    cplMedio: media.cpl, roasMedio: media.roas, mediaConta: media,
    campanhasProblema: problema.length, campanhasEscala: escalaReady.length,
    campanhasSaturacao: saturadas.length, campanhasDegradando: degradando.length,
    radar, recomendacoes: recs.slice(0, 3),
    flagsPorCampanha, scoresPorCampanha, enriched,
  };
}

// ── Simulação de escala (para modal de decisão) ───────────────────────────────
export interface SimulacaoEscala {
  investimentoExtra: number;
  receitaExtra: number;
  lucroExtra: number;
  margemProjetada: number;
  roasMantem: number;
  avisos: string[];
}

export function simularEscala(
  c: CampanhaInput,
  percentualEscala = 0.2,
  ticket = 450,
  conv = 0.04,
  params?: EngineParams
): SimulacaoEscala {
  const g = safe(c.gasto_total), l = safe(c.contatos);
  const sat = saturacaoReal(c);
  const fr  = safe(c.frequencia);

  const cplAtual    = l > 0 ? g / l : 0;
  const investExtra = g * percentualEscala;
  // Leads extras estimados baseados no CPL atual (com penalidade por saturação)
  const fatorSat    = sat >= 60 ? 0.7 : sat >= 40 ? 0.85 : 1.0;
  const leadsExtras = cplAtual > 0 ? (investExtra / cplAtual) * fatorSat : 0;
  const recExtra    = params ? calcReceita(leadsExtras, investExtra, params) : leadsExtras * conv * ticket;
  const lucExtra    = recExtra - investExtra;
  const recTotal    = (l * conv * ticket) + recExtra;
  const gastoTotal  = g + investExtra;
  const margProj    = recTotal > 0 ? (recTotal - gastoTotal) / recTotal : 0;
  const roasMantem  = gastoTotal > 0 ? recTotal / gastoTotal : 0;

  const avisos: string[] = [];
  if (sat >= 60) avisos.push("Audiência saturando — escala pode elevar CPL");
  if (fr > B.FREQ_ATENCAO) avisos.push(`Frequência ${fr.toFixed(1)}× — considerar novo público antes de escalar`);
  if (lucExtra < 0) avisos.push("Retorno projetado abaixo do investimento extra");

  return {
    investimentoExtra: investExtra,
    receitaExtra: Math.max(0, recExtra),
    lucroExtra: lucExtra,
    margemProjetada: margProj,
    roasMantem,
    avisos,
  };
}