/**
 * anomaly-engine.test.ts
 * Tests for isMetricAnomalous and detectPrimaryAnomaly.
 */

import { describe, expect, it } from "vitest";
import { isMetricAnomalous, detectPrimaryAnomaly } from "@/core/anomaly-engine";
import { resolveBenchmarks } from "@/core/objective-engine";

// ─── isMetricAnomalous ────────────────────────────────────────────────────────

describe("isMetricAnomalous", () => {
  it("returns true for strong positive deviation", () => {
    expect(isMetricAnomalous(40, 20, 0.4)).toBe(true);
  });

  it("returns false when baseline is zero", () => {
    expect(isMetricAnomalous(10, 0, 0.4)).toBe(false);
  });

  it("returns false when baseline is negative", () => {
    expect(isMetricAnomalous(50, -10)).toBe(false);
  });

  it("returns false when deviation is below threshold", () => {
    // 20% deviation, threshold 35%
    expect(isMetricAnomalous(24, 20, 0.35)).toBe(false);
  });

  it("returns true when deviation meets threshold exactly", () => {
    // 35% deviation, threshold 35%
    expect(isMetricAnomalous(27, 20, 0.35)).toBe(true);
  });

  it("returns true when value is significantly below baseline (downward anomaly)", () => {
    expect(isMetricAnomalous(5, 20, 0.35)).toBe(true);
  });

  it("uses default threshold of 0.35 when not provided", () => {
    expect(isMetricAnomalous(13, 20)).toBe(true);   // ~35% deviation
    expect(isMetricAnomalous(14, 20)).toBe(false);  // 30% deviation
  });

  it("returns false when today equals baseline (zero deviation)", () => {
    expect(isMetricAnomalous(20, 20, 0.35)).toBe(false);
  });
});

// ─── detectPrimaryAnomaly ────────────────────────────────────────────────────

describe("detectPrimaryAnomaly", () => {
  const leadsMetrics = { cpl: 40, cpa: 0, cpm: 0, cpc: 0, ctr: 1.5 };
  const leadsBenchmarks = resolveBenchmarks("LEADS"); // benchmarkCpl = 20, threshold = 0.40

  it("returns non-null result when deviation exceeds threshold", () => {
    // CPL 40 vs baseline 20 → 100% deviation, well above 0.40
    const result = detectPrimaryAnomaly("LEADS", leadsMetrics, leadsBenchmarks);
    expect(result).not.toBeNull();
    expect(result?.isAnomalous).toBe(true);
  });

  it("reports the correct metric name for LEADS objective", () => {
    const result = detectPrimaryAnomaly("LEADS", leadsMetrics, leadsBenchmarks);
    expect(result?.metricName).toBe("cpl");
  });

  it("reports correct deviationPct", () => {
    // CPL 40 vs baseline 20 → 100%
    const result = detectPrimaryAnomaly("LEADS", leadsMetrics, leadsBenchmarks);
    expect(result?.deviationPct).toBe(100);
  });

  it("returns result with isAnomalous:false when within threshold", () => {
    const healthyMetrics = { cpl: 21, cpa: 0, cpm: 0, cpc: 0, ctr: 1.5 };
    // CPL 21 vs baseline 20 → 5% deviation, below 0.40
    const result = detectPrimaryAnomaly("LEADS", healthyMetrics, leadsBenchmarks);
    expect(result).not.toBeNull();
    expect(result?.isAnomalous).toBe(false);
  });

  it("returns null when metric value is zero", () => {
    const zeroMetrics = { cpl: 0, cpa: 0, cpm: 0, cpc: 0, ctr: 0 };
    const result = detectPrimaryAnomaly("LEADS", zeroMetrics, leadsBenchmarks);
    expect(result).toBeNull();
  });

  it("returns null when benchmark has no baseline for the primary metric", () => {
    const emptyBenchmarks = { objective: "LEADS" as const, anomalyThreshold: 0.35 };
    const result = detectPrimaryAnomaly("LEADS", leadsMetrics, emptyBenchmarks);
    expect(result).toBeNull();
  });

  it("uses SALES primary metric (cpa) not cpl", () => {
    const salesMetrics = { cpl: 999, cpa: 80, cpm: 0, cpc: 0, ctr: 1.5 };
    const salesBenchmarks = resolveBenchmarks("SALES");
    const result = detectPrimaryAnomaly("SALES", salesMetrics, salesBenchmarks);
    expect(result?.metricName).toBe("cpa");
  });

  it("uses AWARENESS primary metric (cpm)", () => {
    const awarenessMetrics = { cpl: 0, cpa: 0, cpm: 50, cpc: 0, ctr: 0 };
    const awarenessBenchmarks = resolveBenchmarks("AWARENESS");
    const result = detectPrimaryAnomaly("AWARENESS", awarenessMetrics, awarenessBenchmarks);
    expect(result?.metricName).toBe("cpm");
  });

  it("uses custom anomalyThreshold from benchmarks", () => {
    const customBenchmarks = { ...leadsBenchmarks, anomalyThreshold: 0.9 };
    // CPL 40 vs baseline 20 → 100% deviation, above 0.9 threshold
    const result = detectPrimaryAnomaly("LEADS", leadsMetrics, customBenchmarks);
    expect(result?.isAnomalous).toBe(true);

    const tightBenchmarks = { ...leadsBenchmarks, anomalyThreshold: 1.5 };
    // CPL 40 vs baseline 20 → 100% deviation, below 1.5 threshold
    const result2 = detectPrimaryAnomaly("LEADS", leadsMetrics, tightBenchmarks);
    expect(result2?.isAnomalous).toBe(false);
  });
});
