import type { CampaignObjective, ObjectiveBenchmarks } from "@/types/erizon-v7";

// ─────────────────────────────────────────────────────────────────────────────
// Objective normalization
// Meta renamed campaign objectives in 2022. Both old and new names must be
// handled so the system works regardless of the account's API version.
// ─────────────────────────────────────────────────────────────────────────────

const OBJECTIVE_MAP: Record<string, CampaignObjective> = {
  // New API names (v17+)
  OUTCOME_LEADS: "LEADS",
  OUTCOME_SALES: "SALES",
  OUTCOME_TRAFFIC: "TRAFFIC",
  OUTCOME_AWARENESS: "AWARENESS",
  OUTCOME_ENGAGEMENT: "ENGAGEMENT",
  OUTCOME_APP_PROMOTION: "APP_PROMOTION",

  // Legacy API names
  LEAD_GENERATION: "LEADS",
  CONVERSIONS: "SALES",
  PRODUCT_CATALOG_SALES: "SALES",
  LINK_CLICKS: "TRAFFIC",
  BRAND_AWARENESS: "AWARENESS",
  REACH: "AWARENESS",
  POST_ENGAGEMENT: "ENGAGEMENT",
  PAGE_LIKES: "ENGAGEMENT",
  EVENT_RESPONSES: "ENGAGEMENT",
  VIDEO_VIEWS: "ENGAGEMENT",
  APP_INSTALLS: "APP_PROMOTION",
  STORE_VISITS: "SALES",
  MESSAGES: "LEADS",
};

/**
 * Normalizes a raw platform objective string to the canonical CampaignObjective.
 * Case-insensitive. Returns "UNKNOWN" for unrecognized values.
 */
export function normalizeObjective(raw?: string | null): CampaignObjective {
  if (!raw) return "UNKNOWN";
  return OBJECTIVE_MAP[raw.trim().toUpperCase()] ?? "UNKNOWN";
}

// ─────────────────────────────────────────────────────────────────────────────
// Primary KPI per objective
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the name of the primary KPI metric for a given objective.
 * Used to pick the right anomaly metric, the right benchmark, and to
 * generate objective-specific suggestions.
 */
export function getPrimaryMetric(objective: CampaignObjective): string {
  switch (objective) {
    case "LEADS":        return "cpl";
    case "SALES":        return "cpa";
    case "TRAFFIC":      return "cpc";
    case "AWARENESS":    return "cpm";
    case "ENGAGEMENT":   return "ctr";
    case "APP_PROMOTION":return "cpa";
    case "UNKNOWN":      return "cpl"; // safe fallback
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// System-wide default benchmarks per objective
// These are conservative industry references. Workspaces should configure
// their own via workspace_benchmarks (per-objective overrides).
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BENCHMARKS_BY_OBJECTIVE: Record<CampaignObjective, ObjectiveBenchmarks> = {
  LEADS: {
    objective: "LEADS",
    benchmarkCpl: 20,
    benchmarkCtr: 1.5,
    anomalyThreshold: 0.40,
  },
  SALES: {
    objective: "SALES",
    benchmarkCpa: 50,
    benchmarkRoas: 3.0,
    benchmarkCtr: 1.2,
    anomalyThreshold: 0.35,
  },
  TRAFFIC: {
    objective: "TRAFFIC",
    benchmarkCtr: 2.0,
    benchmarkCpc: 0.80,
    anomalyThreshold: 0.30,
  },
  AWARENESS: {
    objective: "AWARENESS",
    benchmarkCpm: 12.0,
    benchmarkFrequency: 4.0, // alert if frequency exceeds this
    anomalyThreshold: 0.40,
  },
  ENGAGEMENT: {
    objective: "ENGAGEMENT",
    benchmarkCtr: 3.0,
    benchmarkCpm: 10.0,
    anomalyThreshold: 0.35,
  },
  APP_PROMOTION: {
    objective: "APP_PROMOTION",
    benchmarkCpa: 8.0,
    benchmarkCtr: 1.0,
    anomalyThreshold: 0.40,
  },
  UNKNOWN: {
    objective: "UNKNOWN",
    benchmarkCtr: 1.5,
    benchmarkCpl: 20,
    anomalyThreshold: 0.40,
  },
};

/**
 * Returns the default benchmarks for a given objective.
 * These are used as fallback when no workspace-level override exists.
 */
export function getDefaultBenchmarks(objective: CampaignObjective): ObjectiveBenchmarks {
  return DEFAULT_BENCHMARKS_BY_OBJECTIVE[objective];
}

// ─────────────────────────────────────────────────────────────────────────────
// Objective-aware benchmark resolver
// Merges workspace-level overrides on top of system defaults.
// ─────────────────────────────────────────────────────────────────────────────

export type ResolvedBenchmarks = ObjectiveBenchmarks & {
  anomalyThreshold: number;
};

/**
 * Resolves the final benchmarks for a campaign by merging:
 *   1. System defaults for the objective (lowest priority)
 *   2. Workspace-level overrides (highest priority)
 *
 * This means a workspace can override specific metrics while keeping
 * the rest of the objective defaults intact.
 */
export function resolveBenchmarks(
  objective: CampaignObjective,
  workspaceOverrides?: Partial<ObjectiveBenchmarks>
): ResolvedBenchmarks {
  const defaults = getDefaultBenchmarks(objective);

  return {
    ...defaults,
    ...workspaceOverrides,
    objective, // objective is always the canonical one, never overridden
    anomalyThreshold:
      workspaceOverrides?.anomalyThreshold ??
      defaults.anomalyThreshold ??
      0.35,
  };
}
