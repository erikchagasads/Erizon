// src/app/lib/benchmarkSetor.ts
// Benchmark Inteligente — compara métricas da conta com padrões reais do mercado
// Fontes: WordStream 2024, Meta Business Reports, Hubspot B2B/B2C averages

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Setor =
  | "ecommerce"
  | "servicos_locais"
  | "infoprodutos"
  | "saude_beleza"
  | "imobiliario"
  | "educacao"
  | "financeiro"
  | "geral";

export interface BenchmarkSetor {
  setor: Setor;
  label: string;
  cpl: { p25: number; p50: number; p75: number; referencia: string };
  roas: { p25: number; p50: number; p75: number; referencia: string };
  ctr: { p25: number; p50: number; p75: number; referencia: string };
  cpm: { p25: number; p50: number; p75: number; referencia: string };
  taxaConversao: { p25: number; p50: number; p75: number };
}

export type Posicao = "top10" | "top25" | "mediana" | "abaixo" | "critico";

export interface ComparacaoMetrica {
  valor: number;
  benchmark50: number;
  benchmark25: number;
  benchmark75: number;
  posicao: Posicao;
  delta: number;         // quanto está acima/abaixo da mediana
  deltaPct: number;
  insight: string;
  potencialMelhora: number; // valor que alcançaria se chegasse ao p75
}

export interface RelatorioComparativo {
  setor: Setor;
  setorLabel: string;
  cpl: ComparacaoMetrica;
  roas: ComparacaoMetrica;
  ctr: ComparacaoMetrica;
  cpm: ComparacaoMetrica;
  scoreContextual: number;  // score considerando benchmarks, não absoluto
  posicaoGeral: Posicao;
  oportunidadePrincipal: string;
  fraseExecutiva: string;
}

// ─── Benchmarks por setor (dados reais agregados 2024) ───────────────────────
// CPL em R$ (convertido de USD com fator ~5.2), ROAS adimensional, CTR em %

const BENCHMARKS_SETOR: Record<Setor, BenchmarkSetor> = {
  ecommerce: {
    setor: "ecommerce", label: "E-commerce",
    cpl:  { p25: 18,  p50: 35,  p75: 65,  referencia: "WordStream 2024" },
    roas: { p25: 2.2, p50: 3.5, p75: 6.0, referencia: "Meta Business 2024" },
    ctr:  { p25: 0.8, p50: 1.4, p75: 2.5, referencia: "AdEspresso 2024" },
    cpm:  { p25: 20,  p50: 38,  p75: 65,  referencia: "WordStream 2024" },
    taxaConversao: { p25: 1.0, p50: 2.3, p75: 4.5 },
  },
  servicos_locais: {
    setor: "servicos_locais", label: "Serviços Locais",
    cpl:  { p25: 25,  p50: 55,  p75: 110, referencia: "LSA Google 2024" },
    roas: { p25: 1.8, p50: 3.0, p75: 5.0, referencia: "Meta Business 2024" },
    ctr:  { p25: 0.6, p50: 1.1, p75: 2.0, referencia: "AdEspresso 2024" },
    cpm:  { p25: 15,  p50: 28,  p75: 50,  referencia: "WordStream 2024" },
    taxaConversao: { p25: 2.0, p50: 4.1, p75: 8.0 },
  },
  infoprodutos: {
    setor: "infoprodutos", label: "Infoprodutos / Cursos",
    cpl:  { p25: 8,   p50: 20,  p75: 45,  referencia: "Hotmart Insights 2024" },
    roas: { p25: 2.0, p50: 3.8, p75: 7.0, referencia: "Meta Business 2024" },
    ctr:  { p25: 0.9, p50: 1.6, p75: 3.0, referencia: "AdEspresso 2024" },
    cpm:  { p25: 12,  p50: 22,  p75: 40,  referencia: "WordStream 2024" },
    taxaConversao: { p25: 1.5, p50: 3.2, p75: 6.5 },
  },
  saude_beleza: {
    setor: "saude_beleza", label: "Saúde & Beleza",
    cpl:  { p25: 20,  p50: 42,  p75: 85,  referencia: "Meta Business 2024" },
    roas: { p25: 2.5, p50: 4.2, p75: 7.5, referencia: "Meta Business 2024" },
    ctr:  { p25: 1.0, p50: 1.8, p75: 3.2, referencia: "AdEspresso 2024" },
    cpm:  { p25: 18,  p50: 32,  p75: 55,  referencia: "WordStream 2024" },
    taxaConversao: { p25: 1.8, p50: 3.5, p75: 7.0 },
  },
  imobiliario: {
    setor: "imobiliario", label: "Imobiliário",
    cpl:  { p25: 60,  p50: 130, p75: 280, referencia: "Meta Business 2024" },
    roas: { p25: 1.5, p50: 2.8, p75: 5.0, referencia: "Meta Business 2024" },
    ctr:  { p25: 0.5, p50: 0.9, p75: 1.7, referencia: "AdEspresso 2024" },
    cpm:  { p25: 22,  p50: 42,  p75: 75,  referencia: "WordStream 2024" },
    taxaConversao: { p25: 0.5, p50: 1.2, p75: 2.8 },
  },
  educacao: {
    setor: "educacao", label: "Educação",
    cpl:  { p25: 15,  p50: 32,  p75: 70,  referencia: "Meta Business 2024" },
    roas: { p25: 2.0, p50: 3.5, p75: 6.0, referencia: "Meta Business 2024" },
    ctr:  { p25: 0.8, p50: 1.4, p75: 2.6, referencia: "AdEspresso 2024" },
    cpm:  { p25: 14,  p50: 26,  p75: 45,  referencia: "WordStream 2024" },
    taxaConversao: { p25: 1.2, p50: 2.8, p75: 5.5 },
  },
  financeiro: {
    setor: "financeiro", label: "Financeiro / Seguros",
    cpl:  { p25: 80,  p50: 175, p75: 380, referencia: "WordStream 2024" },
    roas: { p25: 1.8, p50: 3.2, p75: 5.5, referencia: "Meta Business 2024" },
    ctr:  { p25: 0.4, p50: 0.8, p75: 1.5, referencia: "AdEspresso 2024" },
    cpm:  { p25: 30,  p50: 58,  p75: 95,  referencia: "WordStream 2024" },
    taxaConversao: { p25: 0.8, p50: 1.8, p75: 4.0 },
  },
  geral: {
    setor: "geral", label: "Geral / Outros",
    cpl:  { p25: 25,  p50: 55,  p75: 120, referencia: "Meta Business 2024" },
    roas: { p25: 2.0, p50: 3.2, p75: 5.5, referencia: "Meta Business 2024" },
    ctr:  { p25: 0.7, p50: 1.2, p75: 2.2, referencia: "AdEspresso 2024" },
    cpm:  { p25: 18,  p50: 35,  p75: 60,  referencia: "WordStream 2024" },
    taxaConversao: { p25: 1.0, p50: 2.5, p75: 5.0 },
  },
};

