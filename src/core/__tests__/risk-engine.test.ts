import { buildRiskEvents } from "../risk-engine";
import { resolveBenchmarks } from "../objective-engine";

describe("buildRiskEvents — LEADS", () => {
  const benchmarks = resolveBenchmarks("LEADS");

  it("returns cpl_pressure when CPL is 30% above benchmark", () => {
    const risks = buildRiskEvents({
      objective: "LEADS", benchmarks,
      ctr: 1.5, cpl: 26, cpa: 0, cpm: 0, cpc: 0, roas: 0, frequency: 0, spend: 100,
    });
    expect(risks.some(r => r.riskType === "cpl_pressure")).toBe(true);
  });

  it("returns ctr_drop for LEADS when CTR is below 70% of benchmark", () => {
    const risks = buildRiskEvents({
      objective: "LEADS", benchmarks,
      ctr: 0.9, cpl: 18, cpa: 0, cpm: 0, cpc: 0, roas: 0, frequency: 0, spend: 100,
    });
    expect(risks.some(r => r.riskType === "ctr_drop")).toBe(true);
  });

  it("returns no risks when LEADS metrics are healthy", () => {
    const risks = buildRiskEvents({
      objective: "LEADS", benchmarks,
      ctr: 2.0, cpl: 15, cpa: 0, cpm: 0, cpc: 0, roas: 0, frequency: 0, spend: 100,
    });
    expect(risks).toHaveLength(0);
  });
});

describe("buildRiskEvents — SALES", () => {
  const benchmarks = resolveBenchmarks("SALES");

  it("returns roas_drop when ROAS is below 70% of benchmark", () => {
    const risks = buildRiskEvents({
      objective: "SALES", benchmarks,
      ctr: 1.2, cpl: 0, cpa: 50, cpm: 0, cpc: 0, roas: 1.5, frequency: 0, spend: 100,
    });
    expect(risks.some(r => r.riskType === "roas_drop")).toBe(true);
  });

  it("returns cpa_pressure when CPA is 35% above benchmark", () => {
    const risks = buildRiskEvents({
      objective: "SALES", benchmarks,
      ctr: 1.2, cpl: 0, cpa: 70, cpm: 0, cpc: 0, roas: 3.0, frequency: 0, spend: 100,
    });
    expect(risks.some(r => r.riskType === "cpa_pressure")).toBe(true);
  });

  it("does NOT check CPL for SALES objective", () => {
    const risks = buildRiskEvents({
      objective: "SALES", benchmarks,
      ctr: 1.2, cpl: 999, cpa: 40, cpm: 0, cpc: 0, roas: 3.5, frequency: 0, spend: 100,
    });
    // High CPL should not trigger any risk for SALES — CPA and ROAS are the KPIs
    expect(risks.some(r => r.riskType === "cpl_pressure")).toBe(false);
  });
});

describe("buildRiskEvents — AWARENESS", () => {
  const benchmarks = resolveBenchmarks("AWARENESS");

  it("returns frequency_saturation when frequency exceeds benchmark", () => {
    const risks = buildRiskEvents({
      objective: "AWARENESS", benchmarks,
      ctr: 0, cpl: 0, cpa: 0, cpm: 10, cpc: 0, roas: 0, frequency: 5.0, spend: 200,
    });
    expect(risks.some(r => r.riskType === "frequency_saturation")).toBe(true);
  });

  it("severity is high when frequency is 50%+ above max", () => {
    const risks = buildRiskEvents({
      objective: "AWARENESS", benchmarks,
      ctr: 0, cpl: 0, cpa: 0, cpm: 10, cpc: 0, roas: 0, frequency: 7.0, spend: 200,
    });
    const freqRisk = risks.find(r => r.riskType === "frequency_saturation");
    expect(freqRisk?.severity).toBe("high");
  });

  it("does NOT return cpl_pressure for awareness campaigns", () => {
    const risks = buildRiskEvents({
      objective: "AWARENESS", benchmarks,
      ctr: 0, cpl: 999, cpa: 0, cpm: 8, cpc: 0, roas: 0, frequency: 2.0, spend: 200,
    });
    expect(risks.some(r => r.riskType === "cpl_pressure")).toBe(false);
  });
});

describe("buildRiskEvents — TRAFFIC", () => {
  const benchmarks = resolveBenchmarks("TRAFFIC");

  it("returns cpc_pressure when CPC is 60% above benchmark", () => {
    const risks = buildRiskEvents({
      objective: "TRAFFIC", benchmarks,
      ctr: 2.0, cpl: 0, cpa: 0, cpm: 0, cpc: 1.5, roas: 0, frequency: 0, spend: 100,
    });
    expect(risks.some(r => r.riskType === "cpc_pressure")).toBe(true);
  });
});
