/**
 * algoritmoErizon.ts — v6.2
 * Exporta todos os tipos que os componentes precisam:
 *   HealthResult, CampanhaEnriquecidaAlgo, RecomendacaoAcao,
 *   Flag, ScoresAvancados, RadarItem, MediaConta (com freq/cpm/ctr)
 */

// Objetivos Meta → tipo interno Erizon
export type TipoCampanha = "leads" | "trafego" | "conversao" | "awareness" | "outro";

/**
 * Resolve o tipo da campanha.
 * Prioridade: nome da campanha > objective Meta > métricas.
 * O nome tem prioridade porque o gestor nomeia com intenção
 * (ex: "BOUND – ALCANCE" deve ser awareness, não leads).
 */
export function resolverTipo(
  objective?: string | null,
  contatos?: number,
  cliques?: number,
  nomeCampanha?: string | null,
  impressoes?: number,
  gasto?: number
): TipoCampanha {
  // 1. Detecção pelo nome (maior confiança — gestor nomeia com intenção)
  if (nomeCampanha) {
    const n = nomeCampanha.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/alcance|reach|awareness|reconhecimento|cobertura/.test(n)) return "awareness";
    if (/trafego|trafego|traffic|visita|clique|link/.test(n))       return "trafego";
    if (/lead|leads|cadastro|formulario|captacao|contato/.test(n))  return "leads";
    if (/venda|vendas|conversao|conversao|compra|checkout/.test(n)) return "conversao";
  }

  // 2. Objective do Meta
  if (objective) {
    const o = objective.toUpperCase();
    if (o === "OUTCOME_LEADS"    || o.includes("LEAD")    || o === "LEAD_GENERATION") return "leads";
    if (o === "OUTCOME_TRAFFIC"  || o === "LINK_CLICKS"   || o.includes("TRAFFIC"))   return "trafego";
    if (o === "OUTCOME_SALES"    || o === "CONVERSIONS"   || o.includes("PURCHASE"))  return "conversao";
    if (o === "OUTCOME_AWARENESS"|| o === "REACH"         || o === "BRAND_AWARENESS"
                                  || o.includes("AWARENESS"))                          return "awareness";
    if (o === "OUTCOME_ENGAGEMENT" || o.includes("ENGAGEMENT")) {
      if ((contatos ?? 0) > 0) return "leads";
      if ((cliques  ?? 0) > 0) return "trafego";
      return "awareness";
    }
  }

  // 3. Heurística por métricas — quando nome é genérico (ex: "BRUNA – MEGA HAIR")
  //    e não tem objective salvo no banco ainda
  const c = contatos ?? 0;
  const cl = cliques ?? 0;
  const imp = impressoes ?? 0;
  const g = gasto ?? 0;

  // Tem leads → campanha de leads
  if (c > 0) return "leads";
  // Tem cliques mas sem leads → tráfego
  if (cl > 0 && c === 0) return "trafego";
  // Tem impressões mas sem cliques → awareness
  if (imp > 100) return "awareness";
  // Tem gasto mas zero de tudo → ainda não tem dados, trata como awareness
  // para não penalizar por "sem leads"
  if (g > 0 && c === 0 && cl === 0) return "awareness";

  return "outro";
}

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
  objective?: string | null;
}

export interface SnapshotHistorico {
  campanha_id: string;
  cpl_semana?: number;
  ctr_semana?: number;
  leads_ontem?: number;
  // Campos adicionais do banco (campaign_snapshots_daily)
  created_at?: string;
  gasto_ontem?: number;
  cpl_ontem?: number;
}

export type UrgenciaNivel = "critico" | "atencao" | "estavel" | "oportunidade";

export interface EngineParams {
  ticket: number;
  conv: number;
  valorLeadQualificado: number;
  usarValorLead: boolean;
}

export interface Flag {
  label: string;
  descricao: string;
  cor: "emerald" | "red" | "amber" | "purple";
  tipo: "escala" | "risco" | "atencao" | "info";
}

export interface ScoresAvancados {
  urgencia: UrgenciaNivel;
  urgenciaLabel: string;
  score: number;
  roas: number;
  cpl: number;
  margem: number;
  narrativa: string;
  narrativaTipo: "sucesso" | "atencao" | "risco" | "neutro";
  creativeEfficiency: number;
  saturacaoReal: number;
  alavancagem: number;
  indicePrioridade: number;
  degradacao: {
    tendencia: "piorando_rapido" | "piorando" | "estavel" | "melhorando";
    temDados: boolean;
  };
}

