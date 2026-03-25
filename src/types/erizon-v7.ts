// ─── Campaign Objective ────────────────────────────────────────────────────

/**
 * Canonical objective enum that normalizes across Meta API versions.
 * Meta renamed objectives in 2022 (e.g. CONVERSIONS → OUTCOME_SALES).
 * Both old and new names are accepted and mapped to this canonical set.
 */
export type CampaignObjective =
  | "LEADS"        // OUTCOME_LEADS, LEAD_GENERATION
  | "SALES"        // OUTCOME_SALES, CONVERSIONS, PRODUCT_CATALOG_SALES
  | "TRAFFIC"      // OUTCOME_TRAFFIC, LINK_CLICKS
  | "AWARENESS"    // OUTCOME_AWARENESS, BRAND_AWARENESS, REACH
  | "ENGAGEMENT"   // OUTCOME_ENGAGEMENT, POST_ENGAGEMENT, PAGE_LIKES
  | "APP_PROMOTION"// OUTCOME_APP_PROMOTION, APP_INSTALLS
  | "UNKNOWN";     // fallback for unrecognized values

/**
 * Metrics that are relevant per objective.
 * Each objective has a primary KPI and optional secondary metrics.
 */
export type ObjectiveBenchmarks = {
  objective: CampaignObjective;
  // Primary KPI thresholds
  benchmarkCpl?: number;       // LEADS
  benchmarkCpa?: number;       // SALES
  benchmarkRoas?: number;      // SALES
  benchmarkCtr?: number;       // TRAFFIC, ENGAGEMENT
  benchmarkCpm?: number;       // AWARENESS
  benchmarkCpc?: number;       // TRAFFIC
  benchmarkFrequency?: number; // AWARENESS (max acceptable)
  anomalyThreshold?: number;
};

// ─── External Platform Input ───────────────────────────────────────────────

export type MetaCampaignInput = {
  id: string;
  name: string;
  objective?: string | null;
  configured_status?: string | null;
  effective_status?: string | null;
  delivery_state?: string | null;
  daily_budget?: number | null;
  lifetime_budget?: number | null;
  account_id: string;
  insights?: {
    spend?: number;
    impressions?: number;
    reach?: number;
    clicks?: number;
    ctr?: number;
    cpc?: number;
    cpm?: number;
    leads?: number;
    purchases?: number;
    revenue?: number;
    frequency?: number;
  };
};

// ─── Snapshot ───────────────────────────────────────────────────────────────

export type DailyCampaignSnapshot = {
  workspaceId: string;
  clientId?: string | null;
  adAccountId: string;
  campaignId: string;
  objective?: string | null;  // raw value from platform, normalized by objective-engine
  snapshotDate: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  leads: number;
  purchases: number;
  revenue: number;
  cpl: number;
  cpa: number;
  roas: number;
  frequency: number;
  rawPayload?: unknown;
};

// ─── Benchmarks (per workspace/client) ─────────────────────────────────────

export type WorkspaceBenchmarks = {
  benchmarkCtr: number;
  benchmarkCpl: number;
  benchmarkCpa?: number;
  benchmarkRoas?: number;
  anomalyThreshold?: number; // default 0.35
};

// ─── Autopilot ──────────────────────────────────────────────────────────────

export type AutopilotSuggestion = {
  suggestionType: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  payload?: Record<string, unknown>;
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export type AuthContext = {
  userId: string;
  workspaceId: string;
  role: "owner" | "admin" | "analyst" | "viewer";
};

// ─── Generic Result type (avoids throw-everywhere pattern) ──────────────────

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };
