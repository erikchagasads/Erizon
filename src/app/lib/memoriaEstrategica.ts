// src/app/lib/memoriaEstrategica.ts
// Sistema de Memória Estratégica da Erizon
// Aprende com o histórico de decisões para calcular assertividade real da IA

import type { DecisaoHistorico } from "@/app/analytics/types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ResultadoDecisao {
  decisaoId: string;
  tipo: "pausar" | "escalar" | "ajustar" | "ignorar";
  campanhaNome: string;
  scoreAntes: number;
  scoreDepois?: number;
  roasAntes?: number;
  roasDepois?: number;
  lucroAntes?: number;
  lucroDepois?: number;
  melhorou: boolean | null; // null = ainda sem dados suficientes
  diasParaResultado?: number;
  confiancaIA: number;
}

export interface AssertividadeIA {
  totalDecisoes: number;
  comResultado: number;
  acertos: number;
  erros: number;
  semDados: number;
  taxaGeral: number;           // % de acertos sobre decisões com resultado
  taxaPorTipo: {
    pausar:  { total: number; acertos: number; taxa: number };
    escalar: { total: number; acertos: number; taxa: number };
    ajustar: { total: number; acertos: number; taxa: number };
  };
  impactoFinanceiro: {
    lucroRecuperado: number;   // soma dos lucros melhorados após pausas
    lucroGerado: number;       // soma dos lucros novos após escalas
    perdaEvitada: number;      // gasto economizado em campanhas pausadas
    totalGerado: number;
  };
  tendenciaAprendizado: "melhorando" | "estavel" | "piorando";
  ultimasDecisoes: ResultadoDecisao[];
  insightPrincipal: string;
}

export interface PadraoAprendido {
  condicao: string;           // "ROAS < 1.5 com CTR < 0.8"
  acaoRecomendada: string;
  taxaAcerto: number;
  amostras: number;
  confianca: "alta" | "media" | "baixa";
}

// ─── Funções ──────────────────────────────────────────────────────────────────

/**
 * Converte DecisaoHistorico[] em ResultadoDecisao[] com análise de melhora
 */
export function analisarResultadosDecisoes(
  decisoes: DecisaoHistorico[]
): ResultadoDecisao[] {
  return decisoes
    .filter(d => d.score_snapshot != null)
    .map(d => {
      const tipo = inferirTipo(d.acao);
      const scoreAntes = d.score_snapshot ?? 50;
      const scoreDepois = d.score_depois;
      const lucroAntes = d.lucro_snapshot;
      const lucroDepois = d.lucro_depois;

      let melhorou: boolean | null = null;

      if (scoreDepois != null) {
        if (tipo === "pausar") {
          // Pausa: sucesso = score da CONTA subiu ou gasto em risco caiu
          melhorou = scoreDepois > scoreAntes;
        } else if (tipo === "escalar") {
          // Escala: sucesso = lucro aumentou
          melhorou = lucroDepois != null && lucroAntes != null
            ? lucroDepois > lucroAntes
            : scoreDepois >= scoreAntes;
        } else {
          melhorou = scoreDepois >= scoreAntes;
        }
      }

      return {
        decisaoId: d.id ?? Math.random().toString(36),
        tipo,
        campanhaNome: d.campanha_nome ?? d.campanha,
        scoreAntes,
        scoreDepois,
        roasAntes: d.log_contexto?.roasAntes,
        lucroAntes,
        lucroDepois,
        melhorou,
        confiancaIA: d.confianca_engine ?? d.log_contexto?.confiancaEngine ?? 70,
      };
    });
}

/**
 * Calcula a assertividade completa da IA com base no histórico
 */
export function calcularAssertividade(
  decisoes: DecisaoHistorico[]
): AssertividadeIA {
  const resultados = analisarResultadosDecisoes(decisoes);
  const comResultado = resultados.filter(r => r.melhorou !== null);
  const acertos = comResultado.filter(r => r.melhorou === true);
  const erros = comResultado.filter(r => r.melhorou === false);
  const semDados = resultados.filter(r => r.melhorou === null);

  const taxaGeral = comResultado.length > 0
    ? Math.round((acertos.length / comResultado.length) * 100)
    : 0;

  // Taxa por tipo
  const calcTaxaTipo = (tipo: ResultadoDecisao["tipo"]) => {
    const desse = comResultado.filter(r => r.tipo === tipo);
    const acertosTipo = desse.filter(r => r.melhorou === true);
    return {
      total: resultados.filter(r => r.tipo === tipo).length,
      acertos: acertosTipo.length,
      taxa: desse.length > 0 ? Math.round((acertosTipo.length / desse.length) * 100) : 0,
    };
  };

  // Impacto financeiro
  const lucroRecuperado = acertos
    .filter(r => r.tipo === "pausar" && r.lucroDepois != null && r.lucroAntes != null)
    .reduce((s, r) => s + Math.max(0, (r.lucroDepois ?? 0) - (r.lucroAntes ?? 0)), 0);

  const lucroGerado = acertos
    .filter(r => r.tipo === "escalar" && r.lucroDepois != null && r.lucroAntes != null)
    .reduce((s, r) => s + Math.max(0, (r.lucroDepois ?? 0) - (r.lucroAntes ?? 0)), 0);

  // Tendência: comparar últimas 5 vs anteriores 5
  const ultimas5  = comResultado.slice(0, 5);
  const anteriores5 = comResultado.slice(5, 10);
  const taxaUltimas    = ultimas5.length > 0 ? ultimas5.filter(r => r.melhorou).length / ultimas5.length : 0;
  const taxaAnteriores = anteriores5.length > 0 ? anteriores5.filter(r => r.melhorou).length / anteriores5.length : 0;
  const tendenciaAprendizado: AssertividadeIA["tendenciaAprendizado"] =
    taxaUltimas > taxaAnteriores + 0.1 ? "melhorando" :
    taxaUltimas < taxaAnteriores - 0.1 ? "piorando"   : "estavel";

  // Insight principal
  const insightPrincipal = gerarInsightAssertividade(
    taxaGeral, acertos.length, erros.length, calcTaxaTipo("pausar"), calcTaxaTipo("escalar")
  );

  return {
    totalDecisoes:   resultados.length,
    comResultado:    comResultado.length,
    acertos:         acertos.length,
    erros:           erros.length,
    semDados:        semDados.length,
    taxaGeral,
    taxaPorTipo: {
      pausar:  calcTaxaTipo("pausar"),
      escalar: calcTaxaTipo("escalar"),
      ajustar: calcTaxaTipo("ajustar"),
    },
    impactoFinanceiro: {
      lucroRecuperado: Math.round(lucroRecuperado),
      lucroGerado:     Math.round(lucroGerado),
      perdaEvitada:    0, // calculado externamente
      totalGerado:     Math.round(lucroRecuperado + lucroGerado),
    },
    tendenciaAprendizado,
    ultimasDecisoes: resultados.slice(0, 10),
    insightPrincipal,
  };
}

