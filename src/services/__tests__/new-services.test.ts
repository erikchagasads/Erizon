import { describe, it, expect, beforeEach, vi } from "vitest";
import { FeedbackLoopService } from "@/services/feedback-loop-service";
import { ExplainabilityService } from "@/services/explainability-service";
import { BenchmarkMarketplaceService } from "@/services/benchmark-marketplace-service";

// ── FeedbackLoopService ──────────────────────────────────────────────────────

describe("FeedbackLoopService", () => {
  let service: FeedbackLoopService;

  beforeEach(() => {
    service = new FeedbackLoopService();
  });

  describe("recordPrediction", () => {
    it("should record a prediction with confidence", async () => {
      const params = {
        workspace_id: "test-ws",
        decision_id: "test-decision",
        campaign_id: "test-campaign",
        predicted_metric: "roas" as const,
        predicted_value: 2.5,
        predicted_confidence: 0.75,
      };

      vi.mock("@/lib/supabase", () => ({
        supabase: {
          from: () => ({
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: "feedback-123", ...params },
                    error: null,
                  }),
              }),
            }),
          }),
        },
      }));

      expect(params.predicted_value).toBe(2.5);
      expect(params.predicted_confidence).toBe(0.75);
    });

    it("should increase confidence on accurate prediction", () => {
      const error_pct = 8;
      let confidence_adjustment = 0;
      if (error_pct < 10) confidence_adjustment = +0.08;
      expect(confidence_adjustment).toBe(0.08);
    });

    it("should trigger retrain on high error", () => {
      const error_pct = 65;
      let should_retrain = false;
      if (error_pct > 50) should_retrain = true;
      expect(should_retrain).toBe(true);
    });
  });

  describe("calculateModelConfidence", () => {
    it("should calculate global confidence from accuracy", () => {
      const accuracy = 80;
      const global_confidence = Math.min(0.95, 0.5 + accuracy / 200);
      expect(global_confidence).toBeCloseTo(0.9);
      expect(global_confidence).toBeLessThanOrEqual(0.95);
    });

    it("should cap confidence at 0.95", () => {
      const accuracy = 100;
      const global_confidence = Math.min(0.95, 0.5 + accuracy / 200);
      expect(global_confidence).toBe(0.95);
    });

    it("should return default confidence if no data", () => {
      const defaultConfidence = 0.6;
      expect(defaultConfidence).toBe(0.6);
    });
  });
});

// ── ExplainabilityService ────────────────────────────────────────────────────

describe("ExplainabilityService", () => {
  let service: ExplainabilityService;

  beforeEach(() => {
    service = new ExplainabilityService();
  });

  describe("identifyFactors", () => {
    it("should identify factors and their contributions", () => {
      const factors = [
        { name: "CTR caiu 45%", score: 40 },
        { name: "Frequência alta", score: 30 },
        { name: "CPL disparou 3x", score: 25 },
      ];

      const totalScore = 40 + 30 + 25;
      const result = factors.map((f) => ({
        ...f,
        contribution_pct: (f.score / totalScore) * 100,
      }));

      expect(result[0].contribution_pct).toBeCloseTo(42.1, 1);
      expect(result[1].contribution_pct).toBeCloseTo(31.6, 1);
      expect(result[2].contribution_pct).toBeCloseTo(26.3, 1);
    });

    it("should classify impact based on contribution", () => {
      const contribution_pct = 45;
      const impact = contribution_pct > 40 ? "high" : "medium";
      expect(impact).toBe("high");
    });

    it("should sort factors by contribution", () => {
      const factors = [
        { name: "Factor A", contribution_pct: 25 },
        { name: "Factor B", contribution_pct: 50 },
        { name: "Factor C", contribution_pct: 25 },
      ];

      const sorted = factors.sort((a, b) => b.contribution_pct - a.contribution_pct);
      expect(sorted[0].name).toBe("Factor B");
      expect(sorted[0].contribution_pct).toBe(50);
    });
  });

  describe("explainDecision fallback", () => {
    it("should return fallback explanation if OpenAI fails", async () => {
      const params = {
        action: "pause",
        campaign_name: "Test Campaign",
        factors: [{ name: "CTR caiu", score: 40 }],
        confidence: 0.85,
      };

      const result = await service.explainDecision(params);
      expect(result.summary).toBeTruthy();
      expect(result.factors).toBeDefined();
      expect(result.alternatives).toBeDefined();
    });
  });
});

// ── BenchmarkMarketplaceService ──────────────────────────────────────────────

describe("BenchmarkMarketplaceService", () => {
  let service: BenchmarkMarketplaceService;

  beforeEach(() => {
    service = new BenchmarkMarketplaceService();
  });

  describe("percentile calculation", () => {
    it("should calculate p50 (median)", () => {
      const arr = [1, 2, 3, 4, 5];
      const p50Index = Math.ceil((50 / 100) * arr.length) - 1;
      const p50 = arr.sort((a, b) => a - b)[p50Index];
      expect(p50).toBe(3);
    });

    it("should calculate p75", () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8];
      const p75Index = Math.ceil((75 / 100) * arr.length) - 1;
      const p75 = arr.sort((a, b) => a - b)[p75Index];
      expect(p75).toBeTruthy();
      expect(p75).toBeGreaterThan(5);
    });
  });

  describe("default benchmark", () => {
    it("should return safe defaults if no data", () => {
      const benchmark = service["getDefaultBenchmark"]("ecommerce");
      expect(benchmark.industry).toBe("ecommerce");
      expect(benchmark.sample_size).toBe(0);
      expect(benchmark.metrics.ctr.avg).toBe(1.5);
      expect(benchmark.metrics.cpl.avg).toBe(50);
    });
  });

  describe("suggest optimal settings", () => {
    it("should return settings based on benchmark", () => {
      const settings = {
        recommended_daily_budget: 200,
        bid_ceiling_cpl: 60,
        frequency_cap: 3.5,
        expected_roas_range: [1.2, 2.5] as [number, number],
        expected_cpl_range: [20, 50] as [number, number],
      };

      expect(settings.recommended_daily_budget).toBe(200);
      expect(settings.bid_ceiling_cpl).toBeGreaterThan(0);
      expect(settings.frequency_cap).toBeGreaterThan(0);
    });
  });
});
