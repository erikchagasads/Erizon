/**
 * Pre-flight Engine
 * Analisa o setup de uma campanha ANTES de lançar e retorna score 0-100 + riscos.
 * Previne dinheiro desperdiçado detectando problemas antes da veiculação.
 */

export type PreflightSeverity = "critical" | "warning" | "info";

export type PreflightRisk = {
  id: string;
  severity: PreflightSeverity;
  label: string;
  detail: string;
  recommendation: string;
  impactScore: number;  // pontos que subtrai do score (0-100)
};

export type PreflightInput = {
  // Básico
  objetivo: string;          // LEADS, SALES, TRAFFIC, AWARENESS, etc.
  orcamentoDiario: number;   // R$
  audienciaSize?: number;    // tamanho do público estimado
  criativo?: {
    formato: string;         // video, imagem, carrossel
    temTexto?: boolean;
    temCTA?: boolean;
    duracaoSegundos?: number; // para vídeos
  };
  urlDestino?: string;
  velocidadeUrl?: number;    // segundos de load (Core Web Vitals)

  // Histórico do cliente (opcional — vem do Profit DNA)
  historicoCpl?: number;
  historicoRoas?: number;
  cplAlvo?: number;
  roasAlvo?: number;
  metaCpl?: number;
  metaLeads?: number;

  // Benchmarks do nicho (opcional)
  benchmarkCpl?: number;
  benchmarkRoas?: number;

  // Contexto adicional
  temPixel?: boolean;
  publicoCustom?: boolean;   // usa Custom Audience ou Lookalike
  diasDeSemana?: number[];   // dias programados (0-6)
};

export type PreflightResult = {
  score: number;                // 0-100
  classification: "excellent" | "good" | "risky" | "critical";
  risks: PreflightRisk[];
  estimatedCplMin: number | null;
  estimatedCplMax: number | null;
  estimatedRoas: number | null;
  topRecommendation: string;
  readyToLaunch: boolean;
};

