import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface CampaignRelation {
  name: string | null;
}

interface CampaignSnapshotDailyRow {
  workspace_id: string;
  campaign_id: string;
  cpl: number | null;
  snapshot_date: string;
  created_at: string;
  campaigns: CampaignRelation | CampaignRelation[] | null;
}

interface PersistedCplAlert {
  workspace_id: string;
  campaign_id: string;
  threshold_cpl: number | null;
}

interface CplAlert {
  workspace_id: string;
  campaign_id: string;
  campaign_name: string;
  current_cpl: number;
  threshold_cpl: number;
  delta_percent: number;
  triggered_at: string;
}

const CPL_ALERT_THRESHOLD = 30;
const HISTORY_LOOKBACK_DAYS = 8;
const DEDUPE_WINDOW_HOURS = 12;

function asPositiveNumber(value: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function startDate(daysBack: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

function extractCampaignName(relation: CampaignSnapshotDailyRow["campaigns"]): string {
  if (Array.isArray(relation)) {
    return relation[0]?.name ?? "Campanha sem nome";
  }

  return relation?.name ?? "Campanha sem nome";
}

Deno.serve(async (req) => {
  try {
    const { workspace_id } = await req.json().catch(() => ({}));

    let query = supabase
      .from("campaign_snapshots_daily")
      .select("workspace_id, campaign_id, cpl, snapshot_date, created_at, campaigns(name)")
      .gte("snapshot_date", startDate(HISTORY_LOOKBACK_DAYS))
      .order("snapshot_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (workspace_id) {
      query = query.eq("workspace_id", workspace_id);
    }

    const { data: snapshots, error: snapshotsError } = await query.limit(1000);
    if (snapshotsError) throw snapshotsError;

    const records = (snapshots ?? []) as CampaignSnapshotDailyRow[];
    if (records.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, alerts_generated: 0, alerts: [] }),
        { headers: { "content-type": "application/json" } },
      );
    }

    const campaignMap = new Map<string, CampaignSnapshotDailyRow[]>();
    for (const record of records) {
      if (!campaignMap.has(record.campaign_id)) {
        campaignMap.set(record.campaign_id, []);
      }

      campaignMap.get(record.campaign_id)!.push(record);
    }

    const alerts: CplAlert[] = [];

    for (const [campaignId, campaignRecords] of campaignMap.entries()) {
      if (campaignRecords.length < 2) continue;

      const [latest, ...history] = campaignRecords;
      const currentCpl = asPositiveNumber(latest.cpl);
      if (!currentCpl) continue;

      const historyValues = history
        .map((item) => asPositiveNumber(item.cpl))
        .filter((item): item is number => item !== null);

      if (historyValues.length === 0) continue;

      const avgCpl = historyValues.reduce((sum, item) => sum + item, 0) / historyValues.length;
      if (!avgCpl) continue;

      const delta = ((currentCpl - avgCpl) / avgCpl) * 100;
      if (delta <= CPL_ALERT_THRESHOLD) continue;

      alerts.push({
        workspace_id: latest.workspace_id,
        campaign_id: campaignId,
        campaign_name: extractCampaignName(latest.campaigns),
        current_cpl: Number(currentCpl.toFixed(2)),
        threshold_cpl: Number(avgCpl.toFixed(2)),
        delta_percent: Math.round(delta),
        triggered_at: new Date().toISOString(),
      });
    }

    if (alerts.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, alerts_generated: 0, alerts: [] }),
        { headers: { "content-type": "application/json" } },
      );
    }

    const recentCutoff = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const { data: existingAlerts, error: existingAlertsError } = await supabase
      .from("cpl_alerts")
      .select("workspace_id, campaign_id, threshold_cpl")
      .gte("triggered_at", recentCutoff);

    if (existingAlertsError) throw existingAlertsError;

    const dedupeSet = new Set(
      ((existingAlerts ?? []) as PersistedCplAlert[]).map(
        (item) => `${item.workspace_id}|${item.campaign_id}|${Number(item.threshold_cpl ?? 0).toFixed(2)}`,
      ),
    );

    const newAlerts = alerts.filter((item) => {
      const key = `${item.workspace_id}|${item.campaign_id}|${item.threshold_cpl.toFixed(2)}`;
      return !dedupeSet.has(key);
    });

    if (newAlerts.length > 0) {
      const { error: insertError } = await supabase.from("cpl_alerts").insert(newAlerts);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ ok: true, alerts_generated: newAlerts.length, alerts: newAlerts }),
      { headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
});