// ─── Funções ──────────────────────────────────────────────────────────────────

/**
 * Compara uma métrica individual com o benchmark do setor
 * Atenção: para CPL, menor é melhor (inverso)
 */
export function compararMetrica(
  valor: number,
  bench: BenchmarkSetor["cpl"],
  inverso = false,   // true = menor é melhor (CPL, CPM)
  insight?: (posicao: Posicao, delta: number, bench50: number) => string
): ComparacaoMetrica {
  let posicao: Posicao;

  if (inverso) {
    if (valor <= bench.p25)      posicao = "top10";
    else if (valor <= bench.p50) posicao = "top25";
    else if (valor <= bench.p75) posicao = "mediana";
    else if (valor <= bench.p75 * 1.5) posicao = "abaixo";
    else posicao = "critico";
  } else {
    if (valor >= bench.p75)          posicao = "top10";
    else if (valor >= bench.p50)     posicao = "top25";
    else if (valor >= bench.p25)     posicao = "mediana";
    else if (valor >= bench.p25 * 0.6) posicao = "abaixo";
    else posicao = "critico";
  }

  const delta    = inverso ? bench.p50 - valor : valor - bench.p50;
  const deltaPct = bench.p50 > 0 ? (delta / bench.p50) * 100 : 0;
  const potencialMelhora = inverso ? valor - bench.p25 : bench.p75 - valor;

  const insightGerado = insight
    ? insight(posicao, delta, bench.p50)
    : gerarInsightPadrao(posicao, delta, deltaPct, inverso);

  return {
    valor,
    benchmark50: bench.p50,
    benchmark25: bench.p25,
    benchmark75: bench.p75,
    posicao,
    delta: Math.abs(delta),
    deltaPct: Math.abs(deltaPct),
    insight: insightGerado,
    potencialMelhora: Math.max(0, potencialMelhora),
  };
}

/**
 * Gera relatório comparativo completo da conta vs setor
 */
