import { createServerSupabase } from "@/lib/supabase/server";

export class IntelligenceRepository {
  private db = createServerSupabase();

  // ── Anomalies ─────────────────────────────────────────────────────────────

  /** Upsert prevents duplicate anomalies on repeated runs for the same campaign+date+metric */
  async upsertAnomaly(input: {
    workspaceId: string;
    campaignId?: string;
    snapshotDate: string;
    title: string;
    description?: string;
    severity: string;
    metricName?: string;
    metricValue?: number;
    baselineValue?: number;
  }) {
    const { error } = await this.db.from("anomaly_events").upsert(
      {
        workspace_id: input.workspaceId,
        campaign_id: input.campaignId ?? null,
        snapshot_date: input.snapshotDate,
        event_type: "metric_anomaly",
        severity: input.severity,
        title: input.title,
        description: input.description ?? null,
        metric_name: input.metricName ?? null,
        metric_value: input.metricValue ?? null,
        baseline_value: input.baselineValue ?? null,
        detected_at: new Date().toISOString(),
      },
      { onConflict: "campaign_id,snapshot_date,metric_name" }
    );
    if (error) throw error;
  }

  // ── Risks ─────────────────────────────────────────────────────────────────

  /** Upsert prevents duplicate risk entries for the same campaign+date+riskType */
  async upsertRisk(input: {
    workspaceId: string;
    campaignId?: string;
    snapshotDate: string;
    riskType: string;
    severity: string;
    title: string;
    description?: string;
  }) {
    const { error } = await this.db.from("risk_events").upsert(
      {
        workspace_id: input.workspaceId,
        campaign_id: input.campaignId ?? null,
        snapshot_date: input.snapshotDate,
        risk_type: input.riskType,
        severity: input.severity,
        title: input.title,
        description: input.description ?? null,
      },
      { onConflict: "campaign_id,snapshot_date,risk_type" }
    );
    if (error) throw error;
  }

  // ── Opportunities ─────────────────────────────────────────────────────────

  async upsertOpportunity(input: {
    workspaceId: string;
    campaignId?: string;
    snapshotDate: string;
    title: string;
    description?: string;
    opportunityType: string;
  }) {
    const { error } = await this.db.from("opportunity_events").upsert(
      {
        workspace_id: input.workspaceId,
        campaign_id: input.campaignId ?? null,
        snapshot_date: input.snapshotDate,
        title: input.title,
        description: input.description ?? null,
        opportunity_type: input.opportunityType,
      },
      { onConflict: "campaign_id,snapshot_date,opportunity_type" }
    );
    if (error) throw error;
  }

  // ── Overview query ────────────────────────────────────────────────────────

  async listOverview(workspaceId: string) {
    const [
      { data: anomalies },
      { data: risks },
      { data: opportunities },
      { data: suggestions },
    ] = await Promise.all([
      this.db
        .from("anomaly_events")
        .select("title,severity,snapshot_date")
        .eq("workspace_id", workspaceId)
        .order("detected_at", { ascending: false })
        .limit(10),
      this.db
        .from("risk_events")
        .select("title,severity,snapshot_date")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(10),
      this.db
        .from("opportunity_events")
        .select("title,snapshot_date")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(10),
      this.db
        .from("autopilot_suggestions")
        .select("title,priority")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      anomalies: anomalies ?? [],
      risks: risks ?? [],
      opportunities: opportunities ?? [],
      suggestions: suggestions ?? [],
    };
  }
}
