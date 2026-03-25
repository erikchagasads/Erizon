import { createServerSupabase } from "@/lib/supabase/server";
import { detectPredictiveAnomalies, type PredictiveAlert } from "@/core/predictive-anomaly-engine";

export class PredictiveAnomalyService {
  private db = createServerSupabase();

  async runForWorkspace(workspaceId: string): Promise<PredictiveAlert[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    // Busca snapshots históricos agrupados por campanha
    const { data: rows } = await this.db
      .from("campaign_perf_snapshots")
      .select("campaign_id, snapshot_date, spend, roas, cpl, ctr, frequency, leads, clicks, revenue")
      .eq("workspace_id", workspaceId)
      .gte("snapshot_date", since.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: true });

    if (!rows?.length) return [];

    // Busca nomes das campanhas
    const { data: campaigns } = await this.db
      .from("campaigns")
      .select("id, name")
      .eq("workspace_id", workspaceId);

    const nameMap = Object.fromEntries((campaigns ?? []).map(c => [c.id, c.name]));

    // Busca Profit DNA para frequency sweet spot por cliente
    const { data: dnaRows } = await this.db
      .from("profit_dna_snapshots")
      .select("client_id, frequency_sweet_spot")
      .eq("workspace_id", workspaceId);

    const dnaByCampaign: Record<string, number | null> = {};
    // Note: associação aproximada — ideal seria por client_id
    if (dnaRows?.length) {
      const sweepSpot = dnaRows[0]?.frequency_sweet_spot ?? null;
      // Aplica o sweet spot global para todas as campanhas do workspace
      for (const row of rows) {
        dnaByCampaign[row.campaign_id] = sweepSpot;
      }
    }

    // Agrupa por campanha
    const byCampaign: Record<string, typeof rows> = {};
    for (const row of rows) {
      if (!byCampaign[row.campaign_id]) byCampaign[row.campaign_id] = [];
      byCampaign[row.campaign_id].push(row);
    }

    const allAlerts: PredictiveAlert[] = [];

    for (const [campaignId, history] of Object.entries(byCampaign)) {
      const dailyPoints = history.map(r => ({
        date:      r.snapshot_date,
        spend:     r.spend,
        roas:      r.roas,
        cpl:       r.cpl,
        ctr:       r.ctr,
        frequency: r.frequency,
        leads:     r.leads,
        clicks:    r.clicks,
        revenue:   r.revenue,
      }));

      const alerts = detectPredictiveAnomalies(
        campaignId,
        nameMap[campaignId] ?? campaignId,
        dailyPoints,
        dnaByCampaign[campaignId]
      );
      allAlerts.push(...alerts);
    }

    // Salva alertas novos no banco
    for (const alert of allAlerts) {
      try {
        await this.db.from("predictive_anomaly_alerts").insert({
          workspace_id:            workspaceId,
          campaign_id:             alert.campaignId,
          campaign_name:           alert.campaignName,
          alert_type:              alert.alertType,
          confidence:              alert.confidence,
          predicted_at:            new Date().toISOString(),
          predicted_window_hours:  alert.predictedWindowHours,
          predicted_metric:        alert.predictedMetric,
          predicted_delta_pct:     alert.predictedDeltaPct,
          preventive_action:       alert.preventiveAction,
          status:                  "pending",
        });
      } catch { /* ignora conflito de upsert */ }
    }

    // Expira alertas antigos (mais de 48h sem resolução)
    await this.db
      .from("predictive_anomaly_alerts")
      .update({ status: "expired" })
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .lt("predicted_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    return allAlerts;
  }

  async getPendingForWorkspace(workspaceId: string) {
    const { data } = await this.db
      .from("predictive_anomaly_alerts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("confidence", { ascending: false })
      .limit(10);

    return data ?? [];
  }
}
