import type { MetaCampaignInput } from "@/types/erizon-v7";
import { logError, logEvent } from "@/lib/observability/logger";

const META_GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

const INSIGHTS_FIELDS = [
  "spend",
  "impressions",
  "reach",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "frequency",
  "actions",
  "action_values",
].join(",");

const CAMPAIGN_FIELDS = [
  "id",
  "name",
  "objective",
  "configured_status",
  "effective_status",
  "delivery_status",
  "daily_budget",
  "lifetime_budget",
].join(",");

export class MetaAdsConnector {
  constructor(private readonly accessToken: string) {}

  async fetchCampaigns(accountId: string): Promise<MetaCampaignInput[]> {
    const campaigns = await this.fetchCampaignList(accountId);

    const results: MetaCampaignInput[] = [];

    for (const campaign of campaigns) {
      const insights = await this.fetchCampaignInsights(campaign.id);
      results.push({ ...campaign, insights });
    }

    logEvent("meta_campaigns_fetched", {
      accountId,
      count: results.length,
    });

    return results;
  }

  private async fetchCampaignList(
    accountId: string
  ): Promise<Omit<MetaCampaignInput, "insights">[]> {
    const url = new URL(
      `${META_GRAPH_API_BASE}/act_${accountId}/campaigns`
    );
    url.searchParams.set("fields", CAMPAIGN_FIELDS);
    url.searchParams.set("access_token", this.accessToken);
    url.searchParams.set("limit", "500");

    const res = await fetch(url.toString());

    if (!res.ok) {
      const body = await res.text();
      logError("meta_campaigns_list_failed", new Error(body), { accountId, status: res.status });
      throw new Error(`Meta Graph API error ${res.status}: ${body}`);
    }

    const json = await res.json();

    // Handle paginated responses (cursor-based)
    const campaigns: Omit<MetaCampaignInput, "insights">[] = json.data ?? [];
    let cursor = json.paging?.cursors?.after;

    while (cursor) {
      const nextUrl = new URL(url.toString());
      nextUrl.searchParams.set("after", cursor);
      const nextRes = await fetch(nextUrl.toString());
      if (!nextRes.ok) break;
      const nextJson = await nextRes.json();
      campaigns.push(...(nextJson.data ?? []));
      cursor = nextJson.paging?.cursors?.after ?? null;
    }

    return campaigns.map((c: Record<string, unknown>) => ({
      id: String(c.id),
      name: String(c.name),
      objective: (c.objective as string) ?? null,
      configured_status: (c.configured_status as string) ?? null,
      effective_status: (c.effective_status as string) ?? null,
      delivery_state: (c.delivery_status as string) ?? null,
      daily_budget: c.daily_budget ? Number(c.daily_budget) / 100 : null, // Meta returns cents
      lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
      account_id: accountId,
    }));
  }

  private async fetchCampaignInsights(
    campaignId: string
  ): Promise<MetaCampaignInput["insights"]> {
    const url = new URL(`${META_GRAPH_API_BASE}/${campaignId}/insights`);
    url.searchParams.set("fields", INSIGHTS_FIELDS);
    url.searchParams.set("date_preset", "today");
    url.searchParams.set("access_token", this.accessToken);

    const res = await fetch(url.toString());

    if (!res.ok) {
      // Non-fatal: return empty insights rather than failing the entire sync
      logError("meta_campaign_insights_failed", new Error(await res.text()), {
        campaignId,
        status: res.status,
      });
      return {};
    }

    const json = await res.json();
    const row = json.data?.[0];
    if (!row) return {};

    // Extract leads and purchases from actions array
    const actions: { action_type: string; value: string }[] = row.actions ?? [];
    const actionValues: { action_type: string; value: string }[] = row.action_values ?? [];

    const getAction = (type: string) =>
      Number(actions.find((a) => a.action_type === type)?.value ?? 0);
    const getActionValue = (type: string) =>
      Number(actionValues.find((a) => a.action_type === type)?.value ?? 0);

    return {
      spend: Number(row.spend ?? 0),
      impressions: Number(row.impressions ?? 0),
      reach: Number(row.reach ?? 0),
      clicks: Number(row.clicks ?? 0),
      ctr: Number(row.ctr ?? 0),
      cpc: Number(row.cpc ?? 0),
      cpm: Number(row.cpm ?? 0),
      frequency: Number(row.frequency ?? 0),
      leads: getAction("lead"),
      purchases: getAction("purchase"),
      revenue: getActionValue("purchase"),
    };
  }
}
