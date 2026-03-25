/**
 * predictive-roas.test.ts
 * Tests for predictROAS.
 */

import { describe, it, expect } from "vitest";
import { predictROAS } from "@/core/predictive-roas-engine";
import type { SnapshotWithObjective } from "@/repositories/supabase/snapshot-repository";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSnap(overrides: Partial<SnapshotWithObjective> & { campaign_id: string; snapshot_date: string }): SnapshotWithObjective {
  return {
    objective: "OUTCOME_LEADS",
    spend: 200,
    impressions: 5000,
    reach: 4000,
    clicks: 100,
    ctr: 2.0,
    cpc: 2.0,
    cpm: 40,
    leads: 10,
    purchases: 0,
    revenue: 800,
    cpl: 20,
    cpa: 0,
    roas: 4.0,
    frequency: 1.5,
    ...overrides,
  };
}

/** Generates N days of snapshot history ending on a given date. */
function genHistory(campaignId: string, days: number, roasPerDay: number, baseDate = "2026-03-15"): SnapshotWithObjective[] {
  const result: SnapshotWithObjective[] = [];
  const base = new Date(baseDate);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    result.push(makeSnap({
      campaign_id: campaignId,
      snapshot_date: dateStr,
      spend: 200,
      revenue: 200 * roasPerDay,
    }));
  }
  return result;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("predictROAS — insufficient data", () => {
  it("returns 0 predictedRoas when snapshot history is empty", () => {
    const result = predictROAS({ snapshotHistory: [], decisionScore: 0.5, pendingSuggestionsCount: 0 });
    expect(result.predictedRoas).toBe(0);
    expect(result.confidenceLow).toBe(0);
    expect(result.confidenceHigh).toBe(0);
  });

  it("returns narrative indicating insufficient data when no spend history", () => {
    const snap = makeSnap({ campaign_id: "c1", snapshot_date: "2026-03-15", spend: 0, revenue: 0 });
    const result = predictROAS({ snapshotHistory: [snap], decisionScore: 0.5, pendingSuggestionsCount: 0 });
    expect(result.narrative).toContain("Dados insuficientes");
  });
});

describe("predictROAS — basic predictions", () => {
  it("returns positive predictedRoas with valid history", () => {
    const snaps = genHistory("c1", 10, 3.0);
    const result = predictROAS({ snapshotHistory: snaps, decisionScore: 0.5, pendingSuggestionsCount: 0 });
    expect(result.predictedRoas).toBeGreaterThan(0);
  });

  it("confidenceLow <= predictedRoas <= confidenceHigh", () => {
    const snaps = genHistory("c1", 10, 3.0);
    const result = predictROAS({ snapshotHistory: snaps, decisionScore: 0.5, pendingSuggestionsCount: 0 });
    expect(result.confidenceLow).toBeLessThanOrEqual(result.predictedRoas);
    expect(result.confidenceHigh).toBeGreaterThanOrEqual(result.predictedRoas);
  });

  it("uses custom horizonDays", () => {
    const snaps = genHistory("c1", 14, 3.0);
    const result = predictROAS({ snapshotHistory: snaps, decisionScore: 0.5, pendingSuggestionsCount: 0, horizonDays: 14 });
    expect(result.horizonDays).toBe(14);
  });

  it("defaults to horizonDays = 7 when not provided", () => {
    const snaps = genHistory("c1", 10, 3.0);
    const result = predictROAS({ snapshotHistory: snaps, decisionScore: 0.5, pendingSuggestionsCount: 0 });
    expect(result.horizonDays).toBe(7);
  });
});

describe("predictROAS — trend detection", () => {
  it("predicts higher ROAS when trend is consistently rising", () => {
    const snaps: SnapshotWithObjective[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date("2026-03-01");
      date.setDate(date.getDate() + i);
      snaps.push(makeSnap({
        campaign_id: "c1",
        snapshot_date: date.toISOString().slice(0, 10),
        spend: 100,
        revenue: 100 * (1.0 + i * 0.2), // ROAS increasing from 1.0 to 3.6
      }));
    }
    const result = predictROAS({ snapshotHistory: snaps, decisionScore: 0.5, pendingSuggestionsCount: 0 });
    expect(result.inputs.trendSlope).toBeGreaterThan(0);
  });

  it("includes baseRoas in inputs", () => {
    const snaps = genHistory("c1", 10, 4.0);
    const result = predictROAS({ snapshotHistory: snaps, decisionScore: 0.5, pendingSuggestionsCount: 0 });
    expect(result.inputs.baseRoas).toBeCloseTo(4.0, 1);
  });

  it("daysOfData reflects the number of unique days with spend", () => {
    const snaps = genHistory("c1", 7, 3.0);
    const result = predictROAS({ snapshotHistory: snaps, decisionScore: 0.5, pendingSuggestionsCount: 0 });
    expect(result.inputs.daysOfData).toBe(7);
  });
});

describe("predictROAS — decision adjustment", () => {
  it("applies positive decisionAdjustment when pendingSuggestions>0 and decisionScore>0.5", () => {
    const snaps = genHistory("c1", 10, 3.0);
    const result = predictROAS({ snapshotHistory: snaps, decisionScore: 0.8, pendingSuggestionsCount: 3 });
    expect(result.inputs.decisionAdjustment).toBeGreaterThan(0);
  });

  it("applies zero decisionAdjustment when decisionScore <= 0.5", () => {
    const snaps = genHistory("c1", 10, 3.0);
    const result = predictROAS({ snapshotHistory: snaps, decisionScore: 0.4, pendingSuggestionsCount: 5 });
    expect(result.inputs.decisionAdjustment).toBe(0);
  });
});

describe("predictROAS — narrative", () => {
  it("narrative includes ROAS base", () => {
    const snaps = genHistory("c1", 10, 3.5);
    const result = predictROAS({ snapshotHistory: snaps, decisionScore: 0.5, pendingSuggestionsCount: 0 });
    expect(result.narrative).toContain("ROAS base");
  });

  it("narrative includes seasonalidade line", () => {
    const snaps = genHistory("c1", 10, 3.0);
    const result = predictROAS({ snapshotHistory: snaps, decisionScore: 0.5, pendingSuggestionsCount: 0 });
    expect(result.narrative).toContain("Sazonalidade");
  });
});
