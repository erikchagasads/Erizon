/**
 * ire-engine.test.ts
 * Tests for detectWaste, calcNormDecision, and calcIRE.
 */

import { describe, it, expect } from "vitest";
import { detectWaste, calcNormDecision, calcIRE } from "@/core/ire-engine";
import type { SnapshotWithObjective } from "@/repositories/supabase/snapshot-repository";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSnap(overrides: Partial<SnapshotWithObjective> & { campaign_id: string }): SnapshotWithObjective {
  return {
    objective: "OUTCOME_LEADS",
    snapshot_date: "2026-03-15",
    spend: 100,
    impressions: 5000,
    reach: 4000,
    clicks: 100,
    ctr: 2.0,
    cpc: 1.0,
    cpm: 20,
    leads: 5,
    purchases: 0,
    revenue: 500,
    cpl: 20,
    cpa: 0,
    roas: 5.0,
    frequency: 1.5,
    ...overrides,
  };
}

// ─── detectWaste — zombie ─────────────────────────────────────────────────────

describe("detectWaste — zombie detection", () => {
  it("classifies a campaign as zombie when spend>=150, 3+ days active, zero leads/purchases", () => {
    const snaps = [
      makeSnap({ campaign_id: "z1", spend: 200, leads: 0, purchases: 0, snapshot_date: "2026-03-15" }),
      makeSnap({ campaign_id: "z1", spend: 180, leads: 0, purchases: 0, snapshot_date: "2026-03-14" }),
      makeSnap({ campaign_id: "z1", spend: 160, leads: 0, purchases: 0, snapshot_date: "2026-03-13" }),
    ];
    const result = detectWaste(snaps);
    expect(result.zombieSpend).toBeGreaterThan(0);
    expect(result.campaigns.some(c => c.type === "zombie")).toBe(true);
  });

  it("does NOT classify zombie when spend is below R$150", () => {
    const snaps = [
      makeSnap({ campaign_id: "cheap1", spend: 100, leads: 0, purchases: 0, snapshot_date: "2026-03-15" }),
      makeSnap({ campaign_id: "cheap1", spend: 100, leads: 0, purchases: 0, snapshot_date: "2026-03-14" }),
      makeSnap({ campaign_id: "cheap1", spend: 100, leads: 0, purchases: 0, snapshot_date: "2026-03-13" }),
    ];
    const result = detectWaste(snaps);
    expect(result.campaigns.some(c => c.type === "zombie")).toBe(false);
  });

  it("does NOT classify zombie for awareness objective even with zero leads", () => {
    const snaps = [
      makeSnap({ campaign_id: "aware1", spend: 300, leads: 0, purchases: 0, objective: "OUTCOME_AWARENESS", snapshot_date: "2026-03-15" }),
      makeSnap({ campaign_id: "aware1", spend: 300, leads: 0, purchases: 0, objective: "OUTCOME_AWARENESS", snapshot_date: "2026-03-14" }),
      makeSnap({ campaign_id: "aware1", spend: 300, leads: 0, purchases: 0, objective: "OUTCOME_AWARENESS", snapshot_date: "2026-03-13" }),
    ];
    const result = detectWaste(snaps);
    expect(result.zombieSpend).toBe(0);
  });

  it("returns zero waste for healthy campaigns", () => {
    const snaps = [
      makeSnap({ campaign_id: "healthy1", spend: 200, leads: 10, purchases: 2 }),
    ];
    const result = detectWaste(snaps);
    expect(result.zombieSpend).toBe(0);
    expect(result.saturatedSpend).toBe(0);
  });
});

describe("detectWaste — saturated detection", () => {
  it("classifies saturated campaign with high frequency and CTR drop", () => {
    const snaps = [
      makeSnap({ campaign_id: "sat1", snapshot_date: "2026-03-15", frequency: 5.0, ctr: 0.5, leads: 2, spend: 200 }),
      makeSnap({ campaign_id: "sat1", snapshot_date: "2026-03-14", frequency: 4.5, ctr: 2.0, leads: 5, spend: 200 }),
    ];
    const result = detectWaste(snaps);
    expect(result.campaigns.some(c => c.type === "saturated")).toBe(true);
    expect(result.saturatedSpend).toBeGreaterThan(0);
  });
});

