/**
 * tipoCampanha.ts — v2.0
 * Motor de tipos de campanha para o sistema Erizon.
 * Suporta todos os tipos Meta Ads + Google Ads com benchmarks específicos por tipo.
 *
 * TIPOS SUPORTADOS:
 *   leads · conversao · vendas · engajamento · alcance · trafego
 *   video · app · catalogo · branding · mensagens · retargeting · desconhecido
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type TipoCampanha =
  | "leads"
  | "conversao"
  | "vendas"
  | "engajamento"
  | "alcance"
  | "trafego"
  | "video"
  | "app"
  | "catalogo"
  | "branding"
  | "mensagens"
  | "retargeting"
  | "desconhecido";

export type MetricaPrincipal = "CPL" | "ROAS" | "CPE" | "CPM" | "CPC" | "CPV" | "CPI" | "CTR";

export interface BenchmarkTipo {
  /** Métrica mais importante para avaliar essa campanha */
  metricaPrincipal: MetricaPrincipal;

  /** CPL ideal e crítico (campanhas orientadas a lead) */
  cplIdeal?: number;
  cplCritico?: number;

  /** ROAS mínimo e excelente */
  roasMinimo?: number;
  roasExcelente?: number;

  /** CPM máximo aceitável (R$) */
  cpmMaximo?: number;

  /** CPC máximo aceitável (R$) */
  cpcMaximo?: number;

  /** CTR mínimo esperado (%) */
  ctrMinimo?: number;

  /** CPV máximo aceitável (R$ por visualização) */
  cpvMaximo?: number;

  /** CPI máximo aceitável (R$ por instalação) */
  cpiMaximo?: number;

  /** CPE máximo aceitável (R$ por engajamento) */
  cpeMaximo?: number;

  /** Taxa mínima de visualização de vídeo (%) */
  viewRateMinimo?: number;

  /** Peso de cada dimensão no score (soma deve ser 1.0) */
  pesos: {
    retorno: number;   // ROAS / CPL
    eficiencia: number; // CPC / CPM / CTR
    volume: number;    // leads / alcance / views
    custo: number;     // gasto vs orçamento
  };

  /** Label amigável para exibição */
  label: string;
  emoji: string;
  cor: string; // tailwind color class
}

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARKS POR TIPO
// ─────────────────────────────────────────────────────────────────────────────

