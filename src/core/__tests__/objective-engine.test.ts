import { normalizeObjective, getPrimaryMetric, resolveBenchmarks, getDefaultBenchmarks } from "../objective-engine";

describe("normalizeObjective", () => {
  it("maps new API names correctly", () => {
    expect(normalizeObjective("OUTCOME_LEADS")).toBe("LEADS");
    expect(normalizeObjective("OUTCOME_SALES")).toBe("SALES");
    expect(normalizeObjective("OUTCOME_TRAFFIC")).toBe("TRAFFIC");
    expect(normalizeObjective("OUTCOME_AWARENESS")).toBe("AWARENESS");
    expect(normalizeObjective("OUTCOME_ENGAGEMENT")).toBe("ENGAGEMENT");
    expect(normalizeObjective("OUTCOME_APP_PROMOTION")).toBe("APP_PROMOTION");
  });

  it("maps legacy API names correctly", () => {
    expect(normalizeObjective("LEAD_GENERATION")).toBe("LEADS");
    expect(normalizeObjective("CONVERSIONS")).toBe("SALES");
    expect(normalizeObjective("PRODUCT_CATALOG_SALES")).toBe("SALES");
    expect(normalizeObjective("LINK_CLICKS")).toBe("TRAFFIC");
    expect(normalizeObjective("BRAND_AWARENESS")).toBe("AWARENESS");
    expect(normalizeObjective("REACH")).toBe("AWARENESS");
    expect(normalizeObjective("POST_ENGAGEMENT")).toBe("ENGAGEMENT");
    expect(normalizeObjective("APP_INSTALLS")).toBe("APP_PROMOTION");
    expect(normalizeObjective("MESSAGES")).toBe("LEADS");
  });

  it("is case-insensitive", () => {
    expect(normalizeObjective("outcome_leads")).toBe("LEADS");
    expect(normalizeObjective("Lead_Generation")).toBe("LEADS");
  });

  it("returns UNKNOWN for null, undefined or unrecognized values", () => {
    expect(normalizeObjective(null)).toBe("UNKNOWN");
    expect(normalizeObjective(undefined)).toBe("UNKNOWN");
    expect(normalizeObjective("SOME_FUTURE_OBJECTIVE")).toBe("UNKNOWN");
    expect(normalizeObjective("")).toBe("UNKNOWN");
  });
});

describe("getPrimaryMetric", () => {
  it("returns correct primary KPI per objective", () => {
    expect(getPrimaryMetric("LEADS")).toBe("cpl");
    expect(getPrimaryMetric("SALES")).toBe("cpa");
    expect(getPrimaryMetric("TRAFFIC")).toBe("cpc");
    expect(getPrimaryMetric("AWARENESS")).toBe("cpm");
    expect(getPrimaryMetric("ENGAGEMENT")).toBe("ctr");
    expect(getPrimaryMetric("APP_PROMOTION")).toBe("cpa");
    expect(getPrimaryMetric("UNKNOWN")).toBe("cpl");
  });
});

describe("resolveBenchmarks", () => {
  it("returns system defaults when no workspace overrides provided", () => {
    const result = resolveBenchmarks("LEADS");
    expect(result.benchmarkCpl).toBe(20);
    expect(result.benchmarkCtr).toBe(1.5);
    expect(result.anomalyThreshold).toBe(0.40);
    expect(result.objective).toBe("LEADS");
  });

  it("workspace override takes precedence over system default", () => {
    const result = resolveBenchmarks("LEADS", { benchmarkCpl: 35 });
    expect(result.benchmarkCpl).toBe(35);
    expect(result.benchmarkCtr).toBe(1.5); // untouched default
  });

  it("objective is never overridden by workspace config", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = resolveBenchmarks("SALES", { objective: "LEADS" } as any);
    expect(result.objective).toBe("SALES");
  });

  it("AWARENESS defaults include frequency and cpm", () => {
    const result = resolveBenchmarks("AWARENESS");
    expect(result.benchmarkCpm).toBeDefined();
    expect(result.benchmarkFrequency).toBeDefined();
    expect(result.benchmarkCpl).toBeUndefined();
  });

  it("TRAFFIC defaults include cpc and ctr, not cpl", () => {
    const result = resolveBenchmarks("TRAFFIC");
    expect(result.benchmarkCpc).toBeDefined();
    expect(result.benchmarkCtr).toBeDefined();
    expect(result.benchmarkCpl).toBeUndefined();
  });

  it("anomalyThreshold from workspace override wins over default", () => {
    const result = resolveBenchmarks("LEADS", { anomalyThreshold: 0.5 });
    expect(result.anomalyThreshold).toBe(0.5);
  });
});

describe("getDefaultBenchmarks", () => {
  it("each objective has defined defaults with no undefined anomalyThreshold", () => {
    const objectives = ["LEADS","SALES","TRAFFIC","AWARENESS","ENGAGEMENT","APP_PROMOTION","UNKNOWN"] as const;
    for (const obj of objectives) {
      const defaults = getDefaultBenchmarks(obj);
      expect(defaults.objective).toBe(obj);
      expect(defaults.anomalyThreshold).toBeDefined();
    }
  });
});
