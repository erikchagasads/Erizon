/**
 * profit-engine.test.ts
 * Testa calculateCampaignEconomics — engine financeiro central do Erizon.
 * Qualquer bug aqui resulta em decisões de escala/pausa erradas.
 */

import { describe, it, expect } from "vitest";
import { calculateCampaignEconomics } from "@/core/profit-engine";
import type { CampaignSnapshot, ClientAccount } from "@/types/erizon";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const baseClient: ClientAccount = {
  id: "cli-test",
  name: "Teste",
  niche: "ecommerce",
  vertical: "b2c",
  platform: "Shopify",
  currency: "BRL",
  averageTicket: 297,
  productCostRate: 0.30,   // 30% do revenue
  refundRate: 0.05,        // 5%
  paymentFeeRate: 0.03,    // 3%
  logisticsRate: 0.08,     // 8%
  monthlyTargetProfit: 15000,
};

const baseCampaign: CampaignSnapshot = {
  id: "cmp-test",
  clientId: "cli-test",
  name: "Campanha Teste",
  objective: "Compra",
  channel: "Meta Ads",
  audience: "Broad",
  activeDays: 10,
  dailyBudget: 1000,
  spendToday: 800,
  impressions: 40000,
  clicks: 1200,
  conversions: 20,
  revenueToday: 5940,   // 20 vendas × R$297
  frequency: 2.1,
  cpm: 20,
  cpc: 0.67,
  ctr: 3.0,
  cpa: 40,
  roas: 7.425,
  lastRoas: 6.8,
  lastCtr: 2.8,
  lastCpa: 45,
  currentCreativeId: "crt-1",
  approvedByAutopilot: false,
};

// ─── Testes ────────────────────────────────────────────────────────────────────

describe("calculateCampaignEconomics", () => {
  it("calcula netProfit corretamente descontando todos os custos", () => {
    const econ = calculateCampaignEconomics(baseCampaign, baseClient);

    const revenue = 5940;
    const adSpend = 800;
    const productCost = revenue * 0.30;   // 1782
    const paymentFees = revenue * 0.03;   // 178.2
    const logistics = revenue * 0.08;     // 475.2
    const refunds = revenue * 0.05;       // 297
    const expectedNetProfit = revenue - adSpend - productCost - paymentFees - logistics - refunds;

    expect(econ.netProfit).toBeCloseTo(expectedNetProfit, 2);
  });

  it("profitRoas = netProfit / adSpend", () => {
    const econ = calculateCampaignEconomics(baseCampaign, baseClient);
    const expected = econ.netProfit / 800;
    expect(econ.profitRoas).toBeCloseTo(expected, 4);
  });

  it("profitRoas é positivo quando campanha é lucrativa", () => {
    const econ = calculateCampaignEconomics(baseCampaign, baseClient);
    expect(econ.profitRoas).toBeGreaterThan(0);
  });

  it("profitRoas é negativo quando gasto supera margem real", () => {
    const lossCampaign: CampaignSnapshot = {
      ...baseCampaign,
      spendToday: 6000,   // gasto maior que toda a receita
      revenueToday: 5940,
    };
    const econ = calculateCampaignEconomics(lossCampaign, baseClient);
    expect(econ.profitRoas).toBeLessThan(0);
    expect(econ.netProfit).toBeLessThan(0);
  });

  it("profitRoas = 0 quando adSpend = 0 (sem divisão por zero)", () => {
    const zeroCampaign: CampaignSnapshot = { ...baseCampaign, spendToday: 0 };
    const econ = calculateCampaignEconomics(zeroCampaign, baseClient);
    expect(econ.profitRoas).toBe(0);
    expect(Number.isFinite(econ.profitRoas)).toBe(true);
  });

  it("marginPct = 0 quando revenueToday = 0 (sem divisão por zero)", () => {
    const zeroRevCampaign: CampaignSnapshot = { ...baseCampaign, revenueToday: 0 };
    const econ = calculateCampaignEconomics(zeroRevCampaign, baseClient);
    expect(econ.marginPct).toBe(0);
    expect(Number.isFinite(econ.marginPct)).toBe(true);
  });

  it("grossProfit = revenue - adSpend - productCost", () => {
    const econ = calculateCampaignEconomics(baseCampaign, baseClient);
    const expected = 5940 - 800 - 5940 * 0.30;
    expect(econ.grossProfit).toBeCloseTo(expected, 2);
  });

  it("adSpend espelha spendToday da campanha", () => {
    const econ = calculateCampaignEconomics(baseCampaign, baseClient);
    expect(econ.adSpend).toBe(800);
  });

  it("taxa zero não distorce o resultado", () => {
    const zeroFeeClient: ClientAccount = {
      ...baseClient,
      productCostRate: 0,
      refundRate: 0,
      paymentFeeRate: 0,
      logisticsRate: 0,
    };
    const econ = calculateCampaignEconomics(baseCampaign, zeroFeeClient);
    // Com taxa zero: netProfit = revenue - adSpend
    expect(econ.netProfit).toBeCloseTo(5940 - 800, 2);
  });

  it("taxa 100% resulta em lucro negativo extremo", () => {
    const maxFeeClient: ClientAccount = {
      ...baseClient,
      productCostRate: 1.0,
      refundRate: 0,
      paymentFeeRate: 0,
      logisticsRate: 0,
    };
    const econ = calculateCampaignEconomics(baseCampaign, maxFeeClient);
    // netProfit = revenue - adSpend - revenue = -adSpend
    expect(econ.netProfit).toBeCloseTo(-800, 2);
  });
});
