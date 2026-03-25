import { buildAutopilotSuggestions } from "../autopilot-engine";
import { resolveBenchmarks } from "../objective-engine";

describe("buildAutopilotSuggestions — LEADS", () => {
  const benchmarks = resolveBenchmarks("LEADS");

  it("returns scale_budget when CPL is healthy and ROI > 2", () => {
    const suggestions = buildAutopilotSuggestions({
      objective: "LEADS", benchmarks,
      ctr: 2.0, cpl: 14, cpa: 0, cpm: 0, cpc: 0, roas: 0, frequency: 0, spend: 100, roi: 3,
    });
    expect(suggestions.some(s => s.suggestionType === "scale_budget")).toBe(true);
  });

  it("returns creative_refresh when CTR < 75% of benchmark", () => {
    const suggestions = buildAutopilotSuggestions({
      objective: "LEADS", benchmarks,
      ctr: 1.0, cpl: 18, cpa: 0, cpm: 0, cpc: 0, roas: 0, frequency: 0, spend: 100, roi: 1,
    });
    expect(suggestions.some(s => s.suggestionType === "creative_refresh")).toBe(true);
  });

  it("returns pause_and_review when CPL is 50%+ above benchmark with spend", () => {
    const suggestions = buildAutopilotSuggestions({
      objective: "LEADS", benchmarks,
      ctr: 1.5, cpl: 32, cpa: 0, cpm: 0, cpc: 0, roas: 0, frequency: 0, spend: 200, roi: 0.5,
    });
    expect(suggestions.some(s => s.suggestionType === "pause_and_review")).toBe(true);
  });
});

describe("buildAutopilotSuggestions — SALES", () => {
  const benchmarks = resolveBenchmarks("SALES");

  it("returns reduce_budget when ROAS is below 70% of benchmark", () => {
    const suggestions = buildAutopilotSuggestions({
      objective: "SALES", benchmarks,
      ctr: 1.2, cpl: 0, cpa: 50, cpm: 0, cpc: 0, roas: 1.5, frequency: 0, spend: 200, roi: 1.5,
    });
    expect(suggestions.some(s => s.suggestionType === "reduce_budget")).toBe(true);
  });

  it("returns scale_budget aggressively when ROAS is 30%+ above benchmark", () => {
    const suggestions = buildAutopilotSuggestions({
      objective: "SALES", benchmarks,
      ctr: 1.5, cpl: 0, cpa: 30, cpm: 0, cpc: 0, roas: 5.0, frequency: 0, spend: 200, roi: 5,
    });
    const scale = suggestions.find(s => s.suggestionType === "scale_budget");
    expect(scale).toBeDefined();
    expect(scale?.payload?.suggestedIncreasePct).toBe(30);
  });
});

describe("buildAutopilotSuggestions — AWARENESS", () => {
  const benchmarks = resolveBenchmarks("AWARENESS");

  it("returns refresh_audience with high priority when frequency is critically high", () => {
    const suggestions = buildAutopilotSuggestions({
      objective: "AWARENESS", benchmarks,
      ctr: 0, cpl: 0, cpa: 0, cpm: 10, cpc: 0, roas: 0, frequency: 7.0, spend: 500, roi: 0,
    });
    const refresh = suggestions.find(s => s.suggestionType === "refresh_audience");
    expect(refresh).toBeDefined();
    expect(refresh?.priority).toBe("high");
  });

  it("returns scale_budget when CPM is 30%+ below benchmark", () => {
    const suggestions = buildAutopilotSuggestions({
      objective: "AWARENESS", benchmarks,
      ctr: 0, cpl: 0, cpa: 0, cpm: 7.0, cpc: 0, roas: 0, frequency: 2.0, spend: 100, roi: 0,
    });
    expect(suggestions.some(s => s.suggestionType === "scale_budget")).toBe(true);
  });
});

describe("buildAutopilotSuggestions — general", () => {
  it("always returns at least one suggestion (monitor fallback)", () => {
    const benchmarks = resolveBenchmarks("LEADS");
    const suggestions = buildAutopilotSuggestions({
      objective: "LEADS", benchmarks,
      ctr: 2.0, cpl: 18, cpa: 0, cpm: 0, cpc: 0, roas: 0, frequency: 0, spend: 0, roi: 0,
    });
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("monitor suggestion mentions the objective in its description", () => {
    const benchmarks = resolveBenchmarks("AWARENESS");
    const suggestions = buildAutopilotSuggestions({
      objective: "AWARENESS", benchmarks,
      ctr: 0, cpl: 0, cpa: 0, cpm: 10, cpc: 0, roas: 0, frequency: 2.0, spend: 0, roi: 0,
    });
    const monitor = suggestions.find(s => s.suggestionType === "monitor");
    expect(monitor?.description).toContain("awareness");
  });
});
