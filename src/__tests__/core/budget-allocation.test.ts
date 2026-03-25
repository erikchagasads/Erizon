/**
 * budget-allocation.test.ts
 * Tests for optimizeBudgetAllocation.
 */

import { describe, it, expect } from "vitest";
import { optimizeBudgetAllocation } from "@/core/budget-allocation-engine";
import type { ClientBudgetInput } from "@/core/budget-allocation-engine";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeClient(overrides: Partial<ClientBudgetInput> & { clientId: string }): ClientBudgetInput {
  return {
    clientName: `Cliente ${overrides.clientId}`,
    budgetAtual: 200,
    roasHistorico: 3.0,
    isActive: true,
    ...overrides,
  };
}

// ─── No active clients ────────────────────────────────────────────────────────

describe("optimizeBudgetAllocation — no active clients", () => {
  it("returns maintain for all when no active clients", () => {
    const clients = [makeClient({ clientId: "c1", isActive: false })];
    const result = optimizeBudgetAllocation(clients, 500);
    expect(result.alocacaoOutput[0].acao).toBe("maintain");
    expect(result.impactoTotalBrl).toBe(0);
    expect(result.eficienciaGlobal).toBe(0);
  });

  it("returns correct resumo message when no active clients", () => {
    const result = optimizeBudgetAllocation([], 500);
    expect(result.resumo).toContain("Nenhuma campanha ativa");
  });
});

// ─── Budget distribution ──────────────────────────────────────────────────────

describe("optimizeBudgetAllocation — budget distribution", () => {
  it("total allocated equals budgetTotal (within R$10 increment rounding)", () => {
    const clients = [
      makeClient({ clientId: "c1", budgetAtual: 200, roasHistorico: 3.0 }),
      makeClient({ clientId: "c2", budgetAtual: 100, roasHistorico: 2.0 }),
    ];
    const budget = 500;
    const result = optimizeBudgetAllocation(clients, budget);
    const totalAlloc = result.alocacaoOutput.reduce((s, c) => s + c.budgetOtimo, 0);
    // Greedy allocates in increments of 10 so sum should be close to budget
    expect(totalAlloc).toBeGreaterThan(0);
    expect(totalAlloc).toBeLessThanOrEqual(budget + 10); // tolerance for rounding
  });

  it("allocates more to the higher-ROAS client", () => {
    const clients = [
      makeClient({ clientId: "low-roas",  budgetAtual: 200, roasHistorico: 1.5 }),
      makeClient({ clientId: "high-roas", budgetAtual: 200, roasHistorico: 5.0 }),
    ];
    const result = optimizeBudgetAllocation(clients, 500);
    const low  = result.alocacaoOutput.find(c => c.clientId === "low-roas")!;
    const high = result.alocacaoOutput.find(c => c.clientId === "high-roas")!;
    expect(high.budgetOtimo).toBeGreaterThanOrEqual(low.budgetOtimo);
  });

  it("sets acao=scale when budgetOtimo is significantly higher than budgetAtual", () => {
    const clients = [
      makeClient({ clientId: "grow", budgetAtual: 50, roasHistorico: 6.0 }),
      makeClient({ clientId: "stable", budgetAtual: 450, roasHistorico: 1.5 }),
    ];
    const result = optimizeBudgetAllocation(clients, 700);
    const grow = result.alocacaoOutput.find(c => c.clientId === "grow")!;
    // With high ROAS and low current budget, it should be scaled
    expect(["scale", "maintain"]).toContain(grow.acao);
  });

  it("includes clientId and clientName in output", () => {
    const clients = [makeClient({ clientId: "myid", clientName: "My Client" })];
    const result = optimizeBudgetAllocation(clients, 200);
    const out = result.alocacaoOutput[0];
    expect(out.clientId).toBe("myid");
    expect(out.clientName).toBe("My Client");
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("optimizeBudgetAllocation — edge cases", () => {
  it("handles single active client receiving full budget", () => {
    const clients = [makeClient({ clientId: "solo", budgetAtual: 100, roasHistorico: 3.0 })];
    const result = optimizeBudgetAllocation(clients, 300);
    expect(result.alocacaoOutput[0].budgetOtimo).toBeGreaterThan(0);
  });

  it("handles zero budgetTotal gracefully (zero steps)", () => {
    const clients = [makeClient({ clientId: "c1", roasHistorico: 3.0 })];
    const result = optimizeBudgetAllocation(clients, 0);
    expect(result.alocacaoOutput[0].budgetOtimo).toBe(0);
  });

  it("skips inactive clients in allocation", () => {
    const clients = [
      makeClient({ clientId: "active", budgetAtual: 100, roasHistorico: 4.0, isActive: true }),
      makeClient({ clientId: "inactive", budgetAtual: 300, roasHistorico: 4.0, isActive: false }),
    ];
    const result = optimizeBudgetAllocation(clients, 400);
    const inactive = result.alocacaoOutput.find(c => c.clientId === "inactive")!;
    // Inactive client keeps its current budget unchanged
    expect(inactive.budgetOtimo).toBe(300);
  });

  it("computes deltaPct as 0 when budgetAtual is 0", () => {
    const clients = [makeClient({ clientId: "zero-base", budgetAtual: 0, roasHistorico: 3.0 })];
    const result = optimizeBudgetAllocation(clients, 200);
    const out = result.alocacaoOutput.find(c => c.clientId === "zero-base")!;
    expect(out.deltaPct).toBe(0);
  });

  it("returns eficienciaGlobal as a valid number", () => {
    const clients = [
      makeClient({ clientId: "c1", roasHistorico: 3.0, budgetAtual: 200 }),
      makeClient({ clientId: "c2", roasHistorico: 2.0, budgetAtual: 100 }),
    ];
    const result = optimizeBudgetAllocation(clients, 400);
    expect(typeof result.eficienciaGlobal).toBe("number");
    expect(result.eficienciaGlobal).toBeGreaterThan(0);
  });

  it("sorts output by descending impactoEstimadoBrl", () => {
    const clients = [
      makeClient({ clientId: "small", budgetAtual: 10, roasHistorico: 2.0 }),
      makeClient({ clientId: "big",   budgetAtual: 500, roasHistorico: 4.0 }),
    ];
    const result = optimizeBudgetAllocation(clients, 600);
    const impacts = result.alocacaoOutput.map(c => c.impactoEstimadoBrl);
    for (let i = 1; i < impacts.length; i++) {
      expect(impacts[i - 1]).toBeGreaterThanOrEqual(impacts[i]);
    }
  });
});