export function runPreflight(input: PreflightInput): PreflightResult {
  const risks: PreflightRisk[] = [];
  let score = 100;

  // ── 1. Orçamento ─────────────────────────────────────────────────────────
  if (input.orcamentoDiario < 20) {
    risks.push({
      id: "budget_too_low",
      severity: "critical",
      label: "Orçamento abaixo do mínimo",
      detail: `R$${input.orcamentoDiario}/dia é insuficiente. Meta precisa de ao menos R$30-50/dia para sair da fase de aprendizado.`,
      recommendation: "Aumente para pelo menos R$50/dia para ter dados suficientes em 7 dias.",
      impactScore: 30,
    });
    score -= 30;
  } else if (input.orcamentoDiario < 50) {
    risks.push({
      id: "budget_low",
      severity: "warning",
      label: "Orçamento baixo para aprendizado",
      detail: `R$${input.orcamentoDiario}/dia pode levar mais tempo para sair da fase de aprendizado.`,
      recommendation: "Considere R$80-100/dia nos primeiros 7 dias para acelerar o aprendizado do algoritmo.",
      impactScore: 12,
    });
    score -= 12;
  }

  // ── 2. Público ────────────────────────────────────────────────────────────
  if (input.audienciaSize !== undefined) {
    if (input.audienciaSize > 10_000_000 && input.objetivo === "LEADS") {
      risks.push({
        id: "audience_too_broad",
        severity: "warning",
        label: "Público muito amplo para geração de leads",
        detail: `${(input.audienciaSize / 1_000_000).toFixed(1)}M pessoas é amplo demais. CPL tende a ser 2-3x maior.`,
        recommendation: "Refine para 500k-3M pessoas usando interesses específicos ou Lookalike.",
        impactScore: 15,
      });
      score -= 15;
    } else if (input.audienciaSize < 50_000) {
      risks.push({
        id: "audience_too_narrow",
        severity: "warning",
        label: "Público muito pequeno",
        detail: `${input.audienciaSize.toLocaleString()} pessoas pode gerar saturação rápida e CPM alto.`,
        recommendation: "Amplie para pelo menos 100-200k pessoas ou use Lookalike 2-5%.",
        impactScore: 10,
      });
      score -= 10;
    }
  }

  if (!input.publicoCustom) {
    risks.push({
      id: "no_custom_audience",
      severity: "info",
      label: "Sem Custom Audience ou Lookalike",
      detail: "Campanhas com audiences baseadas em dados próprios convertem até 3x melhor.",
      recommendation: "Crie um Lookalike do seu banco de leads ou use retargeting de visitantes.",
      impactScore: 8,
    });
    score -= 8;
  }

  // ── 3. Pixel / Rastreamento ───────────────────────────────────────────────
  if (input.temPixel === false) {
    risks.push({
      id: "no_pixel",
      severity: "critical",
      label: "Pixel do Meta não configurado",
      detail: "Sem o pixel, o algoritmo não aprende quem converteu e o CPL dispara.",
      recommendation: "Instale o Pixel do Meta e configure os eventos de conversão antes de lançar.",
      impactScore: 35,
    });
    score -= 35;
  }

  // ── 4. Criativo ───────────────────────────────────────────────────────────
  if (input.criativo) {
    const c = input.criativo;

    if (!c.temCTA) {
      risks.push({
        id: "no_cta",
        severity: "warning",
        label: "Sem chamada para ação (CTA)",
        detail: "Criativos sem CTA claro têm CTR até 40% menor.",
        recommendation: "Adicione um CTA direto: 'Fale agora', 'Acesse aqui', 'Saiba mais'.",
        impactScore: 10,
      });
      score -= 10;
    }

    if (c.formato === "video" && c.duracaoSegundos !== undefined) {
      if (c.duracaoSegundos > 60) {
        risks.push({
          id: "video_too_long",
          severity: "warning",
          label: "Vídeo longo para tráfego pago",
          detail: `${c.duracaoSegundos}s é longo. 70% das pessoas saem antes de 15s no feed.`,
          recommendation: "Corte para 15-30s com o gancho nos primeiros 3 segundos.",
          impactScore: 8,
        });
        score -= 8;
      }
    }
  } else {
    risks.push({
      id: "no_creative_info",
      severity: "info",
      label: "Informações do criativo não fornecidas",
      detail: "Sem dados do criativo, não é possível analisar potencial de CTR.",
      recommendation: "Informe o formato do criativo para uma análise mais precisa.",
      impactScore: 5,
    });
    score -= 5;
  }

  // ── 5. Velocidade da URL ──────────────────────────────────────────────────
  if (input.velocidadeUrl !== undefined) {
    if (input.velocidadeUrl > 5) {
      risks.push({
        id: "slow_page",
        severity: "critical",
        label: "Página muito lenta",
        detail: `${input.velocidadeUrl.toFixed(1)}s de carregamento. Cada segundo acima de 3s reduz conversão em ~20%.`,
        recommendation: "Otimize para menos de 3s: comprima imagens, use CDN, minimize JS.",
        impactScore: 25,
      });
      score -= 25;
    } else if (input.velocidadeUrl > 3) {
      risks.push({
        id: "page_slow",
        severity: "warning",
        label: "Página com carregamento lento",
        detail: `${input.velocidadeUrl.toFixed(1)}s. Ideal é abaixo de 3s, especialmente no mobile.`,
        recommendation: "Otimize para menos de 3s para não perder leads no clique.",
        impactScore: 12,
      });
      score -= 12;
    }
  }

  // ── 6. Viabilidade financeira ─────────────────────────────────────────────
  if (input.metaCpl && input.benchmarkCpl && input.metaCpl < input.benchmarkCpl * 0.5) {
    risks.push({
      id: "unrealistic_cpl",
      severity: "critical",
      label: "Meta de CPL irrealista",
      detail: `CPL alvo de R$${input.metaCpl} é ${Math.round(100 - (input.metaCpl / input.benchmarkCpl) * 100)}% abaixo da média do nicho (R$${input.benchmarkCpl}).`,
      recommendation: `Ajuste a meta para R$${Math.round(input.benchmarkCpl * 0.7)}-${Math.round(input.benchmarkCpl)} que é realista para o nicho.`,
      impactScore: 15,
    });
    score -= 15;
  }

  // ── 7. Estimativa de CPL ──────────────────────────────────────────────────
  let estimatedCplMin: number | null = null;
  let estimatedCplMax: number | null = null;
  let estimatedRoas: number | null = null;

  if (input.benchmarkCpl) {
    const penaltyFactor = 1 + (100 - Math.max(0, score)) / 200;
    estimatedCplMin = Math.round(input.benchmarkCpl * 0.7 * penaltyFactor);
    estimatedCplMax = Math.round(input.benchmarkCpl * 1.4 * penaltyFactor);
  } else if (input.historicoCpl) {
    const penaltyFactor = 1 + (100 - Math.max(0, score)) / 250;
    estimatedCplMin = Math.round(input.historicoCpl * 0.8 * penaltyFactor);
    estimatedCplMax = Math.round(input.historicoCpl * 1.5 * penaltyFactor);
  }

  if (input.historicoRoas) {
    const penalty = 1 - (100 - Math.max(0, score)) / 300;
    estimatedRoas = parseFloat((input.historicoRoas * Math.max(0.3, penalty)).toFixed(1));
  } else if (input.benchmarkRoas) {
    estimatedRoas = parseFloat((input.benchmarkRoas * 0.85).toFixed(1));
  }

  // Garantir score dentro dos limites
  score = Math.max(0, Math.min(100, Math.round(score)));

  const classification =
    score >= 80 ? "excellent" :
    score >= 60 ? "good" :
    score >= 40 ? "risky" :
    "critical";

  // Recomendação principal
  const criticals = risks.filter(r => r.severity === "critical");
  const topRecommendation =
    criticals.length > 0
      ? criticals[0].recommendation
      : risks.length > 0
      ? risks[0].recommendation
      : "Campanha bem configurada. Monitore o CPL nos primeiros 3 dias e ajuste o público se necessário.";

  return {
    score,
    classification,
    risks: risks.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    }),
    estimatedCplMin,
    estimatedCplMax,
    estimatedRoas,
    topRecommendation,
    readyToLaunch: score >= 60 && criticals.length === 0,
  };
}
