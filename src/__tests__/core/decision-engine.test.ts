/**
 * decision-engine.test.ts
 * Testa evaluateCampaignHealth e buildDecisionRecommendations.
 * Estes engines determinam quando escalar, pausar ou trocar criativo.
 */

import { describe, it, expect } from "vitest";
import { evaluateCampaignHealth, buildDecisionRecommendations } from "@/core/decision-engine";
import type { CampaignSnapshot, ClientAccount, CreativeAsset, NetworkBenchmark } from "@/types/erizon";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const client: ClientAccount = {
  id: "cli-1",
  name: "VitaGlow",
  niche: "suplementos",
  vertical: "b2c",
  platform: "Shopify",
  currency: "BRL",
  averageTicket: 297,
  productCostRate: 0.30,
  refundRate: 0.05,
  paymentFeeRate: 0.03,
  logisticsRate: 0.08,
  monthlyTargetProfit: 20000,
};

const healthyCampaign: CampaignSnapshot = {
  id: "cmp-healthy",
  clientId: "cli-1",
  name: "Produto X | Conversão | UGC",
  objective: "Compra",
  channel: "Meta Ads",
  audience: "Broad 25-44",
  activeDays: 12,
  dailyBudget: 1800,
  spendToday: 1200,
  impressions: 70000,
  clicks: 2100,
  conversions: 35,
  revenueToday: 10395,
  frequency: 1.9,
  cpm: 17.1,
  cpc: 0.57,
  ctr: 3.0,
  cpa: 34.3,
  roas: 8.66,
  lastRoas: 7.8,
  lastCtr: 2.6,
  lastCpa: 38,
  currentCreativeId: "crt-1",
  approvedByAutopilot: false,
};

const zombieCampaign: CampaignSnapshot = {
  ...healthyCampaign,
  id: "cmp-zombie",
  name: "Campanha Zumbi",
  spendToday: 600,
  revenueToday: 0,
  conversions: 0,
  roas: 0,
  lastRoas: 2.1,
  ctr: 0.4,
  lastCtr: 1.2,
  frequency: 4.5,
};

const saturatedCampaign: CampaignSnapshot = {
  ...healthyCampaign,
  id: "cmp-saturated",
  name: "Campanha Saturada",
  frequency: 4.1,
  ctr: 0.9,
  lastCtr: 2.4,    // queda de ~63%
  spendToday: 900,
  revenueToday: 2000,
  conversions: 8,
};

const creative: CreativeAsset = {
  id: "crt-1",
  clientId: "cli-1",
  campaignId: "cmp-healthy",
  name: "UGC Depoimento 01",
  format: "UGC",
  hookType: "Prova social",
  durationSeconds: 15,
  captionStyle: "Legenda grande",
  visualStyle: "Selfie",
  ctr: 3.0,
  cpa: 34,
  roas: 8.5,
  frequency: 1.9,
  spend: 1200,
  conversions: 35,
};

const benchmark: NetworkBenchmark = {
  id: "bench-1",
  niche: "suplementos",
  segment: "feminino",
  hookType: "Prova social",
  format: "UGC",
  durationBand: "9-12s",
  ctrAvg: 2.1,
  cpaAvg: 48,
  roasAvg: 5.2,
  profitRoasAvg: 1.4,
  sampleSize: 120,
};

// ─── evaluateCampaignHealth ────────────────────────────────────────────────────

