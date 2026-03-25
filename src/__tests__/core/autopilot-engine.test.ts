import { describe, expect, it } from "vitest";
import { buildAutopilotSuggestions } from "@/core/autopilot-engine";

describe("buildAutopilotSuggestions", () => {
  it("recommends scaling when cpl is healthy and roi is strong", () => {
    const result = buildAutopilotSuggestions({
      ctr: 2,
      cpl: 10,
      benchmarkCtr: 1.5,
      benchmarkCpl: 20,
      roi: 3,
    });

    expect(result.some((x) => x.suggestionType === "scale_budget")).toBe(true);
  });
});