export interface ScoresCampanha {
  urgencia: UrgenciaNivel;
  score: number;
  roas: number;
  cpl: number;
  margem: number;
}

export interface CampanhaEnriquecida {
  id: string;
  nome_campanha: string;
  gasto: number;
  leads: number;
  receita: number;
  lucro: number;
  margem: number;
  roas: number;
  cpl: number;
  score: number;
  diasAtivo: number;
  alavancagem: number;
  scores: ScoresCampanha;
}

// Alias para compatibilidade com componentes legados
export type CampanhaEnriquecidaAlgo = CampanhaEnriquecida & {
  scores: ScoresCampanha & {
    creativeEfficiency: number;
    saturacaoReal: number;
    indicePrioridade: number;
    degradacao: { tendencia: string; temDados: boolean };
  };
};

export interface RecomendacaoAcao {
  tipo: "pausar" | "escalar" | "criativo" | "budget" | "segmentacao";
  prioridade: number;
  campanha: string;
  campanhaId: string;
  acao: string;
  impacto: string;
  lucroPotencial: number;
}

export interface MediaConta {
  roas: number;
  cpl: number;
  score: number;
  margem: number;
  freq: number;
  cpm: number;
  ctr: number;
}

export interface RadarItem {
  tipo: "escala" | "critico" | "saturacao";
  mensagem: string;
  valorEmJogo: number;
}

export interface SimulacaoEscala {
  budgetAtual: number;
  budgetProposto: number;
  fatorEscala: number;
  leadsAtuais: number;
  leadsProjetados: number;
  receitaAtual: number;
  receitaProjetada: number;
  lucroAtual: number;
  lucroProjetado: number;
  roasAtual: number;
  roasProjetado: number;
  cplAtual: number;
  cplProjetado: number;
  alertaFrequencia: boolean;
  recomendacao: string;
  viavel: boolean;
  investimentoExtra: number;
  receitaExtra: number;
  lucroExtra: number;
  roasMantem: number;
  margemProjetada: number;
  avisos: string[];
}

export interface ContaHealth {
  score: number;
  nivel: "critico" | "atencao" | "estavel" | "saudavel";
  criticas: number;
  oportunidades: number;
  totalCampanhas: number;
  lucroEmRisco: number;
  lucroPotencial: number;
  resumo: string;
  enriched: CampanhaEnriquecida[];
  flagsPorCampanha: Record<string, string[]>;
  scoresPorCampanha: Record<string, ScoresCampanha>;
  mediaConta: MediaConta;
  campanhasProblema: number;
  roasMedio: number;
  lucroPerda7d: number;
  urgenciaGlobal: UrgenciaNivel;
  label: string;
  corLabel: string;
  margemMedia: number;
  dinheiroEmRisco: number;
  oportunidadeEscala: number;
  campanhasEscala: number;
  campanhasDegradando: number;
  perdaProjetada7d: number;
  ganhoProjetado7d: number;
  lucroPotencial7d: number;
  resumoFrase: string;
  recomendacoes: RecomendacaoAcao[];
  radar: RadarItem[];
  projecao72h: { lucroEmRisco72h: number; lucroPotencial72h: number };
}

// Alias para compatibilidade total
export type HealthResult = ContaHealth;

const B = {
  ROAS_MINIMO:  1.5, ROAS_ESCALA: 2.5,
  CTR_BAIXO:    0.9, CTR_BOM:     2.0,
  FREQ_ATENCAO: 2.5, FREQ_CRITICA: 3.5,
  CPL_CRITICO:  80,  CPL_BOM:     30,
  MARGEM_ALVO:  0.3,
};

