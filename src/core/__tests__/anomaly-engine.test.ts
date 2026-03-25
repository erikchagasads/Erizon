import { isMetricAnomalous } from "../anomaly-engine";

describe("isMetricAnomalous", () => {
  it("returns false when baseline is zero or negative", () => {
    expect(isMetricAnomalous(50, 0)).toBe(false);
    expect(isMetricAnomalous(50, -10)).toBe(false);
  });

  it("returns false when deviation is below threshold", () => {
    // 20% deviation, threshold 35%
    expect(isMetricAnomalous(24, 20, 0.35)).toBe(false);
  });

  it("returns true when deviation meets threshold", () => {
    // 40% deviation, threshold 35%
    expect(isMetricAnomalous(28, 20, 0.35)).toBe(true);
  });

  it("returns true when value is significantly below baseline", () => {
    expect(isMetricAnomalous(5, 20, 0.35)).toBe(true);
  });

  it("uses default threshold of 0.35 when not provided", () => {
    expect(isMetricAnomalous(13, 20)).toBe(true);  // 35% deviation
    expect(isMetricAnomalous(14, 20)).toBe(false); // 30% deviation
  });
});