export const BENCHMARKS_POR_TIPO: Record<TipoCampanha, BenchmarkTipo> = {
  leads: {
    metricaPrincipal: "CPL",
    cplIdeal: 30,
    cplCritico: 80,
    roasMinimo: 2.0,
    roasExcelente: 4.0,
    ctrMinimo: 0.8,
    pesos: { retorno: 0.45, eficiencia: 0.25, volume: 0.20, custo: 0.10 },
    label: "Geração de Leads",
    emoji: "🎯",
    cor: "text-blue-400",
  },

  conversao: {
    metricaPrincipal: "ROAS",
    roasMinimo: 2.5,
    roasExcelente: 5.0,
    cplIdeal: 50,
    cplCritico: 150,
    ctrMinimo: 1.0,
    pesos: { retorno: 0.55, eficiencia: 0.20, volume: 0.15, custo: 0.10 },
    label: "Conversão",
    emoji: "💳",
    cor: "text-emerald-400",
  },

  vendas: {
    metricaPrincipal: "ROAS",
    roasMinimo: 3.0,
    roasExcelente: 6.0,
    cpcMaximo: 5.0,
    ctrMinimo: 1.2,
    pesos: { retorno: 0.60, eficiencia: 0.20, volume: 0.10, custo: 0.10 },
    label: "Vendas",
    emoji: "🛒",
    cor: "text-green-400",
  },

  catalogo: {
    metricaPrincipal: "ROAS",
    roasMinimo: 4.0,
    roasExcelente: 8.0,
    cpcMaximo: 3.0,
    ctrMinimo: 1.5,
    pesos: { retorno: 0.65, eficiencia: 0.15, volume: 0.10, custo: 0.10 },
    label: "Catálogo / Shopping",
    emoji: "🏪",
    cor: "text-violet-400",
  },

  retargeting: {
    metricaPrincipal: "ROAS",
    roasMinimo: 4.0,
    roasExcelente: 7.0,
    cplIdeal: 20,
    cplCritico: 60,
    ctrMinimo: 1.5,
    pesos: { retorno: 0.55, eficiencia: 0.25, volume: 0.10, custo: 0.10 },
    label: "Retargeting",
    emoji: "🔄",
    cor: "text-cyan-400",
  },

  trafego: {
    metricaPrincipal: "CPC",
    cpcMaximo: 2.0,
    ctrMinimo: 1.0,
    roasMinimo: 1.0,
    roasExcelente: 2.5,
    pesos: { retorno: 0.20, eficiencia: 0.50, volume: 0.20, custo: 0.10 },
    label: "Tráfego",
    emoji: "🌐",
    cor: "text-sky-400",
  },

  engajamento: {
    metricaPrincipal: "CPE",
    cpeMaximo: 0.50,
    ctrMinimo: 0.5,
    roasMinimo: 0.5,
    roasExcelente: 1.5,
    pesos: { retorno: 0.15, eficiencia: 0.35, volume: 0.40, custo: 0.10 },
    label: "Engajamento",
    emoji: "❤️",
    cor: "text-pink-400",
  },

  alcance: {
    metricaPrincipal: "CPM",
    cpmMaximo: 25.0,
    ctrMinimo: 0.3,
    roasMinimo: 1.0,
    roasExcelente: 2.0,
    pesos: { retorno: 0.10, eficiencia: 0.30, volume: 0.50, custo: 0.10 },
    label: "Alcance / Awareness",
    emoji: "📡",
    cor: "text-orange-400",
  },

  branding: {
    metricaPrincipal: "CPM",
    cpmMaximo: 30.0,
    ctrMinimo: 0.2,
    roasMinimo: 1.0,
    roasExcelente: 2.0,
    pesos: { retorno: 0.10, eficiencia: 0.25, volume: 0.55, custo: 0.10 },
    label: "Branding",
    emoji: "🏷️",
    cor: "text-amber-400",
  },

  video: {
    metricaPrincipal: "CPV",
    cpvMaximo: 0.30,
    viewRateMinimo: 25,
    ctrMinimo: 0.3,
    roasMinimo: 1.0,
    roasExcelente: 2.5,
    pesos: { retorno: 0.15, eficiencia: 0.25, volume: 0.50, custo: 0.10 },
    label: "Visualizações de Vídeo",
    emoji: "🎬",
    cor: "text-red-400",
  },

  app: {
    metricaPrincipal: "CPI",
    cpiMaximo: 15.0,
    ctrMinimo: 0.5,
    roasMinimo: 1.5,
    roasExcelente: 3.0,
    pesos: { retorno: 0.30, eficiencia: 0.20, volume: 0.40, custo: 0.10 },
    label: "Instalações de App",
    emoji: "📱",
    cor: "text-indigo-400",
  },

  mensagens: {
    metricaPrincipal: "CPL",
    cplIdeal: 15,
    cplCritico: 50,
    roasMinimo: 1.5,
    roasExcelente: 4.0,
    pesos: { retorno: 0.40, eficiencia: 0.25, volume: 0.25, custo: 0.10 },
    label: "Mensagens / WhatsApp",
    emoji: "💬",
    cor: "text-teal-400",
  },

  desconhecido: {
    metricaPrincipal: "ROAS",
    roasMinimo: 2.0,
    roasExcelente: 4.0,
    cplIdeal: 40,
    cplCritico: 100,
    ctrMinimo: 0.8,
    pesos: { retorno: 0.40, eficiencia: 0.25, volume: 0.20, custo: 0.15 },
    label: "Campanha",
    emoji: "📊",
    cor: "text-white/60",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DETECÇÃO AUTOMÁTICA DE TIPO (por nome + métricas)
// ─────────────────────────────────────────────────────────────────────────────

const KEYWORDS: Record<TipoCampanha, string[]> = {
  leads:       ["lead", "leads", "cadastro", "formulario", "formulário", "captacao", "captação", "contato", "geração", "geracao"],
  conversao:   ["conversao", "conversão", "convert", "compra", "checkout", "purchase", "venda direta"],
  vendas:      ["venda", "vendas", "sale", "sales", "receita", "ecommerce", "e-commerce", "loja"],
  catalogo:    ["catalogo", "catálogo", "catalog", "shopping", "produto", "produtos", "collection"],
  retargeting: ["retargeting", "remarketing", "remarket", "retarget", "reengajamento", "reengagement", "abandoned"],
  trafego:     ["trafego", "tráfego", "traffic", "visita", "visitas", "clique", "link", "pagina"],
  engajamento: ["engajamento", "engagement", "curtida", "like", "comentario", "comment", "interacao", "interação", "post"],
  alcance:     ["alcance", "reach", "awareness", "reconhecimento", "cobertura", "audiencia"],
  branding:    ["branding", "brand", "marca", "institucional", "imagem", "posicionamento"],
  video:       ["video", "vídeo", "view", "views", "visualizacao", "visualização", "watch", "reel", "stories"],
  app:         ["app", "aplicativo", "instalacao", "instalação", "install", "download", "mobile"],
  mensagens:   ["mensagem", "mensagens", "message", "whatsapp", "wpp", "chat", "conversa", "inbox", "direct"],
  desconhecido: [],
};

/**
 * Detecta o tipo de campanha pelo nome.
 * Retorna "desconhecido" se não encontrar match.
 */
export function detectarTipoPorNome(nomeCampanha: string): TipoCampanha {
  const nome = nomeCampanha.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Ordem importa: tipos mais específicos antes dos genéricos
  const ordem: TipoCampanha[] = [
    "retargeting", "catalogo", "app", "mensagens",
    "conversao", "vendas", "leads",
    "video", "engajamento", "trafego",
    "alcance", "branding",
  ];

  for (const tipo of ordem) {
    const keywords = KEYWORDS[tipo];
    if (keywords.some(kw => nome.includes(kw))) return tipo;
  }

  return "desconhecido";
}

/**
 * Detecta o tipo por métricas quando o nome não é suficiente.
 * Usa heurísticas baseadas nos valores reais.
 */
export function detectarTipoPorMetricas(dados: {
  cliques?: number;
  contatos?: number;
  impressoes?: number;
  ctr?: number;
  cpm?: number;
  gasto_total?: number;
}): TipoCampanha {
  const { cliques = 0, contatos = 0, impressoes = 0, ctr = 0, cpm = 0, gasto_total = 0 } = dados;

  // Se tem muitos contatos → leads
  if (contatos > 0 && gasto_total > 0) {
    const cpl = gasto_total / contatos;
    if (cpl < 200) return "leads";
  }

  // Muitas impressões com pouco CTR → alcance/branding
  if (impressoes > 5000 && ctr > 0 && ctr < 0.5) return "alcance";

  // CTR alto com cliques → trafego
  if (cliques > 0 && ctr > 1.5) return "trafego";

  // CPM muito baixo → alcance
  if (cpm > 0 && cpm < 5) return "alcance";

  return "desconhecido";
}

/**
 * Resolve o tipo final combinando nome + métricas + campo do banco.
 * Prioridade: campo banco > nome > métricas
 */
export function resolverTipo(
  nomeCampanha: string,
  tipoBanco?: string | null,
  metricas?: Parameters<typeof detectarTipoPorMetricas>[0]
): TipoCampanha {
  // 1. Campo explícito no banco
  if (tipoBanco && tipoBanco !== "desconhecido" && tipoBanco in BENCHMARKS_POR_TIPO) {
    return tipoBanco as TipoCampanha;
  }

  // 2. Detecção por nome
  const porNome = detectarTipoPorNome(nomeCampanha);
  if (porNome !== "desconhecido") return porNome;

  // 3. Detecção por métricas
  if (metricas) {
    const porMetricas = detectarTipoPorMetricas(metricas);
    if (porMetricas !== "desconhecido") return porMetricas;
  }

  return "desconhecido";
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULO DE MÉTRICAS POR TIPO
// ─────────────────────────────────────────────────────────────────────────────

export interface InputMetricasTipo {
  gasto_total: number;
  contatos: number;
  impressoes?: number;
  cliques?: number;
  ctr?: number;
  cpm?: number;
  alcance?: number;
  orcamento?: number;
  // campos opcionais para tipos específicos
  visualizacoes?: number;
  instalacoes?: number;
  engajamentos?: number;
  mensagens_iniciadas?: number;
  receita_estimada?: number;
}

export interface MetricasCalculadas {
  tipo: TipoCampanha;
  benchmark: BenchmarkTipo;
  metricaPrincipalValor: number;
  metricaPrincipalLabel: string;

  // Métricas base
  cpl: number;
  roas: number;
  cpc: number;
  cpm: number;
  ctr: number;
  margem: number;
  receita: number;
  lucro: number;
  pctGasto: number;

  // Métricas específicas por tipo
  cpv?: number;      // custo por visualização
  cpi?: number;      // custo por instalação
  cpe?: number;      // custo por engajamento
  cplMensagem?: number; // custo por mensagem iniciada
  viewRate?: number; // taxa de visualização

  // Score e avaliação
  score: number;
  scoreDetalhado: {
    retorno: number;
    eficiencia: number;
    volume: number;
    custo: number;
  };

  // Status
  statusMetrica: "otimo" | "bom" | "atencao" | "critico";
  ctaTipo: "escalar" | "manter" | "revisar" | "pausar";
}

/**
 * Calcula o score de retorno baseado no tipo de campanha.
 * Cada tipo tem sua métrica principal com benchmarks próprios.
 */
function scoreRetorno(tipo: TipoCampanha, dados: MetricasCalculadas, bench: BenchmarkTipo): number {
  switch (tipo) {
    case "leads":
    case "mensagens": {
      const cpl = dados.cpl;
      if (cpl <= 0) return 30;
      if (cpl <= (bench.cplIdeal ?? 30)) return 100;
      if (cpl <= (bench.cplIdeal ?? 30) * 1.5) return 80;
      if (cpl <= (bench.cplCritico ?? 80)) return 55;
      return 20;
    }

    case "conversao":
    case "vendas":
    case "catalogo":
    case "retargeting": {
      const roas = dados.roas;
      if (roas <= 0) return 20;
      if (roas >= (bench.roasExcelente ?? 4)) return 100;
      if (roas >= (bench.roasMinimo ?? 2) * 1.5) return 80;
      if (roas >= (bench.roasMinimo ?? 2)) return 60;
      return 25;
    }

    case "trafego": {
      const cpc = dados.cpc;
      if (cpc <= 0) return 50;
      if (cpc <= (bench.cpcMaximo ?? 2) * 0.5) return 100;
      if (cpc <= (bench.cpcMaximo ?? 2)) return 70;
      return 30;
    }

    case "alcance":
    case "branding": {
      const cpm = dados.cpm;
      if (cpm <= 0) return 50;
      if (cpm <= (bench.cpmMaximo ?? 25) * 0.5) return 100;
      if (cpm <= (bench.cpmMaximo ?? 25)) return 70;
      return 35;
    }

    case "video": {
      const cpv = dados.cpv ?? 0;
      if (cpv <= 0) return 50;
      if (cpv <= (bench.cpvMaximo ?? 0.3) * 0.5) return 100;
      if (cpv <= (bench.cpvMaximo ?? 0.3)) return 70;
      return 30;
    }

    case "app": {
      const cpi = dados.cpi ?? 0;
      if (cpi <= 0) return 50;
      if (cpi <= (bench.cpiMaximo ?? 15) * 0.5) return 100;
      if (cpi <= (bench.cpiMaximo ?? 15)) return 70;
      return 30;
    }

    case "engajamento": {
      const cpe = dados.cpe ?? 0;
      if (cpe <= 0) return 50;
      if (cpe <= (bench.cpeMaximo ?? 0.5) * 0.5) return 100;
      if (cpe <= (bench.cpeMaximo ?? 0.5)) return 70;
      return 30;
    }

    default:
      return dados.roas >= (bench.roasMinimo ?? 2) ? 70 : 35;
  }
}

function scoreEficiencia(tipo: TipoCampanha, dados: MetricasCalculadas, bench: BenchmarkTipo): number {
  const ctr = dados.ctr;
  const ctrMin = bench.ctrMinimo ?? 0.8;

  if (tipo === "trafego" || tipo === "catalogo") {
    const cpc = dados.cpc;
    const cpcMax = bench.cpcMaximo ?? 2;
    const scoreCPC = cpc > 0 ? Math.max(0, Math.min(100, ((cpcMax - cpc) / cpcMax) * 100)) : 50;
    const scoreCTR = ctr > 0 ? Math.min(100, (ctr / ctrMin) * 60) : 20;
    return Math.round((scoreCPC * 0.6) + (scoreCTR * 0.4));
  }

  if (tipo === "alcance" || tipo === "branding") {
    const cpm = dados.cpm;
    const cpmMax = bench.cpmMaximo ?? 25;
    return cpm > 0 ? Math.max(0, Math.min(100, ((cpmMax - cpm) / cpmMax) * 100)) : 50;
  }

  if (ctr <= 0) return 30;
  if (ctr >= ctrMin * 3) return 100;
  if (ctr >= ctrMin * 2) return 85;
  if (ctr >= ctrMin) return 65;
  if (ctr >= ctrMin * 0.5) return 40;
  return 20;
}

function scoreVolume(tipo: TipoCampanha, dados: InputMetricasTipo, bench: BenchmarkTipo): number {
  const { contatos = 0, impressoes = 0, visualizacoes = 0, instalacoes = 0, engajamentos = 0 } = dados;

  switch (tipo) {
    case "leads":
    case "mensagens":
    case "conversao":
    case "vendas":
    case "retargeting":
      if (contatos >= 100) return 100;
      if (contatos >= 30)  return 80;
      if (contatos >= 10)  return 60;
      if (contatos >= 3)   return 40;
      return 10;

    case "alcance":
    case "branding":
      if (impressoes >= 100000) return 100;
      if (impressoes >= 30000)  return 80;
      if (impressoes >= 10000)  return 60;
      if (impressoes >= 3000)   return 40;
      return 20;

    case "video":
      if (visualizacoes >= 10000) return 100;
      if (visualizacoes >= 3000)  return 80;
      if (visualizacoes >= 1000)  return 60;
      if (visualizacoes >= 300)   return 40;
      return 20;

    case "app":
      if (instalacoes >= 500) return 100;
      if (instalacoes >= 100) return 80;
      if (instalacoes >= 30)  return 60;
      if (instalacoes >= 10)  return 40;
      return 20;

    case "engajamento":
      if (engajamentos >= 5000) return 100;
      if (engajamentos >= 1000) return 80;
      if (engajamentos >= 300)  return 60;
      if (engajamentos >= 50)   return 40;
      return 20;

    case "trafego":
      // volume de cliques
      const cliques = dados.cliques ?? 0;
      if (cliques >= 1000) return 100;
      if (cliques >= 300)  return 80;
      if (cliques >= 100)  return 60;
      if (cliques >= 30)   return 40;
      return 20;

    default:
      return contatos > 0 ? 60 : 30;
  }
}

function scoreCusto(gasto: number, orcamento: number): number {
  if (orcamento <= 0) return 70; // sem orçamento definido → neutro
  const pct = (gasto / orcamento) * 100;
  if (pct > 100) return 20; // estourou orçamento
  if (pct > 95)  return 40;
  if (pct > 85)  return 65;
  if (pct > 50)  return 85;
  return 90;
}

/**
 * Função principal: calcula todas as métricas para uma campanha,
 * respeitando seu tipo e os benchmarks correspondentes.
 */
export function calcMetricasPorTipo(
  input: InputMetricasTipo,
  tipo: TipoCampanha,
  ticket = 450,
  conv = 0.04
): MetricasCalculadas {
  const bench = BENCHMARKS_POR_TIPO[tipo];
  const {
    gasto_total: gasto = 0,
    contatos = 0,
    impressoes = 0,
    cliques = 0,
    orcamento = 0,
    visualizacoes = 0,
    instalacoes = 0,
    engajamentos = 0,
    mensagens_iniciadas = 0,
    receita_estimada,
  } = input;

  // CTR: real se cliques+impressões disponíveis, senão usa campo
  const ctr = cliques > 0 && impressoes > 0
    ? (cliques / impressoes) * 100
    : (input.ctr ?? 0);

  // CPM
  const cpm = impressoes > 0 ? (gasto / impressoes) * 1000 : (input.cpm ?? 0);

  // CPC
  const cpc = cliques > 0 ? gasto / cliques : 0;

  // CPL (custo por lead/contato)
  const cpl = contatos > 0 ? gasto / contatos : 0;

  // Receita: usa receita_estimada se disponível, senão calcula
  const receita = receita_estimada && receita_estimada > 0
    ? receita_estimada
    : contatos * conv * ticket;

  const lucro = receita - gasto;
  const margem = receita > 0 ? lucro / receita : 0;
  const roas = gasto > 0 ? receita / gasto : 0;
  const pctGasto = orcamento > 0 ? Math.min((gasto / orcamento) * 100, 100) : 0;

  // Métricas específicas por tipo
  const cpv = visualizacoes > 0 ? gasto / visualizacoes : undefined;
  const cpi = instalacoes > 0 ? gasto / instalacoes : undefined;
  const cpe = engajamentos > 0 ? gasto / engajamentos : undefined;
  const cplMensagem = mensagens_iniciadas > 0 ? gasto / mensagens_iniciadas : undefined;
  const viewRate = impressoes > 0 && visualizacoes > 0
    ? (visualizacoes / impressoes) * 100
    : undefined;

  // Monta objeto parcial para calcular scores
  const parcial: MetricasCalculadas = {
    tipo, benchmark: bench,
    metricaPrincipalValor: 0, metricaPrincipalLabel: "",
    cpl, roas, cpc, cpm, ctr, margem, receita, lucro, pctGasto,
    cpv, cpi, cpe, cplMensagem, viewRate,
    score: 0,
    scoreDetalhado: { retorno: 0, eficiencia: 0, volume: 0, custo: 0 },
    statusMetrica: "atencao",
    ctaTipo: "manter",
  };

  // Calcula scores por dimensão
  const sRetorno    = scoreRetorno(tipo, parcial, bench);
  const sEficiencia = scoreEficiencia(tipo, parcial, bench);
  const sVolume     = scoreVolume(tipo, input, bench);
  const sCusto      = scoreCusto(gasto, orcamento);

  const { pesos } = bench;
  const scoreTotal = Math.round(
    sRetorno    * pesos.retorno +
    sEficiencia * pesos.eficiencia +
    sVolume     * pesos.volume +
    sCusto      * pesos.custo
  );

  // Métrica principal e label
  let metricaPrincipalValor = 0;
  let metricaPrincipalLabel = "";
  switch (bench.metricaPrincipal) {
    case "CPL": metricaPrincipalValor = cplMensagem ?? cpl;  metricaPrincipalLabel = `R$${(cplMensagem ?? cpl).toFixed(2)}`; break;
    case "ROAS": metricaPrincipalValor = roas;  metricaPrincipalLabel = `${roas.toFixed(2)}×`; break;
    case "CPC":  metricaPrincipalValor = cpc;   metricaPrincipalLabel = `R$${cpc.toFixed(2)}`; break;
    case "CPM":  metricaPrincipalValor = cpm;   metricaPrincipalLabel = `R$${cpm.toFixed(2)}`; break;
    case "CPV":  metricaPrincipalValor = cpv ?? 0; metricaPrincipalLabel = `R$${(cpv ?? 0).toFixed(3)}`; break;
    case "CPI":  metricaPrincipalValor = cpi ?? 0; metricaPrincipalLabel = `R$${(cpi ?? 0).toFixed(2)}`; break;
    case "CPE":  metricaPrincipalValor = cpe ?? 0; metricaPrincipalLabel = `R$${(cpe ?? 0).toFixed(3)}`; break;
    case "CTR":  metricaPrincipalValor = ctr;   metricaPrincipalLabel = `${ctr.toFixed(2)}%`; break;
  }

  // Status geral
  let statusMetrica: MetricasCalculadas["statusMetrica"] = "atencao";
  if (scoreTotal >= 80) statusMetrica = "otimo";
  else if (scoreTotal >= 60) statusMetrica = "bom";
  else if (scoreTotal >= 40) statusMetrica = "atencao";
  else statusMetrica = "critico";

  // CTA baseado no tipo e score
  let ctaTipo: MetricasCalculadas["ctaTipo"] = "manter";
  if (scoreTotal >= 80) ctaTipo = "escalar";
  else if (scoreTotal >= 60) ctaTipo = "manter";
  else if (scoreTotal >= 40) ctaTipo = "revisar";
  else ctaTipo = "pausar";

  return {
    ...parcial,
    metricaPrincipalValor,
    metricaPrincipalLabel,
    score: Math.max(0, Math.min(100, scoreTotal)),
    scoreDetalhado: {
      retorno:    Math.round(sRetorno),
      eficiencia: Math.round(sEficiencia),
      volume:     Math.round(sVolume),
      custo:      Math.round(sCusto),
    },
    statusMetrica,
    ctaTipo,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE EXIBIÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/** Retorna o badge de tipo para exibição nos cards */
export function badgeTipo(tipo: TipoCampanha): { label: string; emoji: string; cor: string } {
  const b = BENCHMARKS_POR_TIPO[tipo];
  return { label: b.label, emoji: b.emoji, cor: b.cor };
}

/** CTA específico por tipo e score */
export function ctaDoTipo(
  tipo: TipoCampanha,
  score: number
): { label: string; acao: string; color: string } {
  if (score >= 80) {
    const ctaMap: Partial<Record<TipoCampanha, string>> = {
      leads:      "Escalar orçamento 20%",
      conversao:  "Expandir audiência",
      vendas:     "Escalar budget",
      catalogo:   "Ampliar catálogo",
      retargeting:"Ampliar janela",
      trafego:    "Escalar tráfego",
      video:      "Ampliar distribuição",
      app:        "Escalar instalações",
    };
    return {
      label: ctaMap[tipo] ?? "Escalar 20%",
      acao: "escalar",
      color: "text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10",
    };
  }

  if (score >= 60) {
    return {
      label: "Monitorar métricas",
      acao: "monitorar",
      color: "text-sky-400 border-sky-500/20 hover:bg-sky-500/10",
    };
  }

  if (score >= 40) {
    const ctaMap: Partial<Record<TipoCampanha, string>> = {
      leads:      "Revisar segmentação",
      conversao:  "Revisar funil",
      video:      "Trocar criativo",
      engajamento:"Testar novo criativo",
      trafego:    "Revisar segmentação",
    };
    return {
      label: ctaMap[tipo] ?? "Revisar campanha",
      acao: "revisar",
      color: "text-amber-400 border-amber-500/20 hover:bg-amber-500/10",
    };
  }

  return {
    label: "Pausar campanha",
    acao: "pausar",
    color: "text-red-400 border-red-500/20 hover:bg-red-500/10",
  };
}