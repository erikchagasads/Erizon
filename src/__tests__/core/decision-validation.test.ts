/**
 * decision-validation.test.ts
 * Testa validateDecisionInputs — portão de qualidade antes de qualquer decisão de engine.
 */

import { describe, it, expect } from "vitest";
import { validateDecisionInputs } from "@/core/decision-validation";
import type { CampaignSnapshot, ClientAccount } from "@/types/erizon";

const client: ClientAccount = {
  id: "cli-1",
  name: "Teste",
  niche: "ecommerce",
  vertical: "b2c",
  platform: "Shopify",
  currency: "BRL",
  averageTicket: 297,
  productCostRate: 0.30,
  refundRate: 0.05,
  paymentFeeRate: 0.03,
  logisticsRate: 0.08,
  monthlyTargetProfit: 15000,
};

const validCampaign: CampaignSnapshot = {
  id: "cmp-valid",
  clientId: "cli-1",
  name: "Campanha Válida",
  objective: "Compra",
  channel: "Meta Ads",
  audience: "Broad",
  activeDays: 10,
  dailyBudget: 1000,
  spendToday: 800,
  impressions: 40000,
  clicks: 1200,
  conversions: 20,
  revenueToday: 5940,
  frequency: 2.0,
  cpm: 20,
  cpc: 0.67,
  ctr: 2.5,    // acima de minCtr 1.1
  cpa: 40,
  roas: 7.4,   // acima de minRoas 1.8
  lastRoas: 6.8,
  lastCtr: 2.3,
  lastCpa: 44,
  currentCreativeId: "crt-1",
  approvedByAutopilot: false,
};

describe("validateDecisionInputs", () => {
  it("retorna validado quando todos os campos estão dentro dos thresholds", () => {
    const result = validateDecisionInputs({ campaign: validCampaign, client });
    expect(result.status).toBe("validado");
    expect(result.confidence).toBeGreaterThanOrEqual(60);
    expect(result.notes).toHaveLength(0);
  });

  it("retorna bloqueado para snapshot inválido (impressions <= 0)", () => {
    const invalid: CampaignSnapshot = { ...validCampaign, impressions: 0 };
    const result = validateDecisionInputs({ campaign: invalid, client });
    expect(result.status).toBe("bloqueado");
    expect(result.confidence).toBe(0);
  });

  it("retorna bloqueado para clicks negativo", () => {
    const invalid: CampaignSnapshot = { ...validCampaign, clicks: -1 };
    const result = validateDecisionInputs({ campaign: invalid, client });
    expect(result.status).toBe("bloqueado");
  });

  it("retorna recalibrar quando 3 ou mais flags falham", () => {
    const badCampaign: CampaignSnapshot = {
      ...validCampaign,
      ctr: 0.5,         // abaixo de minCtr 1.1
      roas: 1.0,        // abaixo de minRoas 1.8
      frequency: 5.0,   // acima de maxFrequency 3.8
      spendToday: 400,  // acima de maxSpendWithoutConversion 250 sem conversão
      conversions: 0,
      revenueToday: 0,  // profitRoas < minProfitRoas
    };
    const result = validateDecisionInputs({ campaign: badCampaign, client });
    expect(result.status).toBe("recalibrar");
    expect(result.confidence).toBeLessThan(60);
  });

  it("confidence diminui para cada nota de problema", () => {
    const oneIssue: CampaignSnapshot = { ...validCampaign, ctr: 0.5 };
    const twoIssues: CampaignSnapshot = { ...validCampaign, ctr: 0.5, roas: 1.0 };

    const r1 = validateDecisionInputs({ campaign: oneIssue, client });
    const r2 = validateDecisionInputs({ campaign: twoIssues, client });

    expect(r1.confidence).toBeGreaterThan(r2.confidence);
  });

  it("calibração customizada é respeitada", () => {
    // Com minCtr muito alto, qualquer campanha falha no CTR
    const result = validateDecisionInputs({
      campaign: validCampaign,
      client,
      calibration: { minCtr: 10.0 },  // threshold impossível
    });
    expect(result.notes.some((n) => n.includes("CTR"))).toBe(true);
  });

  it("confidence está sempre entre 0 e 100", () => {
    const r1 = validateDecisionInputs({ campaign: validCampaign, client });
    const worst: CampaignSnapshot = {
      ...validCampaign,
      impressions: 0,
    };
    const r2 = validateDecisionInputs({ campaign: worst, client });
    expect(r1.confidence).toBeGreaterThanOrEqual(0);
    expect(r1.confidence).toBeLessThanOrEqual(100);
    expect(r2.confidence).toBe(0);
  });
});
