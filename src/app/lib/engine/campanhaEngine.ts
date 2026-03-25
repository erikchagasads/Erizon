/**
 * campanhaEngine.ts — v1.0
 * Engine centralizado da Erizon.
 *
 * TODAS as páginas devem importar daqui:
 *   - resolverTipo()       → detecta tipo pelo nome, objective e métricas
 *   - calcularScore()      → score 0-100 respeitando o tipo
 *   - gerarRecomendacao()  → título, descrição e ação respeitando o tipo
 *   - ehAwareness()        → helper rápido
 *   - semDadosSuficientes()→ campanha nova sem gasto
 *
 * Regras centrais:
 *   - gasto === 0          → "Aguardando dados", nunca crítico
 *   - awareness/tráfego    → nunca penaliza por zero leads ou ROAS
 *   - leads/conversão      → penaliza CPL alto e zero leads com gasto
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type TipoCampanha =
  | "leads"
  | "trafego"
  | "conversao"
  | "awareness"
  | "outro";

export type UrgenciaNivel =
  | "critico"
  | "atencao"
  | "estavel"
  | "oportunidade"
  | "sem_dados";

export type DecisaoTipo =
  | "pausar"
  | "escalar"
  | "monitorar"
  | "aguardar"
  | "ok";

export interface CampanhaBase {
  id?: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  receita_estimada?: number;
  impressoes?: number;
  cliques?: number;
  ctr?: number;
  cpm?: number;
  frequencia?: number;
  dias_ativo?: number;
  orcamento?: number;
  status?: string;
  objective?: string | null;
}

export interface ScoreCampanha {
  score: number;
  tipo: TipoCampanha;
  urgencia: UrgenciaNivel;
  cpl: number;
  roas: number;
  cpm: number;
  ctr: number;
}

export interface RecomendacaoCampanha {
  decisao: DecisaoTipo;
  titulo: string;
  descricao: string;
  impacto: string;
  cor: string;
  bg: string;
  border: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARKS
// ─────────────────────────────────────────────────────────────────────────────

const B = {
  CPL_IDEAL:    30,
  CPL_CRITICO:  80,
  ROAS_MINIMO:  1.5,
  ROAS_ESCALA:  2.5,
  CTR_MINIMO:   0.9,
  CPM_MAXIMO:   35,
  FREQ_CRITICA: 3.5,
  GASTO_MINIMO: 50,   // abaixo disso não penaliza
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function safe(v: unknown): number {
  const n = Number(v);
  return isFinite(n) && n >= 0 ? n : 0;
}

function normalizarNome(nome: string): string {
  return nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVER TIPO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detecta o tipo de campanha em 3 camadas:
 * 1. Nome (maior confiança — o gestor nomeia com intenção)
 * 2. Objective do Meta (fallback quando nome é genérico)
 * 3. Métricas (último recurso)
 */
export function resolverTipo(c: CampanhaBase): TipoCampanha {
  const nome = normalizarNome(c.nome_campanha ?? "");

  // 1. Nome
  if (/alcance|reach|awareness|reconhecimento|cobertura/.test(nome)) return "awareness";
  if (/trafego|traffic|visita|clique\b/.test(nome))                  return "trafego";
  if (/\blead\b|leads|cadastro|formulario|captacao|contato/.test(nome)) return "leads";
  if (/venda|vendas|conversao|compra|checkout/.test(nome))            return "conversao";

  // 2. Objective Meta
  const o = (c.objective ?? "").toUpperCase();
  if (o === "OUTCOME_LEADS"    || o.includes("LEAD")    || o === "LEAD_GENERATION") return "leads";
  if (o === "OUTCOME_TRAFFIC"  || o.includes("TRAFFIC") || o === "LINK_CLICKS")     return "trafego";
  if (o === "OUTCOME_SALES"    || o.includes("PURCHASE")|| o === "CONVERSIONS")     return "conversao";
  if (o === "OUTCOME_AWARENESS"|| o.includes("AWARENESS")|| o === "REACH"
    || o === "BRAND_AWARENESS")                                                       return "awareness";
  if (o === "OUTCOME_ENGAGEMENT" || o.includes("ENGAGEMENT")) {
    if (safe(c.contatos) > 0)  return "leads";
    if (safe(c.cliques)  > 0)  return "trafego";
    return "awareness";
  }

  // 3. Métricas
  const contatos   = safe(c.contatos);
  const cliques    = safe(c.cliques);
  const impressoes = safe(c.impressoes);
  const gasto      = safe(c.gasto_total);

  if (contatos > 0)                   return "leads";
  if (cliques > 0 && contatos === 0)  return "trafego";
  if (impressoes > 100)               return "awareness";
  if (gasto > 0 && contatos === 0)    return "awareness"; // gasto sem leads → não penalizar

  return "outro";
}