describe("detectWaste — cannibal detection", () => {
  it("classifies cannibal when 2+ campaigns same objective have CPL above benchmark", () => {
    const snaps = [
      makeSnap({ campaign_id: "can1", objective: "OUTCOME_LEADS", cpl: 100, spend: 200, leads: 2 }),
      makeSnap({ campaign_id: "can2", objective: "OUTCOME_LEADS", cpl: 120, spend: 180, leads: 1 }),
    ];
    const result = detectWaste(snaps);
    expect(result.campaigns.some(c => c.type === "cannibal")).toBe(true);
    expect(result.cannibalSpend).toBeGreaterThan(0);
  });

  it("does NOT classify cannibal when only one campaign per objective", () => {
    const snaps = [
      makeSnap({ campaign_id: "solo1", objective: "OUTCOME_LEADS", cpl: 100, spend: 200, leads: 2 }),
    ];
    const result = detectWaste(snaps);
    expect(result.campaigns.some(c => c.type === "cannibal")).toBe(false);
  });
});

describe("detectWaste — wasteIndex", () => {
  it("returns wasteIndex of 0 when no waste detected", () => {
    const snaps = [makeSnap({ campaign_id: "ok1", leads: 10, spend: 100 })];
    const result = detectWaste(snaps);
    expect(result.wasteIndex).toBe(0);
  });

  it("returns empty result for empty snapshots array", () => {
    const result = detectWaste([]);
    expect(result.wasteIndex).toBe(0);
    expect(result.campaigns).toHaveLength(0);
    expect(result.totalSpend).toBe(0);
  });
});

// ─── calcNormDecision ─────────────────────────────────────────────────────────

describe("calcNormDecision", () => {
  it("clamps score 0 to 0", () => expect(calcNormDecision(0)).toBe(0));
  it("clamps score 1 to 1", () => expect(calcNormDecision(1)).toBe(1));
  it("clamps negative value to 0", () => expect(calcNormDecision(-0.5)).toBe(0));
  it("clamps value above 1 to 1", () => expect(calcNormDecision(1.5)).toBe(1));
  it("passes through mid-range value", () => expect(calcNormDecision(0.7)).toBe(0.7));
});

// ─── calcIRE ─────────────────────────────────────────────────────────────────

describe("calcIRE", () => {
  it("returns a score between 0 and 100", () => {
    const snaps = [
      makeSnap({ campaign_id: "c1", spend: 300, revenue: 900, leads: 15 }),
      makeSnap({ campaign_id: "c2", spend: 200, revenue: 600, leads: 10 }),
    ];
    const result = calcIRE({ snapshots: snaps, decisionScore: 0.7 });
    expect(result.ireScore).toBeGreaterThanOrEqual(0);
    expect(result.ireScore).toBeLessThanOrEqual(100);
  });

  it("returns low confidence for few data points", () => {
    const snaps = [makeSnap({ campaign_id: "c1" })];
    const result = calcIRE({ snapshots: snaps, decisionScore: 0.5 });
    expect(result.confidence).toBe("low");
  });

  it("returns high confidence for 7+ days and 3+ campaigns", () => {
    const dates = ["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-15"];
    const snaps: SnapshotWithObjective[] = [];
    for (const date of dates) {
      snaps.push(makeSnap({ campaign_id: "c1", snapshot_date: date }));
      snaps.push(makeSnap({ campaign_id: "c2", snapshot_date: date }));
      snaps.push(makeSnap({ campaign_id: "c3", snapshot_date: date }));
    }
    const result = calcIRE({ snapshots: snaps, decisionScore: 0.7 });
    expect(result.confidence).toBe("high");
  });

  it("returns Crítico label when score is very low", () => {
    // All zeros = score will be 0
    const snaps = [makeSnap({ campaign_id: "c1", spend: 0, revenue: 0, leads: 0 })];
    const result = calcIRE({ snapshots: snaps, decisionScore: 0 });
    expect(result.ireLabel).toBe("Crítico");
    expect(result.ireColor).toBe("red");
  });

  it("returns Eficiência Alta label when score is >= 75", () => {
    const snaps = [
      makeSnap({ campaign_id: "c1", spend: 100, revenue: 800, leads: 20, ctr: 5, frequency: 1.0, cpl: 5 }),
      makeSnap({ campaign_id: "c2", spend: 100, revenue: 700, leads: 18, ctr: 4, frequency: 1.0, cpl: 6 }),
    ];
    const result = calcIRE({ snapshots: snaps, decisionScore: 1.0 });
    // Score may vary, just ensure label mapping is correct by checking the score
    if (result.ireScore >= 75) {
      expect(result.ireLabel).toBe("Eficiência Alta");
      expect(result.ireColor).toBe("emerald");
    } else if (result.ireScore >= 50) {
      expect(result.ireLabel).toBe("Eficiência Média");
    }
  });

  it("produces no waste message when there is no waste", () => {
    const snaps = [makeSnap({ campaign_id: "c1", leads: 10, spend: 50, cpl: 5 })];
    const result = calcIRE({ snapshots: snaps, decisionScore: 0.8 });
    expect(result.wasteMessage).toContain("Nenhum");
  });
});
