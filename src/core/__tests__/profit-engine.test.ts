import { calculateProfit } from "../profit-engine";

describe("calculateProfit", () => {
  it("calculates profit and roi correctly", () => {
    const result = calculateProfit(100, 300);
    expect(result.profit).toBe(200);
    expect(result.roi).toBe(3);
    expect(result.roas).toBe(3);
    expect(result.spend).toBe(100);
    expect(result.revenue).toBe(300);
  });

  it("returns roi of 0 when spend is zero", () => {
    const result = calculateProfit(0, 100);
    expect(result.roi).toBe(0);
    expect(result.profit).toBe(100);
  });

  it("returns negative profit when spend exceeds revenue", () => {
    const result = calculateProfit(200, 100);
    expect(result.profit).toBe(-100);
    expect(result.roi).toBe(0.5);
  });
});
