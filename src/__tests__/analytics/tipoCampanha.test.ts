/**
 * tipoCampanha.test.ts
 * Tests for detectarTipoPorNome, detectarTipoPorMetricas, resolverTipo,
 * badgeTipo, ctaDoTipo, and calcMetricasPorTipo.
 */

import { describe, it, expect } from "vitest";
import {
  detectarTipoPorNome,
  detectarTipoPorMetricas,
  resolverTipo,
  badgeTipo,
  ctaDoTipo,
  calcMetricasPorTipo,
  BENCHMARKS_POR_TIPO,
} from "@/app/analytics/tipoCampanha";

// ─── detectarTipoPorNome ──────────────────────────────────────────────────────

describe("detectarTipoPorNome", () => {
  it("detects leads from name", () => expect(detectarTipoPorNome("CAMP - LEADS QUALIFICADOS")).toBe("leads"));
  it("detects conversao from name", () => expect(detectarTipoPorNome("Campanha Checkout Compra")).toBe("conversao"));
  it("detects vendas from name", () => expect(detectarTipoPorNome("Ecommerce Vendas Diretas")).toBe("vendas"));
  it("detects retargeting from name", () => expect(detectarTipoPorNome("Retargeting Fundo Funil")).toBe("retargeting"));
  it("detects trafego from name", () => expect(detectarTipoPorNome("TRAFEGO FRIO")).toBe("trafego"));
  it("detects video from name", () => expect(detectarTipoPorNome("Visualizações de Vídeo")).toBe("video"));
  it("detects app from name", () => expect(detectarTipoPorNome("Instalacoes App Mobile")).toBe("app"));
  it("detects mensagens from name", () => expect(detectarTipoPorNome("CAMP - MENSAGENS INBOX")).toBe("mensagens"));
  it("returns desconhecido for unrecognized name", () => expect(detectarTipoPorNome("CAMP-XYZ-042")).toBe("desconhecido"));
  it("is case insensitive", () => expect(detectarTipoPorNome("LEAD GENERATION")).toBe("leads"));
  it("normalizes accented characters", () => expect(detectarTipoPorNome("Geração de Leads")).toBe("leads"));
});

// ─── detectarTipoPorMetricas ──────────────────────────────────────────────────

describe("detectarTipoPorMetricas", () => {
  it("detects leads when contatos > 0 and reasonable CPL", () => {
    expect(detectarTipoPorMetricas({ contatos: 10, gasto_total: 500 })).toBe("leads");
  });

  it("detects alcance when high impressions with low CTR", () => {
    expect(detectarTipoPorMetricas({ impressoes: 10000, ctr: 0.3, gasto_total: 200 })).toBe("alcance");
  });

  it("detects trafego when high CTR", () => {
    expect(detectarTipoPorMetricas({ cliques: 500, ctr: 2.5, gasto_total: 300 })).toBe("trafego");
  });

  it("detects alcance when CPM is very low", () => {
    expect(detectarTipoPorMetricas({ cpm: 3, gasto_total: 100 })).toBe("alcance");
  });

  it("returns desconhecido for empty / zero metrics", () => {
    expect(detectarTipoPorMetricas({})).toBe("desconhecido");
  });
});

// ─── resolverTipo ─────────────────────────────────────────────────────────────

describe("resolverTipo", () => {
  it("uses name detection first (highest priority)", () => {
    expect(resolverTipo("CAMP LEADS FRIO", "unknown")).toBe("leads");
  });

  it("falls back to tipoBanco when name is unknown", () => {
    expect(resolverTipo("CAMP-ABC", "conversao")).toBe("conversao");
  });

  it("falls back to metrics when name and tipoBanco are unknown", () => {
    const metricas = { contatos: 5, gasto_total: 200 };
    expect(resolverTipo("CAMP-ABC", "desconhecido", metricas)).toBe("leads");
  });

  it("returns desconhecido when all fallbacks fail", () => {
    expect(resolverTipo("CAMP-ABC")).toBe("desconhecido");
  });

  it("ignores tipoBanco when name clearly identifies the type", () => {
    expect(resolverTipo("VIDEO AWARENESS REEL", "leads")).toBe("video");
  });
});

// ─── badgeTipo ────────────────────────────────────────────────────────────────

describe("badgeTipo", () => {
  it("returns correct label for leads type", () => {
    const b = badgeTipo("leads");
    expect(b.label).toBe("Geração de Leads");
  });

  it("returns non-empty emoji for all known types", () => {
    const tipos = Object.keys(BENCHMARKS_POR_TIPO) as Array<keyof typeof BENCHMARKS_POR_TIPO>;
    for (const tipo of tipos) {
      expect(badgeTipo(tipo).emoji.length).toBeGreaterThan(0);
    }
  });
});

// ─── ctaDoTipo ────────────────────────────────────────────────────────────────

describe("ctaDoTipo", () => {
  it("returns acao=escalar for score >= 80", () => {
    expect(ctaDoTipo("leads", 85).acao).toBe("escalar");
  });

  it("returns acao=monitorar for score 60–79", () => {
    expect(ctaDoTipo("leads", 65).acao).toBe("monitorar");
  });

  it("returns acao=revisar for score 40–59", () => {
    expect(ctaDoTipo("leads", 50).acao).toBe("revisar");
  });

  it("returns acao=pausar for score < 40", () => {
    expect(ctaDoTipo("leads", 30).acao).toBe("pausar");
  });
});

// ─── calcMetricasPorTipo ──────────────────────────────────────────────────────

describe("calcMetricasPorTipo", () => {
  it("calculates CPL correctly for leads campaign", () => {
    const result = calcMetricasPorTipo({ gasto_total: 300, contatos: 10 }, "leads");
    expect(result.cpl).toBeCloseTo(30, 2);
  });

  it("score is 0-100 range", () => {
    const result = calcMetricasPorTipo({ gasto_total: 200, contatos: 5 }, "leads");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("ctaTipo is escalar when score >= 80", () => {
    // Ideal CPL (≤30), high volume, reasonable spend
    const result = calcMetricasPorTipo({
      gasto_total: 200, contatos: 100, impressoes: 50000,
      cliques: 2000, orcamento: 300,
    }, "leads");
    if (result.score >= 80) {
      expect(result.ctaTipo).toBe("escalar");
    }
  });

  it("calculates ROAS for conversao campaign", () => {
    const result = calcMetricasPorTipo({ gasto_total: 100, contatos: 5, receita_estimada: 400 }, "conversao");
    expect(result.roas).toBeCloseTo(4.0, 2);
  });

  it("returns CPL as metricaPrincipalValor for leads type", () => {
    const result = calcMetricasPorTipo({ gasto_total: 300, contatos: 10 }, "leads");
    expect(result.metricaPrincipalValor).toBeCloseTo(30, 2);
    expect(result.metricaPrincipalLabel).toContain("R$");
  });

  it("handles zero gasto gracefully", () => {
    const result = calcMetricasPorTipo({ gasto_total: 0, contatos: 0 }, "leads");
    expect(result.roas).toBe(0);
    expect(result.cpl).toBe(0);
  });

  it("uses receita_estimada over calculated revenue when provided", () => {
    const result = calcMetricasPorTipo({ gasto_total: 100, contatos: 5, receita_estimada: 500 }, "leads");
    expect(result.receita).toBe(500);
  });
});