function safe(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? Math.max(0, n) : 0;
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function resolverCTR(c: CampanhaInput) {
  const imp = safe(c.impressoes), cli = safe(c.cliques);
  if (cli > 0 && imp > 0) return (cli / imp) * 100;
  return safe(c.ctr);
}

export function resolverEngineParams(config?: {
  ticket_medio_cliente?: number | null;
  ticket_medio_global?: number | null;
  taxa_conversao?: number | null;
  valor_lead_qualificado?: number | null;
}): EngineParams {
  const ticket    = config?.ticket_medio_cliente ?? config?.ticket_medio_global ?? 450;
  const conv      = config?.taxa_conversao ?? 0.04;
  const valorLead = config?.valor_lead_qualificado ?? 0;
  return { ticket, conv, valorLeadQualificado: valorLead, usarValorLead: valorLead > 0 };
}

function calcReceita(leads: number, params: EngineParams) {
  if (params.usarValorLead) return leads * params.valorLeadQualificado;
  return leads * params.conv * params.ticket;
}

function calcScore(c: CampanhaInput, receita: number) {
  const tipo  = resolverTipo(c.objective, safe(c.contatos), safe(c.cliques), c.nome_campanha, safe(c.impressoes), safe(c.gasto_total));
  const gasto = safe(c.gasto_total), leads = safe(c.contatos);
  const freq  = safe(c.frequencia),  ctr   = resolverCTR(c);
  const cpl   = leads > 0 ? gasto / leads : 0;
  const roas  = gasto > 0 ? receita / gasto : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cpm   = safe((c as any).cpm);
  const cliques = safe(c.cliques);
  let s = 100;

  if (tipo === "leads") {
    // Penaliza CPL alto e ausência de leads
    if (cpl > B.CPL_CRITICO)        s -= 25;
    else if (cpl > B.CPL_BOM)       s -= 10;
    if (leads === 0 && gasto > 100) s -= 30;
    if (roas < B.ROAS_MINIMO)       s -= 25;
  } else if (tipo === "trafego") {
    // Métrica principal: CTR e CPC — não penaliza ausência de leads
    if (ctr > 0 && ctr < B.CTR_BAIXO) s -= 30;
    if (ctr === 0 && gasto > 50)       s -= 20;
    if (cliques === 0 && gasto > 50)   s -= 25;
    // CPM alto em tráfego é sinal ruim
    if (cpm > 80)  s -= 15;
    else if (cpm > 50) s -= 5;
  } else if (tipo === "conversao") {
    // ROAS é o KPI principal
    if (roas < 1)              s -= 40;
    else if (roas < B.ROAS_MINIMO) s -= 20;
    if (leads === 0 && gasto > 100) s -= 15; // conversões zeradas
  } else if (tipo === "awareness") {
    // CPM e frequência são as métricas — nunca penaliza leads
    if (cpm > 100) s -= 20;
    if (freq > B.FREQ_CRITICA) s -= 20;
    else if (freq > B.FREQ_ATENCAO) s -= 10;
  } else {
    // Fallback: comportamento original
    if (cpl > B.CPL_CRITICO)        s -= 25;
    else if (cpl > B.CPL_BOM)       s -= 10;
    if (roas < B.ROAS_MINIMO)       s -= 25;
    if (leads === 0 && gasto > 100) s -= 30;
  }

  // Penalidades universais (valem para todos os tipos)
  if (ctr > 0 && ctr < B.CTR_BAIXO && tipo !== "trafego" && tipo !== "awareness") s -= 15;
  if (freq > B.FREQ_CRITICA)                               s -= 10;
  return clamp(s);
}

function calcularUrgencia(score: number, roas: number, margem: number, tipo?: TipoCampanha): UrgenciaNivel {
  // Awareness e tráfego não têm ROAS como KPI — nunca marcar crítico por ROAS zerado
  const ignorarRoas = tipo === "awareness" || tipo === "trafego";
  if (score < 40 || (!ignorarRoas && roas < 1))                         return "critico";
  if (score >= 80 && (ignorarRoas || roas >= B.ROAS_ESCALA) && margem >= B.MARGEM_ALVO) return "oportunidade";
  if (score < 65)                                                        return "atencao";
  return "estavel";
}

function gerarNarrativa(nome: string, roas: number, margem: number, cpl: number, urgencia: UrgenciaNivel, tipo?: TipoCampanha) {
  const pct = (margem * 100).toFixed(0);
  if (urgencia === "critico") {
    if (tipo === "trafego")   return `Campanha ${nome} com tráfego ineficiente. Revise criativo e segmentação.`;
    if (tipo === "awareness") return `Campanha ${nome} com CPM elevado. Audiência pode estar saturada.`;
    return `Campanha ${nome} operando sob risco. ROAS ${roas.toFixed(2)}x e margem ${pct}%. Intervenção imediata recomendada.`;
  }
  if (urgencia === "oportunidade") {
    if (tipo === "trafego")   return `Campanha ${nome} com CTR forte. Considere aumentar orçamento.`;
    return `Campanha ${nome} com ROAS ${roas.toFixed(2)}x e margem ${pct}%. Cenário favorável para escala.`;
  }
  if (urgencia === "atencao") {
    if (tipo === "trafego")   return `Campanha ${nome} com CTR abaixo do esperado. Teste novos criativos.`;
    if (tipo === "awareness") return `Campanha ${nome} com frequência alta. Renove os criativos.`;
    return `Campanha ${nome} exige monitoramento. CPL atual R$${cpl.toFixed(0)}.`;
  }
  return `Campanha ${nome} operando dentro da estabilidade esperada.`;
}

function gerarFlags(c: CampanhaInput, urgencia: UrgenciaNivel, roas: number, cpl: number): string[] {
  const flags: string[] = [];
  const freq  = safe(c.frequencia), ctr = resolverCTR(c);
  const leads = safe(c.contatos),   gasto = safe(c.gasto_total);
  const tipo  = resolverTipo(c.objective, safe(c.contatos), safe(c.cliques), c.nome_campanha, safe(c.impressoes), safe(c.gasto_total));
  const ignorarRoas  = tipo === "awareness" || tipo === "trafego";
  const ehLeadsType  = tipo === "leads" || tipo === "conversao";

  if (urgencia === "critico")                                                     flags.push("CRÍTICA");
  if (urgencia === "oportunidade")                                                flags.push("ESCALAR");
  if (leads === 0 && gasto > 100 && ehLeadsType)                                 flags.push("SEM LEADS");
  if (!ignorarRoas && roas < B.ROAS_MINIMO && roas > 0)                          flags.push("ROAS BAIXO");
  if (cpl > B.CPL_CRITICO && ehLeadsType)                                        flags.push("CPL ALTO");
  if (freq > B.FREQ_CRITICA)                                                      flags.push("FREQ. CRÍTICA");
  else if (freq > B.FREQ_ATENCAO)                                                 flags.push("FREQ. ALTA");
  if (ctr > 0 && ctr < B.CTR_BAIXO)                                              flags.push("CTR BAIXO");
  return flags;
}

export function analisarCampanhas(campanhas: CampanhaInput[], params: EngineParams) {
  let lucroEmRisco = 0, lucroPotencial = 0;
  const resultados = campanhas.map(c => {
    const leads   = safe(c.contatos), gasto = safe(c.gasto_total);
    const receita = calcReceita(leads, params);
    const lucro   = receita - gasto;
    const margem  = receita > 0 ? lucro / receita : 0;
    const cpl     = leads > 0 ? gasto / leads : 0;
    const roas    = gasto > 0 ? receita / gasto : 0;
    const score   = calcScore(c, receita);
    const tipo    = resolverTipo(c.objective, safe(c.contatos), safe(c.cliques), c.nome_campanha, safe(c.impressoes), safe(c.gasto_total));
    const urgencia  = calcularUrgencia(score, roas, margem, tipo);
    const narrativa = gerarNarrativa(c.nome_campanha, roas, margem, cpl, urgencia, tipo);
    if (urgencia === "critico")      lucroEmRisco   += Math.abs(lucro);
    if (urgencia === "oportunidade") lucroPotencial += lucro;
    return { id: c.id, nome: c.nome_campanha, gasto, receita, lucro, margem, roas, cpl, score, urgencia, narrativa };
  });
  const resumo = lucroEmRisco === 0 && lucroPotencial === 0
    ? `Operação estável em ${resultados.length} campanhas. Nenhuma ação crítica identificada.`
    : `R$${lucroEmRisco.toLocaleString("pt-BR")} em risco e R$${lucroPotencial.toLocaleString("pt-BR")} de potencial identificados nas ${resultados.length} campanhas analisadas.`;
  return { resultados, lucroEmRisco, lucroPotencial, resumo };
}

export function calcularHealth(
  campanhas: CampanhaInput[],
  params: EngineParams | SnapshotHistorico[]
): ContaHealth {
  const ep: EngineParams = Array.isArray(params) ? resolverEngineParams() : params as EngineParams;
  const emptyMedia: MediaConta = { roas: 0, cpl: 0, score: 0, margem: 0, freq: 0, cpm: 0, ctr: 0 };

  const empty: ContaHealth = {
    score: 0, nivel: "atencao", criticas: 0, oportunidades: 0,
    totalCampanhas: 0, lucroEmRisco: 0, lucroPotencial: 0,
    resumo: "Nenhuma campanha para analisar.",
    enriched: [], flagsPorCampanha: {}, scoresPorCampanha: {},
    mediaConta: emptyMedia, campanhasProblema: 0, roasMedio: 0, lucroPerda7d: 0,
    urgenciaGlobal: "estavel", label: "Sem dados", corLabel: "text-white/40",
    margemMedia: 0, dinheiroEmRisco: 0, oportunidadeEscala: 0,
    campanhasEscala: 0, campanhasDegradando: 0,
    perdaProjetada7d: 0, ganhoProjetado7d: 0, lucroPotencial7d: 0,
    resumoFrase: "Nenhuma campanha para analisar.",
    recomendacoes: [], radar: [],
    projecao72h: { lucroEmRisco72h: 0, lucroPotencial72h: 0 },
  };

  if (campanhas.length === 0) return empty;

  const { resultados, lucroEmRisco, lucroPotencial } = analisarCampanhas(campanhas, ep);

  const criticas      = resultados.filter(r => r.urgencia === "critico").length;
  const oportunidades = resultados.filter(r => r.urgencia === "oportunidade").length;
  const estaveis      = resultados.filter(r => r.urgencia === "estavel").length;

  const scoreBase = resultados.reduce((s, r) => s + r.score, 0) / resultados.length;
  const score     = clamp(scoreBase - criticas * 8 + oportunidades * 5);

  let nivel: ContaHealth["nivel"];
  if (score < 40)      nivel = "critico";
  else if (score < 60) nivel = "atencao";
  else if (score < 80) nivel = "estavel";
  else                 nivel = "saudavel";

  const urgenciaGlobal: UrgenciaNivel =
    nivel === "critico"  ? "critico"      :
    nivel === "atencao"  ? "atencao"      :
    nivel === "saudavel" ? "oportunidade" : "estavel";

  const label =
    nivel === "critico"  ? "Conta em risco"   :
    nivel === "atencao"  ? "Requer atenção"   :
    nivel === "saudavel" ? "Conta saudável"   : "Operação estável";

  const corLabel =
    nivel === "critico"  ? "text-red-400"     :
    nivel === "atencao"  ? "text-amber-400"   :
    nivel === "saudavel" ? "text-emerald-400" : "text-white/60";

  let resumo: string;
  if (nivel === "critico")
    resumo = `${criticas} campanha${criticas !== 1 ? "s" : ""} crítica${criticas !== 1 ? "s" : ""} com R$${lucroEmRisco.toLocaleString("pt-BR")} em risco. Ação imediata necessária.`;
  else if (nivel === "atencao")
    resumo = `Conta em atenção. ${criticas} crítica${criticas !== 1 ? "s" : ""} e ${estaveis} estável${estaveis !== 1 ? "is" : ""}. Monitore de perto.`;
  else if (nivel === "estavel")
    resumo = oportunidades > 0
      ? `Conta estável com ${oportunidades} oportunidade${oportunidades !== 1 ? "s" : ""} de escala detectada${oportunidades !== 1 ? "s" : ""}.`
      : "Conta estável. Todas as campanhas sob controle.";
  else
    resumo = `Conta saudável. ${oportunidades} oportunidade${oportunidades !== 1 ? "s" : ""} de escala com R$${lucroPotencial.toLocaleString("pt-BR")} de potencial.`;

  const enriched: CampanhaEnriquecida[] = resultados.map((r, i) => {
    const c = campanhas[i];
    const diasAtivo = (() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((c as any).dias_ativo) return (c as any).dias_ativo as number;
      if (c.data_inicio) {
        const diff = (Date.now() - new Date(c.data_inicio).getTime()) / 86_400_000;
        return Math.max(1, Math.round(diff));
      }
      return 7;
    })();
    const scores: ScoresCampanha = { urgencia: r.urgencia, score: r.score, roas: r.roas, cpl: r.cpl, margem: r.margem };
    return {
      id: r.id, nome_campanha: r.nome,
      gasto: r.gasto, leads: safe(c.contatos), receita: r.receita,
      lucro: r.lucro, margem: r.margem, roas: r.roas, cpl: r.cpl,
      score: r.score, diasAtivo, alavancagem: r.roas * (r.score / 100), scores,
    };
  });

  const flagsPorCampanha:  Record<string, string[]>        = {};
  const scoresPorCampanha: Record<string, ScoresCampanha>  = {};
  enriched.forEach((e, i) => {
    flagsPorCampanha[e.id]  = gerarFlags(campanhas[i], e.scores.urgencia, e.roas, e.cpl);
    scoresPorCampanha[e.id] = e.scores;
  });

  const totalGasto   = enriched.reduce((s, e) => s + e.gasto,   0);
  const totalLeads   = enriched.reduce((s, e) => s + e.leads,   0);
  const totalReceita = enriched.reduce((s, e) => s + e.receita, 0);
  const roasMedio    = totalGasto > 0 ? totalReceita / totalGasto : 0;
  const cplMedio     = totalLeads > 0 ? totalGasto / totalLeads   : 0;
  const scoreMedio   = enriched.reduce((s, e) => s + e.score, 0) / enriched.length;
  const margemMedia  = totalReceita > 0 ? (totalReceita - totalGasto) / totalReceita : 0;

  const comFreq  = campanhas.filter(c => safe(c.frequencia) > 0);
  const freqMedia = comFreq.length > 0
    ? comFreq.reduce((s, c) => s + safe(c.frequencia), 0) / comFreq.length : 0;

  const mediaConta: MediaConta = {
    roas: roasMedio, cpl: cplMedio, score: scoreMedio,
    margem: margemMedia, freq: freqMedia, cpm: 0, ctr: 0,
  };

  const campanhasProblema = enriched.filter(e => e.score < 40).length;
  const campanhasEscala   = enriched.filter(e => e.scores.urgencia === "oportunidade").length;
  const dinheiroEmRisco   = enriched.filter(e => e.scores.urgencia === "critico").reduce((s, e) => s + e.gasto, 0);
  const oportunidadeEscala = enriched.filter(e => e.scores.urgencia === "oportunidade").reduce((s, e) => s + e.lucro * 0.2, 0);

  const lucroPerda7d = enriched
    .filter(e => e.scores.urgencia === "critico")
    .reduce((s, e) => s + (e.gasto / Math.max(1, e.diasAtivo)) * 7, 0);

  const ganhoProjetado7d = enriched
    .filter(e => e.scores.urgencia === "oportunidade")
    .reduce((s, e) => s + e.lucro * 0.2, 0);

  const radar: RadarItem[] = [];
  enriched.forEach(e => {
    if (e.scores.urgencia === "critico") {
      radar.push({
        tipo: "critico",
        mensagem: e.leads === 0
          ? `${e.nome_campanha} — sem leads · R$${Math.round(e.gasto)} investidos`
          : `${e.nome_campanha} — ROAS ${e.roas.toFixed(2)}× abaixo do mínimo`,
        valorEmJogo: Math.abs(e.lucro),
      });
    } else if (e.scores.urgencia === "oportunidade") {
      radar.push({
        tipo: "escala",
        mensagem: `${e.nome_campanha} — ROAS ${e.roas.toFixed(2)}× · pronto para escalar`,
        valorEmJogo: e.lucro,
      });
    }
  });

  const recomendacoes: RecomendacaoAcao[] = [];
  let prio = 1;
  enriched.filter(e => e.scores.urgencia === "critico").sort((a, b) => b.gasto - a.gasto).slice(0, 2).forEach(e => {
    recomendacoes.push({
      tipo: "pausar", prioridade: prio++, campanha: e.nome_campanha, campanhaId: e.id,
      acao: `Pausar "${e.nome_campanha}"`,
      impacto: `ROAS ${e.roas.toFixed(2)}× · Score ${e.score}/100`,
      lucroPotencial: Math.abs(e.lucro),
    });
  });
  enriched.filter(e => e.scores.urgencia === "oportunidade").sort((a, b) => b.roas - a.roas).slice(0, 2).forEach(e => {
    recomendacoes.push({
      tipo: "escalar", prioridade: prio++, campanha: e.nome_campanha, campanhaId: e.id,
      acao: `Escalar "${e.nome_campanha}" em 20%`,
      impacto: `ROAS ${e.roas.toFixed(2)}× · potencial de escala`,
      lucroPotencial: e.lucro * 0.2,
    });
  });

  return {
    score, nivel, criticas, oportunidades,
    totalCampanhas: campanhas.length, lucroEmRisco, lucroPotencial, resumo,
    enriched, flagsPorCampanha, scoresPorCampanha,
    mediaConta, campanhasProblema, roasMedio, lucroPerda7d,
    urgenciaGlobal, label, corLabel, margemMedia,
    dinheiroEmRisco, oportunidadeEscala, campanhasEscala,
    campanhasDegradando: 0,
    perdaProjetada7d: lucroPerda7d,
    ganhoProjetado7d,
    lucroPotencial7d: ganhoProjetado7d,
    resumoFrase: resumo,
    recomendacoes, radar,
    projecao72h: {
      lucroEmRisco72h:   (lucroPerda7d / 7) * 3,
      lucroPotencial72h: (ganhoProjetado7d / 7) * 3,
    },
  };
}