export function gerarRelatorioComparativo(params: {
  cplMedio: number;
  roasMedio: number;
  ctrMedio: number;
  cpmMedio: number;
  setor: Setor;
}): RelatorioComparativo {
  const { cplMedio, roasMedio, ctrMedio, cpmMedio, setor } = params;
  const bench = BENCHMARKS_SETOR[setor];

  const cpl  = compararMetrica(cplMedio, bench.cpl, true);
  const roas = compararMetrica(roasMedio, bench.roas, false);
  const ctr  = compararMetrica(ctrMedio, bench.ctr, false);
  const cpm  = compararMetrica(cpmMedio, bench.cpm, true);

  // Score contextual: pondera as 4 métricas
  const pontos: Record<Posicao, number> = {
    top10: 100, top25: 80, mediana: 60, abaixo: 35, critico: 10,
  };
  const scoreContextual = Math.round(
    (pontos[cpl.posicao] * 0.30) +
    (pontos[roas.posicao] * 0.40) +
    (pontos[ctr.posicao] * 0.20) +
    (pontos[cpm.posicao] * 0.10)
  );

  const posicoes = [cpl.posicao, roas.posicao, ctr.posicao];
  const posicaoGeral: Posicao =
    posicoes.filter(p => p === "critico").length >= 2 ? "critico" :
    posicoes.filter(p => p === "top10"  ).length >= 2 ? "top10"   :
    posicoes.filter(p => p === "top25"  ).length >= 2 ? "top25"   :
    posicoes.filter(p => p === "abaixo" ).length >= 2 ? "abaixo"  : "mediana";

  const oportunidadePrincipal = identificarMelhorOportunidade(cpl, roas, ctr);
  const fraseExecutiva = gerarFraseExecutiva(posicaoGeral, bench.label, scoreContextual, cpl, roas);

  return {
    setor, setorLabel: bench.label,
    cpl, roas, ctr, cpm,
    scoreContextual, posicaoGeral,
    oportunidadePrincipal, fraseExecutiva,
  };
}

export function getBenchmarkSetor(setor: Setor): BenchmarkSetor {
  return BENCHMARKS_SETOR[setor];
}

export const SETORES_DISPONIVEIS: { id: Setor; label: string }[] = Object.values(
  BENCHMARKS_SETOR
).map(b => ({ id: b.setor, label: b.label }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gerarInsightPadrao(
  posicao: Posicao, delta: number, deltaPct: number, inverso: boolean
): string {
  const sinal = (inverso ? delta < 0 : delta > 0) ? "melhor" : "pior";
  if (posicao === "top10")  return `Top 10% do setor. ${Math.abs(deltaPct).toFixed(0)}% ${sinal} que a mediana.`;
  if (posicao === "top25")  return `Acima da mediana do setor (+${Math.abs(deltaPct).toFixed(0)}%).`;
  if (posicao === "mediana") return `Na mediana do setor. Há espaço para melhorar.`;
  if (posicao === "abaixo") return `Abaixo da mediana. ${Math.abs(deltaPct).toFixed(0)}% de gap.`;
  return `Crítico. Requer ação imediata — ${Math.abs(deltaPct).toFixed(0)}% abaixo do aceitável.`;
}

function identificarMelhorOportunidade(
  cpl: ComparacaoMetrica,
  roas: ComparacaoMetrica,
  ctr: ComparacaoMetrica
): string {
  const gaps = [
    { metrica: "CPL", posicao: cpl.posicao, potencial: cpl.potencialMelhora },
    { metrica: "ROAS", posicao: roas.posicao, potencial: roas.potencialMelhora },
    { metrica: "CTR", posicao: ctr.posicao, potencial: ctr.potencialMelhora },
  ];
  const pior = gaps
    .filter(g => g.posicao === "critico" || g.posicao === "abaixo")
    .sort((a, b) => {
      const peso: Record<Posicao, number> = { critico: 2, abaixo: 1, mediana: 0, top25: 0, top10: 0 };
      return peso[b.posicao] - peso[a.posicao];
    })[0];

  if (!pior) return "Conta performando acima da mediana do setor em todas as métricas.";
  if (pior.metrica === "CPL")  return `Reduzir CPL para R$${(cpl.benchmark50).toFixed(0)} (mediana do setor) pode dobrar o ROI.`;
  if (pior.metrica === "ROAS") return `ROAS abaixo da mediana (${roas.benchmark50}×). Foco em criativos e oferta.`;
  return `CTR abaixo da mediana (${ctr.benchmark50}%). Renovar criativos é a alavanca principal.`;
}

function gerarFraseExecutiva(
  posicao: Posicao,
  setorLabel: string,
  score: number,
  cpl: ComparacaoMetrica,
  roas: ComparacaoMetrica
): string {
  if (posicao === "top10")
    return `Conta no top 10% do setor ${setorLabel}. ROAS e CPL acima da referência de mercado.`;
  if (posicao === "top25")
    return `Desempenho acima da mediana de ${setorLabel}. Score contextual ${score}/100.`;
  if (posicao === "mediana")
    return `Conta na mediana de ${setorLabel}. Otimizar CPL de R$${cpl.valor.toFixed(0)} → R$${cpl.benchmark50.toFixed(0)} é o próximo passo.`;
  if (posicao === "abaixo")
    return `Abaixo da mediana de ${setorLabel}. ROAS ${roas.valor.toFixed(2)}× vs ${roas.benchmark50}× do setor.`;
  return `Alerta: performance crítica vs benchmarks de ${setorLabel}. Revisão estrutural necessária.`;
}
