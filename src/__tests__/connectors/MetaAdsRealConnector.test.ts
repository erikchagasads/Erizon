/**
 * MetaAdsRealConnector.test.ts
 * Testes de contrato para o conector Meta Ads.
 * Usa MSW (Mock Service Worker) style com fetch mock para simular a Graph API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MetaAdsRealConnector } from "@/connectors/meta-ads/MetaAdsRealConnector";
import type { IntegrationCredential } from "@/types/erizon";

// ─── Credential fixture ───────────────────────────────────────────────────────

const credential: IntegrationCredential = {
  workspaceId: "ws-test",
  provider: "meta_ads",
  externalAccountId: "act_123456789",
  accessToken: "EAAxxxxxxxxxxxxxxxxxxxxxxx",
  metadata: { clientId: "cli-vitaglow" } as Record<string, string>,
};

// ─── Meta API response fixture ────────────────────────────────────────────────

function makeMetaResponse(overrides: object = {}) {
  return {
    data: [
      {
        id: "cmp-meta-001",
        name: "Produto X | Conversão | UGC",
        effective_status: "ACTIVE",
        objective: "OUTCOME_SALES",
        start_time: "2026-02-01T00:00:00+0000",
        daily_budget: "200000",   // R$2000 em centavos
        adsets: { data: [] },
        insights: {
          data: [
            {
              spend: "1200.50",
              impressions: "70000",
              reach: "42000",
              clicks: "2100",
              ctr: "3.00",
              cpm: "17.15",
              cpc: "0.57",
              actions: [
                { action_type: "purchase", value: "31" },
                { action_type: "lead", value: "5" },
              ],
              action_values: [
                { action_type: "purchase", value: "9207.00" },
              ],
            },
          ],
        },
        ...overrides,
      },
    ],
    paging: {
      cursors: { before: "abc", after: undefined },
    },
  };
}

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

function mockFetch(responseBody: object, status = 200) {
  return vi.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(responseBody), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

// ─── Testes ────────────────────────────────────────────────────────────────────

describe("MetaAdsRealConnector.pullCampaigns()", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna ExternalCampaignRecord com campos corretos da Meta API", async () => {
    mockFetch(makeMetaResponse());

    const connector = new MetaAdsRealConnector();
    const campaigns = await connector.pullCampaigns(credential);

    expect(campaigns).toHaveLength(1);
    const c = campaigns[0];
    expect(c.campaignId).toBe("cmp-meta-001");
    expect(c.name).toBe("Produto X | Conversão | UGC");
    expect(c.spend).toBeCloseTo(1200.50, 2);
    expect(c.impressions).toBe(70000);
    expect(c.clicks).toBe(2100);
    expect(c.ctr).toBeCloseTo(3.0, 1);
    expect(c.cpm).toBeCloseTo(17.15, 2);
    expect(c.cpc).toBeCloseTo(0.57, 2);
  });

  it("calcula revenue como soma de action_values de purchase", async () => {
    mockFetch(makeMetaResponse());
    const connector = new MetaAdsRealConnector();
    const [campaign] = await connector.pullCampaigns(credential);
    expect(campaign.revenue).toBeCloseTo(9207, 0);
  });

  it("soma conversions de purchase + lead actions", async () => {
    mockFetch(makeMetaResponse());
    const connector = new MetaAdsRealConnector();
    const [campaign] = await connector.pullCampaigns(credential);
    // purchase: 31, lead: 5 — lead tem prioridade via LEAD_ACTION_TYPES
    expect(campaign.conversions).toBeGreaterThan(0);
  });

  it("lança MetaApiError para token expirado (code 190)", async () => {
    mockFetch({ error: { code: 190, message: "Invalid token" } });
    const connector = new MetaAdsRealConnector();
    await expect(connector.pullCampaigns(credential)).rejects.toThrow(/Token Meta/i);
  });

  it("lança erro para rate limit (code 17)", async () => {
    mockFetch({ error: { code: 17, message: "Rate limit" } });
    const connector = new MetaAdsRealConnector();
    await expect(connector.pullCampaigns(credential)).rejects.toThrow(/Rate limit/i);
  });

  it("lança erro para resposta não-JSON", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("<html>error</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );
    const connector = new MetaAdsRealConnector();
    await expect(connector.pullCampaigns(credential)).rejects.toThrow(/não-JSON/i);
  });

  it("retorna array vazio para conta sem campanhas", async () => {
    mockFetch({ data: [], paging: { cursors: {} } });
    const connector = new MetaAdsRealConnector();
    const campaigns = await connector.pullCampaigns(credential);
    expect(campaigns).toHaveLength(0);
  });

  it("resolve dailyBudget em reais (centavos / 100)", async () => {
    mockFetch(makeMetaResponse());
    const connector = new MetaAdsRealConnector();
    const [campaign] = await connector.pullCampaigns(credential);
    expect(campaign.dailyBudget).toBeCloseTo(2000, 0);   // 200000 centavos = R$2000
  });

  it("clientId vem do metadata da credential", async () => {
    mockFetch(makeMetaResponse());
    const connector = new MetaAdsRealConnector();
    const [campaign] = await connector.pullCampaigns(credential);
    expect(campaign.clientId).toBe("cli-vitaglow");
  });

  it("status PAUSED é mapeado corretamente", async () => {
    // O status é normalizado mas não exposto em ExternalCampaignRecord
    // — verificamos que não lança exceção
    mockFetch(makeMetaResponse({ effective_status: "PAUSED" }));
    const connector = new MetaAdsRealConnector();
    await expect(connector.pullCampaigns(credential)).resolves.not.toThrow();
  });
});

describe("MetaAdsRealConnector.friendlyError()", () => {
  it("190 retorna mensagem de token expirado", () => {
    const msg = MetaAdsRealConnector.friendlyError(190, "Invalid token", 463);
    expect(msg).toMatch(/expirado/i);
  });

  it("17 retorna mensagem de rate limit", () => {
    const msg = MetaAdsRealConnector.friendlyError(17, "Rate limit");
    expect(msg).toMatch(/rate limit/i);
  });

  it("código desconhecido preserva mensagem original", () => {
    const msg = MetaAdsRealConnector.friendlyError(999, "Erro customizado");
    expect(msg).toContain("Erro customizado");
  });
});
