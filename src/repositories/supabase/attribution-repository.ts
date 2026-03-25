import { createServerSupabase } from "@/lib/supabase/server";
import type { PredictiveROASResult } from "@/core/predictive-roas-engine";

export type TouchpointInsert = {
  workspaceId:     string;
  clientId?:       string | null;
  campaignId?:     string | null;
  stage:           "click" | "lead" | "qualified" | "sale" | "churned";
  contactHash:     string;
  contactChannel:  string;
  occurredAt?:     string;
  saleValue?:      number | null;
  leadId?:         string | null;
  utmCampaign?:    string | null;
  utmSource?:      string | null;
  utmMedium?:      string | null;
  metadata?:       Record<string, unknown> | null;
};

export type FunnelStep = {
  stage:          string;
  count:          number;
  conversionRate: number; // % para o próximo estágio
};

export type AttributionSummary = {
  totalClicks:    number;
  totalLeads:     number;
  totalSales:     number;
  totalRevenue:   number;
  avgDaysToSale:  number | null;
  funnelSteps:    FunnelStep[];
  topCampaigns:   { campaignId: string; leads: number; sales: number }[];
};

export class AttributionRepository {
  private db = createServerSupabase();

  async insertTouchpoint(touch: TouchpointInsert): Promise<void> {
    const { error } = await this.db.from("attribution_touchpoints").insert({
      workspace_id:    touch.workspaceId,
      client_id:       touch.clientId    ?? null,
      campaign_id:     touch.campaignId  ?? null,
      stage:           touch.stage,
      contact_hash:    touch.contactHash,
      contact_channel: touch.contactChannel,
      occurred_at:     touch.occurredAt  ?? new Date().toISOString(),
      sale_value:      touch.saleValue   ?? null,
      lead_id:         touch.leadId      ?? null,
      utm_campaign:    touch.utmCampaign ?? null,
      utm_source:      touch.utmSource   ?? null,
      utm_medium:      touch.utmMedium   ?? null,
      metadata:        touch.metadata    ?? null,
    });
    if (error) throw error;
  }

  async getAttributionSummary(
    workspaceId: string,
    days = 30,
    campaignId?: string,
  ): Promise<AttributionSummary> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = this.db
      .from("attribution_touchpoints")
      .select("stage, sale_value, campaign_id, occurred_at, contact_hash")
      .eq("workspace_id", workspaceId)
      .gte("occurred_at", since.toISOString());

    if (campaignId) query = query.eq("campaign_id", campaignId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const clicks    = rows.filter(r => r.stage === "click").length;
    const leads     = rows.filter(r => r.stage === "lead").length;
    const qualified = rows.filter(r => r.stage === "qualified").length;
    const sales     = rows.filter(r => r.stage === "sale").length;
    const revenue   = rows.filter(r => r.stage === "sale").reduce((s, r) => s + (r.sale_value ?? 0), 0);

    const funnelSteps: FunnelStep[] = [
      { stage: "click",     count: clicks,    conversionRate: clicks    > 0 ? Math.round((leads / clicks) * 100)     : 0 },
      { stage: "lead",      count: leads,     conversionRate: leads     > 0 ? Math.round((qualified / leads) * 100)  : 0 },
      { stage: "qualified", count: qualified, conversionRate: qualified > 0 ? Math.round((sales / qualified) * 100)  : 0 },
      { stage: "sale",      count: sales,     conversionRate: 0 },
    ];

    // Top campanhas por leads
    const byCampaign = new Map<string, { leads: number; sales: number }>();
    for (const r of rows) {
      if (!r.campaign_id) continue;
      const cur = byCampaign.get(r.campaign_id) ?? { leads: 0, sales: 0 };
      if (r.stage === "lead")  cur.leads++;
      if (r.stage === "sale")  cur.sales++;
      byCampaign.set(r.campaign_id, cur);
    }
    const topCampaigns = Array.from(byCampaign.entries())
      .map(([campaignId, stats]) => ({ campaignId, ...stats }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5);

    return {
      totalClicks:   clicks,
      totalLeads:    leads,
      totalSales:    sales,
      totalRevenue:  revenue,
      avgDaysToSale: null, // futura implementação com join por contact_hash
      funnelSteps,
      topCampaigns,
    };
  }

  async upsertPredictiveRoas(
    workspaceId: string,
    campaignId: string | null,
    computedDate: string,
    result: PredictiveROASResult,
  ): Promise<void> {
    const { error } = await this.db
      .from("predictive_roas_snapshots")
      .upsert({
        workspace_id:        workspaceId,
        campaign_id:         campaignId ?? null,
        computed_date:       computedDate,
        horizon_days:        result.horizonDays,
        predicted_roas:      result.predictedRoas,
        confidence_band_low: result.confidenceLow,
        confidence_band_high: result.confidenceHigh,
        model_inputs:        result.inputs,
        narrative:           result.narrative,
      }, { onConflict: "workspace_id,campaign_id,computed_date" });

    if (error) throw error;
  }

  async getLatestPredictiveRoas(workspaceId: string): Promise<PredictiveROASResult & { computedDate: string } | null> {
    const { data, error } = await this.db
      .from("predictive_roas_snapshots")
      .select("*")
      .eq("workspace_id", workspaceId)
      .is("campaign_id", null)      // previsão do portfolio inteiro
      .order("computed_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      predictedRoas:  Number(data.predicted_roas  ?? 0),
      confidenceLow:  Number(data.confidence_band_low  ?? 0),
      confidenceHigh: Number(data.confidence_band_high ?? 0),
      horizonDays:    Number(data.horizon_days ?? 7),
      narrative:      String(data.narrative   ?? ""),
      inputs:         (data.model_inputs as PredictiveROASResult["inputs"]) ?? {
        baseRoas: 0, trendSlope: 0, decisionAdjustment: 0, seasonalityFactor: 1, daysOfData: 0,
      },
      computedDate:   String(data.computed_date),
    };
  }

  async resolveOutdatedPredictions(workspaceId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    // Busca previsões cujo horizonte já passou e não tem actual_roas ainda
    const { data } = await this.db
      .from("predictive_roas_snapshots")
      .select("id, campaign_id, computed_date, horizon_days")
      .eq("workspace_id", workspaceId)
      .is("actual_roas_when_resolved", null)
      .lte("computed_date", today);

    for (const pred of data ?? []) {
      const resolveDate = new Date(pred.computed_date);
      resolveDate.setDate(resolveDate.getDate() + (pred.horizon_days ?? 7));
      if (resolveDate.toISOString().slice(0, 10) > today) continue;

      // Busca ROAS real do período
      const { data: snaps } = await this.db
        .from("campaign_snapshots_daily")
        .select("spend, revenue")
        .eq("workspace_id", workspaceId)
        .gte("snapshot_date", pred.computed_date)
        .lte("snapshot_date", resolveDate.toISOString().slice(0, 10));

      const totalSpend   = (snaps ?? []).reduce((s, r) => s + (r.spend ?? 0), 0);
      const totalRevenue = (snaps ?? []).reduce((s, r) => s + (r.revenue ?? 0), 0);
      const actualRoas   = totalSpend > 0 ? totalRevenue / totalSpend : null;

      if (actualRoas !== null) {
        await this.db
          .from("predictive_roas_snapshots")
          .update({ actual_roas_when_resolved: actualRoas })
          .eq("id", pred.id);
      }
    }
  }
}
