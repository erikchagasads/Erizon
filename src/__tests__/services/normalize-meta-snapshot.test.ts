import { describe, expect, it } from "vitest";
import { normalizeMetaCampaignSnapshot } from "@/services/normalize-meta-snapshot";

describe("normalizeMetaCampaignSnapshot", () => {
  it("computes cpl and roas", () => {
    const result = normalizeMetaCampaignSnapshot({
      workspaceId: "w",
      clientId: null,
      adAccountId: "a",
      campaignId: "c",
      snapshotDate: "2026-03-12",
      raw: {
        insights: {
          spend: 100,
          impressions: 1000,
          reach: 900,
          clicks: 50,
          ctr: 5,
          cpc: 2,
          cpm: 100,
          leads: 10,
          purchases: 2,
          revenue: 400,
          frequency: 1.2,
        },
      },
    });

    expect(result.cpl).toBe(10);
    expect(result.roas).toBe(4);
  });
});