export function ehAwareness(c: CampanhaBase): boolean {
  const t = resolverTipo(c);
  return t === "awareness" || t === "trafego";
}

export function semDadosSuficientes(c: CampanhaBase): boolean {
  return safe(c.gasto_total) < 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR SCORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score 0-100 respeitando o tipo da campanha.
 * - Campanhas sem gasto retornam 50 (neutro)
 * - Awareness/tráfego nunca penalizadas por zero leads ou ROAS
 */
export function calcularScore(c: CampanhaBase, ticket = 450, conv = 0.04): ScoreCampanha {
  const gasto   = safe(c.gasto_total);
  const leads   = safe(c.contatos);
  const imp     = safe(c.impressoes);
  const cliques = safe(c.cliques);
  const freq    = safe(c.frequencia);
  const orcamento = safe(c.orcamento);

  const ctr = cliques > 0 && imp > 0
    ? (cliques / imp) * 100
    : safe(c.ctr);
  const cpm = imp > 0 ? (gasto / imp) * 1000 : safe(c.cpm);
  const cpl  = leads > 0 ? gasto / leads : 0;
  const receita = safe(c.receita_estimada) > 0
    ? safe(c.receita_estimada)
    : leads * conv * ticket;
  const roas = gasto > 0 ? receita / gasto : 0;

  const tipo = resolverTipo(c);

  // Sem dados → neutro
  if (gasto < 1) {
    return { score: 50, tipo, urgencia: "sem_dados", cpl, roas, cpm, ctr };
  }

  let s = 100;

  if (tipo === "leads" || tipo === "conversao") {
    if (cpl > B.CPL_CRITICO)              s -= 25;
    else if (cpl > B.CPL_IDEAL * 1.5)    s -= 10;
    if (leads === 0 && gasto > B.GASTO_MINIMO) s -= 30;
    if (roas < B.ROAS_MINIMO)             s -= 25;
    if (tipo === "conversao" && roas < 1) s -= 15; // penalidade extra

  } else if (tipo === "trafego") {
    if (ctr > 0 && ctr < B.CTR_MINIMO)   s -= 30;
    if (ctr === 0 && gasto > B.GASTO_MINIMO) s -= 20;
    if (cliques === 0 && gasto > B.GASTO_MINIMO) s -= 25;
    if (cpm > 80)  s -= 15;
    else if (cpm > 50) s -= 5;

  } else if (tipo === "awareness") {
    // Nunca penaliza leads, nunca penaliza ROAS
    if (cpm > B.CPM_MAXIMO * 3) s -= 20;
    if (freq > B.FREQ_CRITICA)  s -= 20;
    else if (freq > 2.5)        s -= 10;

  } else {
    // "outro" — fallback conservador, sem penalidade pesada
    if (leads === 0 && gasto > B.GASTO_MINIMO) s -= 15;
    if (roas < B.ROAS_MINIMO && roas > 0)      s -= 15;
  }

  // Penalidades universais
  if (ctr > 0 && ctr < B.CTR_MINIMO && tipo !== "trafego" && tipo !== "awareness") s -= 15;
  if (freq > B.FREQ_CRITICA) s -= 10;
  if (orcamento > 0 && gasto / orcamento > 1.05) s -= 10; // estourou orçamento

  const score = Math.max(0, Math.min(100, Math.round(s)));

  // Urgência
  let urgencia: UrgenciaNivel;
  const ignorarRoas = tipo === "awareness" || tipo === "trafego";
  if (score < 40 || (!ignorarRoas && roas > 0 && roas < 1)) urgencia = "critico";
  else if (score >= 80 && (ignorarRoas || roas >= B.ROAS_ESCALA))   urgencia = "oportunidade";
  else if (score < 65)                                               urgencia = "atencao";
  else                                                               urgencia = "estavel";

  return { score, tipo, urgencia, cpl, roas, cpm, ctr };
}

// ─────────────────────────────────────────────────────────────────────────────
// GERAR RECOMENDAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtX(v: number): string {
  return `${v.toFixed(2)}×`;
}