describe("evaluateCampaignHealth", () => {
  it("campanha saudável retorna score alto e riskLevel baixo", () => {
    const health = evaluateCampaignHealth(healthyCampaign, client);
    expect(health.score).toBeGreaterThanOrEqual(70);
    expect(health.riskLevel).toBe("baixo");
  });

  it("campanha zumbi retorna score crítico e status Zumbi", () => {
    const health = evaluateCampaignHealth(zombieCampaign, client);
    expect(health.score).toBeLessThan(35);
    expect(health.riskLevel).toBe("critico");
    expect(health.status).toBe("Zumbi");
  });

  it("campanha saturada retorna riskLevel alto", () => {
    const health = evaluateCampaignHealth(saturatedCampaign, client);
    expect(["alto", "critico"]).toContain(health.riskLevel);
  });

  it("score nunca é negativo", () => {
    const worstCase: CampaignSnapshot = {
      ...zombieCampaign,
      spendToday: 9999,
      ctr: 0,
      roas: 0,
      frequency: 10,
      conversions: 0,
      revenueToday: 0,
    };
    const health = evaluateCampaignHealth(worstCase, client);
    expect(health.score).toBeGreaterThanOrEqual(0);
  });

  it("scalePotential está no intervalo [0, 100]", () => {
    const health = evaluateCampaignHealth(healthyCampaign, client);
    expect(health.scalePotential).toBeGreaterThanOrEqual(0);
    expect(health.scalePotential).toBeLessThanOrEqual(100);
  });

  it("campanha escalando tem status Escalando", () => {
    const scalingCampaign: CampaignSnapshot = {
      ...healthyCampaign,
      frequency: 2.0,
      ctr: 3.2,
      lastCtr: 2.8,  // CTR subindo
      spendToday: 1200,
      revenueToday: 10000,
    };
    const health = evaluateCampaignHealth(scalingCampaign, client);
    expect(health.status).toBe("Escalando");
  });
});

// ─── buildDecisionRecommendations ─────────────────────────────────────────────

describe("buildDecisionRecommendations", () => {
  it("retorna decisão de corte para campanha zumbi", () => {
    const decisions = buildDecisionRecommendations({
      campaigns: [zombieCampaign],
      clients: [client],
      creatives: [creative],
      benchmarks: [benchmark],
    });
    const riskDecision = decisions.find((d) => d.type === "risk");
    expect(riskDecision).toBeDefined();
    expect(riskDecision?.priority).toBe("Crítica");
    expect(riskDecision?.confidence).toBeGreaterThanOrEqual(90);
  });

  it("retorna decisão de escala para campanha saudável com alto ProfitROAS", () => {
    const decisions = buildDecisionRecommendations({
      campaigns: [healthyCampaign],
      clients: [client],
      creatives: [creative],
      benchmarks: [benchmark],
    });
    const scaleDecision = decisions.find((d) => d.type === "scale");
    expect(scaleDecision).toBeDefined();
    expect(scaleDecision?.title).toMatch(/escalar/i);
  });

  it("retorna decisão de creative para campanha saturada", () => {
    const decisions = buildDecisionRecommendations({
      campaigns: [saturatedCampaign],
      clients: [client],
      creatives: [creative],
      benchmarks: [benchmark],
    });
    const creativeDecision = decisions.find((d) => d.type === "creative");
    expect(creativeDecision).toBeDefined();
  });

  it("ordena decisões: Crítica antes de Alta", () => {
    const decisions = buildDecisionRecommendations({
      campaigns: [zombieCampaign, saturatedCampaign, healthyCampaign],
      clients: [client],
      creatives: [creative],
      benchmarks: [benchmark],
    });
    if (decisions.length >= 2) {
      const priorityOrder = { "Crítica": 3, "Alta": 2, "Média": 1 };
      for (let i = 0; i < decisions.length - 1; i++) {
        const curr = priorityOrder[decisions[i].priority as keyof typeof priorityOrder] ?? 0;
        const next = priorityOrder[decisions[i + 1].priority as keyof typeof priorityOrder] ?? 0;
        expect(curr).toBeGreaterThanOrEqual(next);
      }
    }
  });

  it("ignora campanhas sem cliente correspondente", () => {
    const orphanCampaign: CampaignSnapshot = { ...zombieCampaign, clientId: "cli-inexistente" };
    expect(() =>
      buildDecisionRecommendations({
        campaigns: [orphanCampaign],
        clients: [client],
        creatives: [],
        benchmarks: [],
      })
    ).not.toThrow();
  });

  it("retorna array vazio quando não há campanhas", () => {
    const decisions = buildDecisionRecommendations({
      campaigns: [],
      clients: [client],
      creatives: [],
      benchmarks: [],
    });
    expect(decisions).toHaveLength(0);
  });

  it("cada decisão tem id único", () => {
    const decisions = buildDecisionRecommendations({
      campaigns: [zombieCampaign, saturatedCampaign],
      clients: [client],
      creatives: [creative],
      benchmarks: [benchmark],
    });
    const ids = decisions.map((d) => d.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