export function simularEscala(
  campanha: CampanhaInput,
  fatorOuParams: number | EngineParams = 0.2,
  ticketLegacy?: number,
  taxaLegacy?: number,
): SimulacaoEscala {
  let fator: number;
  let params: EngineParams;

  if (typeof fatorOuParams === "number") {
    fator  = fatorOuParams;
    params = resolverEngineParams({ ticket_medio_global: ticketLegacy ?? 450, taxa_conversao: taxaLegacy ?? 0.04 });
  } else {
    fator  = typeof ticketLegacy === "number" ? ticketLegacy : 1.5;
    params = fatorOuParams;
  }

  const gasto  = safe(campanha.gasto_total);
  const leads  = safe(campanha.contatos);
  const freq   = safe(campanha.frequencia);
  const receita = calcReceita(leads, params);
  const lucro   = receita - gasto;
  const roas    = gasto > 0 ? receita / gasto : 0;
  const cpl     = leads > 0 ? gasto / leads : 0;

  const investimentoExtra = gasto * fator;
  const budgetProposto    = gasto + investimentoExtra;

  const degradacao =
    freq > B.FREQ_CRITICA  ? 0.80 :
    freq > B.FREQ_ATENCAO  ? 0.88 :
    freq > 1.5             ? 0.94 : 1.0;

  const leadsProjetados  = leads * (1 + fator) * degradacao;
  const receitaProjetada = calcReceita(leadsProjetados, params);
  const receitaExtra     = receitaProjetada - receita;
  const lucroProjetado   = receitaProjetada - budgetProposto;
  const lucroExtra       = lucroProjetado - lucro;
  const roasProjetado    = budgetProposto > 0 ? receitaProjetada / budgetProposto : 0;
  const cplProjetado     = leadsProjetados > 0 ? budgetProposto / leadsProjetados : 0;
  const margemProjetada  = receitaProjetada > 0 ? lucroProjetado / receitaProjetada : 0;
  const alertaFrequencia = freq > B.FREQ_ATENCAO;
  const viavel           = roasProjetado >= B.ROAS_MINIMO && lucroProjetado > 0;

  const avisos: string[] = [];
  if (alertaFrequencia) avisos.push("Frequência elevada pode reduzir performance. Considere novos criativos.");
  if (!viavel)          avisos.push("ROAS projetado abaixo do mínimo recomendado (1.5×).");
  if (degradacao < 1)   avisos.push(`Degradação de ${((1 - degradacao) * 100).toFixed(0)}% estimada por saturação.`);

  const recomendacao = !viavel
    ? "Escala não recomendada. ROAS projetado abaixo do mínimo ou lucro negativo."
    : alertaFrequencia
    ? "Escala viável, mas frequência elevada pode reduzir performance."
    : roasProjetado >= B.ROAS_ESCALA
    ? "Escala fortemente recomendada. ROAS projetado acima do benchmark."
    : "Escala viável. Monitore CPL e frequência nos primeiros 48h.";

  return {
    budgetAtual: gasto, budgetProposto, fatorEscala: fator,
    leadsAtuais: leads, leadsProjetados: Math.round(leadsProjetados),
    receitaAtual: receita, receitaProjetada,
    lucroAtual: lucro, lucroProjetado,
    roasAtual: roas, roasProjetado,
    cplAtual: cpl, cplProjetado,
    alertaFrequencia, recomendacao, viavel,
    investimentoExtra, receitaExtra, lucroExtra,
    roasMantem: roasProjetado, margemProjetada, avisos,
  };
}