/**
 * Gera recomendação humana respeitando o tipo.
 * Única fonte de verdade para título/descrição/ação em todas as páginas.
 */
export function gerarRecomendacao(c: CampanhaBase, ticket = 450, conv = 0.04): RecomendacaoCampanha {
  const { score, tipo, urgencia, cpl, roas, cpm } = calcularScore(c, ticket, conv);
  const gasto      = safe(c.gasto_total);
  const diasAtivo  = safe(c.dias_ativo) || 1;
  const gastoDiario = gasto / diasAtivo;
  const isAtivo    = ["ATIVO","ACTIVE","ATIVA"].includes((c.status ?? "").toUpperCase());

  // Cores por decisão
  function cores(decisao: DecisaoTipo) {
    const map: Record<DecisaoTipo, { cor: string; bg: string; border: string }> = {
      pausar:   { cor: "text-red-400",     bg: "bg-red-500/[0.05]",     border: "border-red-500/20"     },
      escalar:  { cor: "text-emerald-400", bg: "bg-emerald-500/[0.05]", border: "border-emerald-500/20" },
      monitorar:{ cor: "text-amber-400",   bg: "bg-amber-500/[0.04]",   border: "border-amber-500/15"   },
      aguardar: { cor: "text-white/40",    bg: "bg-white/[0.02]",       border: "border-white/[0.06]"   },
      ok:       { cor: "text-white/60",    bg: "bg-white/[0.02]",       border: "border-white/[0.06]"   },
    };
    return map[decisao];
  }

  function rec(decisao: DecisaoTipo, titulo: string, descricao: string, impacto: string): RecomendacaoCampanha {
    return { decisao, titulo, descricao, impacto, ...cores(decisao) };
  }

  // 1. Sem dados
  if (semDadosSuficientes(c)) {
    return rec("aguardar",
      "⏳ Aguardando dados",
      "Esta campanha ainda não registrou investimento. Aguarde o primeiro ciclo de dados para análise.",
      "Sem dados suficientes para recomendação"
    );
  }

  // 2. Pausada
  if (!isAtivo) {
    return rec("ok",
      "Campanha pausada",
      `Investimento acumulado: R$${fmtBRL(gasto)} com ${c.contatos} leads gerados.`,
      cpl > 0 ? `CPL histórico: R$${fmtBRL(cpl)}` : "Sem leads registrados"
    );
  }

  // 3. Awareness/Tráfego — nunca recomendar pausa por zero leads
  if (tipo === "awareness") {
    if (urgencia === "oportunidade") {
      return rec("escalar",
        "📡 Alcance excelente",
        `CPM R$${fmtBRL(cpm)} muito eficiente. Campanha atingindo audiência com baixo custo.`,
        `Escalar orçamento pode ampliar cobertura proporcionalmente`
      );
    }
    if (urgencia === "critico") {
      return rec("monitorar",
        "📡 Awareness com CPM alto",
        `CPM R$${fmtBRL(cpm)} acima do ideal. Revise segmentação de audiência.`,
        `Otimizar segmentação pode reduzir CPM`
      );
    }
    return rec("ok",
      "📡 Campanha de alcance",
      `Score ${score}/100 — campanha de awareness operando normalmente. Métricas: CPM R$${fmtBRL(cpm)}.`,
      "Métrica principal: CPM e frequência, não leads"
    );
  }

  if (tipo === "trafego") {
    if (urgencia === "critico") {
      return rec("monitorar",
        "⚠️ Tráfego ineficiente",
        `CTR abaixo do esperado. Revise criativos e segmentação.`,
        `Otimizar criativo pode aumentar CTR e reduzir CPC`
      );
    }
    if (urgencia === "oportunidade") {
      return rec("escalar",
        "🚀 Tráfego eficiente",
        `CTR forte com CPC baixo. Campanha pronta para escala.`,
        `+${fmtBRL(gastoDiario * 0.2 * 30)}/mês estimado com 20% a mais`
      );
    }
    return rec("ok",
      "✅ Tráfego estável",
      `Score ${score}/100 — tráfego dentro do esperado.`,
      "Manter estratégia atual"
    );
  }

  // 4. Leads/conversão/outro
  if (urgencia === "critico") {
    if (c.contatos === 0 && gasto > B.GASTO_MINIMO) {
      return rec("pausar",
        "⛔ Pausar imediatamente",
        `R$${fmtBRL(gasto)} investidos sem nenhum lead. Esta campanha está queimando budget sem retorno.`,
        `~R$${fmtBRL(gastoDiario * 30)} em risco este mês se mantida`
      );
    }
    return rec("pausar",
      "⛔ Pausar imediatamente",
      `Score ${score}/100 — CPL R$${fmtBRL(cpl)} acima do saudável. ROAS ${fmtX(roas)} abaixo do mínimo.`,
      `~R$${fmtBRL(gastoDiario * 30)} em risco este mês se mantida`
    );
  }

  if (urgencia === "oportunidade") {
    return rec("escalar",
      "🚀 Oportunidade de escala",
      `ROAS ${fmtX(roas)} com score ${score}/100. Headroom disponível — aumentar 20% pode gerar retorno proporcional.`,
      `+R$${fmtBRL(gastoDiario * 0.2 * roas * 30)}/mês estimado`
    );
  }

  if (urgencia === "atencao") {
    return rec("monitorar",
      "⚠️ Monitorar com atenção",
      `Score ${score}/100 — performance abaixo do ideal. CPL R$${cpl > 0 ? fmtBRL(cpl) : "—"} pode ser otimizado.`,
      "Potencial de melhora de até 30% no CPL com ajuste de segmentação"
    );
  }

  return rec("ok",
    "✅ Performance saudável",
    `Score ${score}/100 — campanha performando dentro do esperado. CPL R$${cpl > 0 ? fmtBRL(cpl) : "—"} e ROAS ${roas > 0 ? fmtX(roas) : "—"} estáveis.`,
    "Manter estratégia atual"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE ALERTA (usados em Pulse, Radar, Decision Feed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna true se a campanha merece alerta de "sem leads"
 * (nunca dispara para awareness/tráfego)
 */
export function alertaSemLeads(c: CampanhaBase): boolean {
  if (semDadosSuficientes(c)) return false;
  if (ehAwareness(c)) return false;
  return safe(c.contatos) === 0 && safe(c.gasto_total) > B.GASTO_MINIMO;
}

/**
 * Retorna true se a campanha merece alerta de ROAS baixo
 * (nunca dispara para awareness/tráfego)
 */
export function alertaRoasBaixo(c: CampanhaBase, ticket = 450, conv = 0.04): boolean {
  if (semDadosSuficientes(c)) return false;
  if (ehAwareness(c)) return false;
  const gasto   = safe(c.gasto_total);
  const receita = safe(c.receita_estimada) || safe(c.contatos) * conv * ticket;
  const roas    = gasto > 0 ? receita / gasto : 0;
  return roas > 0 && roas < B.ROAS_MINIMO && gasto > B.GASTO_MINIMO;
}

/**
 * Retorna true se a campanha merece alerta de CPL alto
 */
export function alertaCplAlto(c: CampanhaBase, limiteCpl = B.CPL_CRITICO): boolean {
  if (semDadosSuficientes(c)) return false;
  if (ehAwareness(c)) return false;
  const leads = safe(c.contatos);
  if (leads === 0) return false;
  const cpl = safe(c.gasto_total) / leads;
  return cpl > limiteCpl;
}

// Exporta benchmarks para uso externo (ex: check-alerts)
export const BENCHMARKS = B;

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMAÇÕES — avaliação de regras integrada à engine
// ─────────────────────────────────────────────────────────────────────────────

export type CondicaoTipo =
  | "gasto_sem_leads"
  | "cpl_acima"
  | "roas_abaixo"
  | "ctr_abaixo"
  | "dias_sem_resultado"
  | "score_abaixo"
  | "frequencia_acima";

export type AcaoTipo = "pausar" | "alertar" | "registrar";

export interface RegraAutomacao {
  id: string;
  nome: string;
  condicao_tipo: CondicaoTipo;
  condicao_valor: number;
  acao_tipo: AcaoTipo;
  ativa: boolean;
  criada_em: string;
}

export interface ResultadoAvaliacao {
  regra: RegraAutomacao;
  campanha: CampanhaBase;
  valorAtual: number;
  motivo: string;
  decisaoSugerida: DecisaoTipo;
}

/**
 * Verifica se uma campanha atende a condição de uma regra,
 * usando os mesmos benchmarks da engine centralizada.
 */
export function avaliarRegra(
  regra: RegraAutomacao,
  campanha: CampanhaBase,
  ticket = 450,
  conv = 0.04
): ResultadoAvaliacao | null {
  if (!regra.ativa) return null;

  const gasto     = safe(campanha.gasto_total);
  const leads     = safe(campanha.contatos);
  const ctr       = safe(campanha.ctr);
  const freq      = safe(campanha.frequencia);
  const diasAtivo = safe(campanha.dias_ativo) || 1;
  const isAtivo   = ["ATIVO", "ACTIVE", "ATIVA"].includes(
    (campanha.status ?? "").toUpperCase()
  );

  if (!isAtivo) return null;
  if (semDadosSuficientes(campanha)) return null;

  const { score, cpl, roas } = calcularScore(campanha, ticket, conv);

  switch (regra.condicao_tipo) {
    case "gasto_sem_leads":
      if (leads === 0 && gasto >= regra.condicao_valor)
        return { regra, campanha, valorAtual: gasto,
          motivo: `R$${gasto.toFixed(0)} gastos sem nenhum lead`,
          decisaoSugerida: "pausar" };
      break;

    case "cpl_acima":
      if (leads > 0 && cpl > regra.condicao_valor)
        return { regra, campanha, valorAtual: cpl,
          motivo: `CPL R$${cpl.toFixed(0)} acima do limite R$${regra.condicao_valor}`,
          decisaoSugerida: "monitorar" };
      break;

    case "roas_abaixo":
      if (!ehAwareness(campanha) && roas > 0 && roas < regra.condicao_valor)
        return { regra, campanha, valorAtual: roas,
          motivo: `ROAS ${roas.toFixed(2)}× abaixo do mínimo ${regra.condicao_valor}×`,
          decisaoSugerida: "monitorar" };
      break;

    case "ctr_abaixo":
      if (ctr > 0 && ctr < regra.condicao_valor)
        return { regra, campanha, valorAtual: ctr,
          motivo: `CTR ${ctr.toFixed(2)}% abaixo de ${regra.condicao_valor}%`,
          decisaoSugerida: "monitorar" };
      break;

    case "dias_sem_resultado":
      if (leads === 0 && diasAtivo >= regra.condicao_valor)
        return { regra, campanha, valorAtual: diasAtivo,
          motivo: `${diasAtivo} dias ativo sem nenhum lead`,
          decisaoSugerida: "pausar" };
      break;

    case "score_abaixo":
      if (score < regra.condicao_valor)
        return { regra, campanha, valorAtual: score,
          motivo: `Score ${score}/100 abaixo do limite ${regra.condicao_valor}`,
          decisaoSugerida: score < 40 ? "pausar" : "monitorar" };
      break;

    case "frequencia_acima":
      if (freq > regra.condicao_valor)
        return { regra, campanha, valorAtual: freq,
          motivo: `Frequência ${freq.toFixed(1)}× acima do limite ${regra.condicao_valor}×`,
          decisaoSugerida: "monitorar" };
      break;
  }

  return null;
}

/**
 * Avalia um array de regras contra um array de campanhas.
 * Retorna todos os pares que disparam (regra × campanha afetada).
 */
export function avaliarRegras(
  regras: RegraAutomacao[],
  campanhas: CampanhaBase[],
  ticket = 450,
  conv = 0.04
): ResultadoAvaliacao[] {
  const resultados: ResultadoAvaliacao[] = [];
  for (const regra of regras) {
    for (const campanha of campanhas) {
      const r = avaliarRegra(regra, campanha, ticket, conv);
      if (r) resultados.push(r);
    }
  }
  return resultados;
}

/**
 * Resumo rápido de quantas campanhas estão em alerta por tipo.
 * Útil para badges e dashboards.
 */
export function resumoAlertas(
  campanhas: CampanhaBase[],
  ticket = 450,
  conv = 0.04
): Record<string, number> {
  const r = { sem_leads: 0, cpl_alto: 0, roas_baixo: 0, score_critico: 0, frequencia_alta: 0 };
  for (const c of campanhas) {
    if (alertaSemLeads(c))                r.sem_leads++;
    if (alertaCplAlto(c))                 r.cpl_alto++;
    if (alertaRoasBaixo(c, ticket, conv)) r.roas_baixo++;
    const { score } = calcularScore(c, ticket, conv);
    if (score < 40) r.score_critico++;
    if (safe(c.frequencia) > B.FREQ_CRITICA) r.frequencia_alta++;
  }
  return r;
}
