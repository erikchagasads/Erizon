/**
 * decision-generator.test.ts
 * Tests for generateDecisions and resolveCockpitMode.
 */

import { describe, it, expect } from "vitest";
import { generateDecisions, resolveCockpitMode } from "@/core/decision-generator";
import type { EngineResult, CampanhaProcessada } from "@/app/lib/engine/pulseEngine";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCampanha(overrides: Partial<CampanhaProcessada>): CampanhaProcessada {
  return {
    id: "camp-1",
    nome_campanha: "Campanha Teste",
    gasto_total: 200,
    contatos: 5,
    orcamento: 500,
    status: "ACTIVE",
    gastoBase: 200,
    leadsBase: 5,
    orcamentoBase: 500,
    ctrBase: 1.5,
    gastoSimulado: 200,
    leadsSimulados: 5,
    receitaEstimada: 600,
    lucroLiquido: 400,
    margem: 0.67,
    roas: 3.0,
    perdaMensalProjetada: 0,
    budgetConsumo: 0.4,
    diasAtivo: 7,
    recomendacao: "manter",
    scoreCampanha: 70,
    indiceRelevancia: 70,
    ...overrides,
  };
}

function makeEngine(campanhas: CampanhaProcessada[], overrides: Partial<EngineResult> = {}): EngineResult {
  return {
    campanhas,
    totalGasto: campanhas.reduce((s, c) => s + c.gastoSimulado, 0),
    totalReceita: campanhas.reduce((s, c) => s + c.receitaEstimada, 0),
    totalLucro: 0,
    totalLeads: campanhas.reduce((s, c) => s + c.leadsSimulados, 0),
    margemGlobal: 0.3,
    roasGlobal: 2.5,
    score: 70,
    capitalEmRisco: 0,
    gastoCritico: 0,
    percentualRisco: 0,
    totalAtivos: campanhas.length,
    melhorAtivo: null,
    pausadasCount: 0,
    saudaveisCount: campanhas.length,
    gastoSubOtimo: 0,
    ...overrides,
  };
}

// ─── generateDecisions ────────────────────────────────────────────────────────

describe("generateDecisions — pause (zombie)", () => {
  it("generates pause decision for zombie campaign (zero leads, high spend)", () => {
    const zombie = makeCampanha({ leadsSimulados: 0, gastoSimulado: 200, scoreCampanha: 20 });
    const engine = makeEngine([zombie]);
    const result = generateDecisions("ws-1", engine, new Set());
    expect(result.some(d => d.action_type === "pause")).toBe(true);
  });

  it("does NOT pause a campaign with objetivo awareness even with zero leads", () => {
    const aware = makeCampanha({ leadsSimulados: 0, gastoSimulado: 200, objetivo: "awareness" });
    const engine = makeEngine([aware]);
    const result = generateDecisions("ws-1", engine, new Set());
    expect(result.some(d => d.action_type === "pause")).toBe(false);
  });

  it("skips duplicate pause decision already in existing set", () => {
    const zombie = makeCampanha({ id: "dup-1", leadsSimulados: 0, gastoSimulado: 200 });
    const engine = makeEngine([zombie]);
    const existing = new Set(["dup-1::pause"]);
    const result = generateDecisions("ws-1", engine, existing);
    expect(result.some(d => d.action_type === "pause")).toBe(false);
  });

  it("does NOT pause when gasto is under R$150 threshold", () => {
    const cheap = makeCampanha({ leadsSimulados: 0, gastoSimulado: 100 });
    const engine = makeEngine([cheap]);
    const result = generateDecisions("ws-1", engine, new Set());
    expect(result.some(d => d.action_type === "pause")).toBe(false);
  });
});

describe("generateDecisions — reduce_budget", () => {
  it("generates reduce_budget when ROAS < 1.0 and spend > R$100 with leads", () => {
    const bad = makeCampanha({ roas: 0.5, gastoSimulado: 200, leadsSimulados: 3 });
    const engine = makeEngine([bad]);
    const result = generateDecisions("ws-1", engine, new Set());
    expect(result.some(d => d.action_type === "reduce_budget")).toBe(true);
  });

  it("does NOT reduce_budget when there are zero leads", () => {
    const noLeads = makeCampanha({ roas: 0.5, gastoSimulado: 200, leadsSimulados: 0 });
    const engine = makeEngine([noLeads]);
    const result = generateDecisions("ws-1", engine, new Set());
    expect(result.some(d => d.action_type === "reduce_budget")).toBe(false);
  });
});

describe("generateDecisions — scale_budget", () => {
  it("generates scale_budget for winning campaign (ROAS≥2.5, score≥80, leads>0)", () => {
    const winner = makeCampanha({ roas: 3.5, scoreCampanha: 85, leadsSimulados: 10, gastoSimulado: 300 });
    const engine = makeEngine([winner]);
    const result = generateDecisions("ws-1", engine, new Set());
    expect(result.some(d => d.action_type === "scale_budget")).toBe(true);
  });

  it("does NOT scale when score is below 80", () => {
    const ok = makeCampanha({ roas: 3.5, scoreCampanha: 75, leadsSimulados: 10, gastoSimulado: 200 });
    const engine = makeEngine([ok]);
    const result = generateDecisions("ws-1", engine, new Set());
    expect(result.some(d => d.action_type === "scale_budget")).toBe(false);
  });
});

describe("generateDecisions — alert", () => {
  it("generates alert when roasGlobal < 1.5 and totalGasto > 200", () => {
    const engine = makeEngine([], { roasGlobal: 1.2, totalGasto: 500 });
    const result = generateDecisions("ws-1", engine, new Set());
    expect(result.some(d => d.action_type === "alert")).toBe(true);
  });

  it("does NOT alert when roasGlobal is healthy", () => {
    const engine = makeEngine([], { roasGlobal: 2.0, totalGasto: 500 });
    const result = generateDecisions("ws-1", engine, new Set());
    expect(result.some(d => d.action_type === "alert")).toBe(false);
  });

  it("sorts alerts to the end of the list", () => {
    const zombie = makeCampanha({ leadsSimulados: 0, gastoSimulado: 200 });
    const engine = makeEngine([zombie], { roasGlobal: 1.2, totalGasto: 500 });
    const result = generateDecisions("ws-1", engine, new Set());
    const lastItem = result[result.length - 1];
    expect(lastItem.action_type).toBe("alert");
  });
});

// ─── resolveCockpitMode ───────────────────────────────────────────────────────

describe("resolveCockpitMode", () => {
  it("returns ALERTA when roasGlobal < 1.0", () => {
    const engine = makeEngine([], { roasGlobal: 0.8, capitalEmRisco: 0, totalGasto: 1000 });
    expect(resolveCockpitMode(engine, 0)).toBe("ALERTA");
  });

  it("returns ALERTA when capitalEmRisco > 40% of totalGasto", () => {
    const engine = makeEngine([], { roasGlobal: 2.0, capitalEmRisco: 500, totalGasto: 1000 });
    expect(resolveCockpitMode(engine, 0)).toBe("ALERTA");
  });

  it("returns DECISÃO when there are pending decisions and no alert condition", () => {
    const engine = makeEngine([], { roasGlobal: 2.0, capitalEmRisco: 100, totalGasto: 1000 });
    expect(resolveCockpitMode(engine, 3)).toBe("DECISÃO");
  });

  it("returns PAZ when all is healthy and no pending decisions", () => {
    const engine = makeEngine([], { roasGlobal: 2.5, capitalEmRisco: 50, totalGasto: 1000 });
    expect(resolveCockpitMode(engine, 0)).toBe("PAZ");
  });
});