/**
 * Identifica padrões aprendidos no histórico de decisões
 */
export function identificarPadroesAprendidos(
  decisoes: DecisaoHistorico[]
): PadraoAprendido[] {
  const resultados = analisarResultadosDecisoes(decisoes);
  const padroes: PadraoAprendido[] = [];

  // Padrão 1: Pausas com ROAS < 1.5 — funcionam?
  const pausasRoasBaixo = resultados.filter(
    r => r.tipo === "pausar" && (r.roasAntes ?? 0) < 1.5 && r.melhorou !== null
  );
  if (pausasRoasBaixo.length >= 3) {
    const taxa = Math.round(
      pausasRoasBaixo.filter(r => r.melhorou).length / pausasRoasBaixo.length * 100
    );
    padroes.push({
      condicao: "Campanhas com ROAS < 1.5×",
      acaoRecomendada: "Pausar imediatamente",
      taxaAcerto: taxa,
      amostras: pausasRoasBaixo.length,
      confianca: pausasRoasBaixo.length >= 8 ? "alta" : pausasRoasBaixo.length >= 4 ? "media" : "baixa",
    });
  }

  // Padrão 2: Escalas com score >= 75 — geram lucro?
  const escalasAltoScore = resultados.filter(
    r => r.tipo === "escalar" && r.scoreAntes >= 75 && r.melhorou !== null
  );
  if (escalasAltoScore.length >= 2) {
    const taxa = Math.round(
      escalasAltoScore.filter(r => r.melhorou).length / escalasAltoScore.length * 100
    );
    padroes.push({
      condicao: "Campanhas com Score ≥ 75",
      acaoRecomendada: "Escalar 20% do orçamento",
      taxaAcerto: taxa,
      amostras: escalasAltoScore.length,
      confianca: escalasAltoScore.length >= 6 ? "alta" : "media",
    });
  }

  // Padrão 3: Decisões de alta confiança (>= 85) são mais assertivas?
  const altaConfianca = resultados.filter(r => r.confiancaIA >= 85 && r.melhorou !== null);
  const baixaConfianca = resultados.filter(r => r.confiancaIA < 70 && r.melhorou !== null);
  if (altaConfianca.length >= 3 && baixaConfianca.length >= 3) {
    const taxaAlta  = altaConfianca.filter(r => r.melhorou).length / altaConfianca.length;
    const taxaBaixa = baixaConfianca.filter(r => r.melhorou).length / baixaConfianca.length;
    if (taxaAlta > taxaBaixa + 0.15) {
      padroes.push({
        condicao: "Engine com confiança ≥ 85%",
        acaoRecomendada: "Executar sem hesitar",
        taxaAcerto: Math.round(taxaAlta * 100),
        amostras: altaConfianca.length,
        confianca: "alta",
      });
    }
  }

  return padroes;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function inferirTipo(acao: string): ResultadoDecisao["tipo"] {
  const a = acao.toLowerCase();
  if (a.includes("paus")) return "pausar";
  if (a.includes("escal")) return "escalar";
  if (a.includes("ignor")) return "ignorar";
  return "ajustar";
}

function gerarInsightAssertividade(
  taxa: number,
  acertos: number,
  erros: number,
  taxaPausar: { taxa: number; total: number },
  taxaEscalar: { taxa: number; total: number }
): string {
  if (acertos + erros === 0) {
    return "Ainda sem dados suficientes. Execute decisões para a Erizon aprender.";
  }
  if (taxa >= 80) {
    return `Engine com ${taxa}% de assertividade — ${acertos} decisões corretas. Confie nas recomendações.`;
  }
  if (taxa >= 60) {
    const melhor = taxaPausar.taxa >= taxaEscalar.taxa ? "pausas" : "escalas";
    return `Taxa de ${taxa}%. Decisões de ${melhor} são mais assertivas. Continue alimentando o histórico.`;
  }
  if (erros > acertos) {
    return `${erros} decisões não geraram o resultado esperado. Revise os critérios de confiança mínima.`;
  }
  return `Dados insuficientes para padrão claro. Acumule mais ${Math.max(0, 10 - (acertos + erros))} decisões.`;
}
