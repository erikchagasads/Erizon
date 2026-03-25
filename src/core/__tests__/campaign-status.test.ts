import { isCampaignVisible, isCampaignOperationallyActive } from "../campaign-status";

describe("isCampaignVisible", () => {
  it.each([["ACTIVE"], ["PAUSED"], ["IN_PROCESS"], ["WITH_ISSUES"], ["CAMPAIGN_PAUSED"]])(
    "returns true for status %s",
    (status) => {
      expect(isCampaignVisible(undefined, status)).toBe(true);
    }
  );

  it("returns false for archived or deleted statuses", () => {
    expect(isCampaignVisible("ARCHIVED", "ARCHIVED")).toBe(false);
    expect(isCampaignVisible("DELETED", "DELETED")).toBe(false);
    expect(isCampaignVisible(null, null)).toBe(false);
  });

  it("falls back to configured_status when effective_status is null", () => {
    expect(isCampaignVisible("ACTIVE", null)).toBe(true);
    expect(isCampaignVisible("PAUSED", undefined)).toBe(true);
  });
});

describe("isCampaignOperationallyActive", () => {
  it("returns true for active delivery statuses", () => {
    expect(isCampaignOperationallyActive("ACTIVE")).toBe(true);
    expect(isCampaignOperationallyActive("IN_PROCESS")).toBe(true);
    expect(isCampaignOperationallyActive("WITH_ISSUES")).toBe(true);
  });

  it("returns false for PAUSED and null", () => {
    expect(isCampaignOperationallyActive("PAUSED")).toBe(false);
    expect(isCampaignOperationallyActive(null)).toBe(false);
  });
});
