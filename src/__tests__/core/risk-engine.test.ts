/**
 * risk-engine.test.ts
 * Testa buildRiskFlags — detecta saturação criativa, campanhas zumbi e elevação de CPA.
 */

import { describe, it, expect } from "vitest";
import { buildRiskFlags } from "@/core/risk-engine";
import type { CampaignSnapshot, ClientAccount } from "@/types/erizon";

const client: ClientAccount = {
  id: "cli-1",
  name: "NeuroHost",
  niche: "infoproduto",
  vertical: "b2c",
  platform: "Hotmart",
  currency: "BRL",
  averageTicket: 497,
  productCostRate: 0.10,
  refundRate: 0.08,
  paymentFeeRate: 0.10,
  logisticsRate: 0,
  monthlyTargetProfit: 30000,
};

const baseCampaign: CampaignSnapshot = {
  id: "cmp-base",
  clientId: "cli-1",
  name: "Info | Conversão | UGC",
  objective: "Compra",
  channel: "Meta Ads",
  audience: "Broad",
  activeDays: 15,
  dailyBudget: 1500,
  spendToday: 900,
  impressions: 50000,
  clicks: 1500,
  conversions: 18,
  revenueToday: 8946,
  frequency: 2.0,
  cpm: 18,
  cpc: 0.6,
  ctr: 3.0,
  cpa: 50,
  roas: 9.9,
  lastRoas: 9.0,
  lastCtr: 2.8,
  lastCpa: 48,
  currentCreativeId: "crt-1",
  approvedByAutopilot: false,
};

describe("buildRiskFlags", () => {
  it("detecta saturação criativa: frequência >= 3.5 e queda de CTR >= 20%", () => {
    const saturated: CampaignSnapshot = {
      ...baseCampaign,
      frequency: 4.0,
      ctr: 0.9,
      lastCtr: 2.5,   // queda de 64%
    };
    const flags = buildRiskFlags([saturated], [client]);
    const satFlag = flags.find((f) => f.id.includes("saturation"));
    expect(satFlag).toBeDefined();
    expect(satFlag?.severity).toBe("Crítico");
  });

  it("detecta campanha zumbi: gasto > 450 sem receita", () => {
    const zombie: CampaignSnapshot = {
      ...baseCampaign,
      spendToday: 600,
      revenueToday: 0,
      conversions: 0,
    };
    const flags = buildRiskFlags([zombie], [client]);
    const zombieFlag = flags.find((f) => f.id.includes("zombie"));
    expect(zombieFlag).toBeDefined();
    expect(zombieFlag?.severity).toBe("Crítico");
  });

  it("detecta elevação acelerada de CPA com health score baixo", () => {
    const highCpa: CampaignSnapshot = {
      ...baseCampaign,
      cpa: 120,
      lastCpa: 50,   // alta de 140%
      spendToday: 900,
      revenueToday: 1500,
      conversions: 3,
      roas: 1.67,
    };
    const flags = buildRiskFlags([highCpa], [client]);
    const cpaFlag = flags.find((f) => f.id.includes("cpa"));
    expect(cpaFlag).toBeDefined();
    expect(cpaFlag?.severity).toBe("Médio");
  });

  it("campanha saudável não gera nenhum flag", () => {
    const flags = buildRiskFlags([baseCampaign], [client]);
    expect(flags).toHaveLength(0);
  });

  it("ignora campanha sem cliente correspondente", () => {
    const orphan: CampaignSnapshot = { ...baseCampaign, clientId: "cli-inexistente" };
    expect(() => buildRiskFlags([orphan], [client])).not.toThrow();
    const flags = buildRiskFlags([orphan], [client]);
    expect(flags).toHaveLength(0);
  });

  it("retorna array vazio com lista de campanhas vazia", () => {
    const flags = buildRiskFlags([], [client]);
    expect(flags).toHaveLength(0);
  });

  it("frequência exata de 3.5 ainda aciona flag de saturação com queda de CTR >= 20%", () => {
    const boundary: CampaignSnapshot = {
      ...baseCampaign,
      frequency: 3.5,
      ctr: 1.5,
      lastCtr: 2.0,   // queda de 25%
    };
    const flags = buildRiskFlags([boundary], [client]);
    const satFlag = flags.find((f) => f.id.includes("saturation"));
    expect(satFlag).toBeDefined();
  });

  it("todos os flags têm id, clientName, campaignName e action preenchidos", () => {
    const zombie: CampaignSnapshot = {
      ...baseCampaign,
      spendToday: 500,
      revenueToday: 0,
      conversions: 0,
    };
    const flags = buildRiskFlags([zombie], [client]);
    for (const flag of flags) {
      expect(flag.id).toBeTruthy();
      expect(flag.clientName).toBeTruthy();
      expect(flag.campaignName).toBeTruthy();
      expect(flag.action).toBeTruthy();
    }
  });
});
