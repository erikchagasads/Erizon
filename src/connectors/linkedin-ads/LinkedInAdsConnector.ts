// src/connectors/linkedin-ads/LinkedInAdsConnector.ts
// LinkedIn Marketing API v2

export interface LinkedInAdsCampaign {
  id: string;
  nome_campanha: string;
  status: string;
  gasto_total: number;
  orcamento: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  ctr: number;
  cpm: number;
  contatos: number;
  plataforma: "linkedin";
  objective: string | null;
  data_inicio: string;
  data_atualizacao: string;
}

const LINKEDIN_API = "https://api.linkedin.com/v2";

export class LinkedInAdsConnector {
  constructor(
    private accessToken: string,
    private accountId: string,  // ex: "urn:li:sponsoredAccount:123456789"
  ) {}

  // Renova token (LinkedIn usa refresh token com validade de 60 dias)
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "refresh_token",
        refresh_token: refreshToken,
        client_id:     process.env.LINKEDIN_ADS_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_ADS_CLIENT_SECRET!,
      }),
    });
    if (!res.ok) throw new Error("Falha ao renovar token LinkedIn");
    const json = await res.json() as { access_token: string; refresh_token: string };
    return { accessToken: json.access_token, refreshToken: json.refresh_token };
  }

  async fetchCampaigns(
    startDate: string,  // YYYY-MM-DD
    endDate: string,
  ): Promise<LinkedInAdsCampaign[]> {
    const accountUrn = this.accountId.startsWith("urn:")
      ? this.accountId
      : `urn:li:sponsoredAccount:${this.accountId}`;

    const encodedAccount = encodeURIComponent(accountUrn);

    // 1. Busca campanhas
    const campRes = await fetch(
      `${LINKEDIN_API}/adCampaignsV2?q=search&search.account.values[0]=${encodedAccount}&count=100`,
      {
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "LinkedIn-Version": "202405",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    if (!campRes.ok) throw new Error("LinkedIn Ads: erro ao buscar campanhas");
    const campJson = await campRes.json() as {
      elements?: Array<{
        id: number;
        name: string;
        status: string;
        dailyBudget?: { amount: string; currencyCode: string };
        totalBudget?: { amount: string; currencyCode: string };
        objectiveType: string;
        runSchedule?: { start: number };
      }>;
    };

    const campaigns = campJson.elements ?? [];
    if (campaigns.length === 0) return [];

    // 2. Busca analytics
    const campIds = campaigns.map(c => c.id).join(",");
    const [startY, startM, startD] = startDate.split("-");
    const [endY, endM, endD]       = endDate.split("-");

    const analyticsParams = new URLSearchParams({
      q:               "analytics",
      pivot:           "CAMPAIGN",
      timeGranularity: "ALL",
      campaigns:       campIds,
      fields:          "impressions,clicks,costInLocalCurrency,approximateUniqueImpressions,oneClickLeads",
    });
    analyticsParams.set("dateRange.start.year",  startY);
    analyticsParams.set("dateRange.start.month", startM);
    analyticsParams.set("dateRange.start.day",   startD);
    analyticsParams.set("dateRange.end.year",    endY);
    analyticsParams.set("dateRange.end.month",   endM);
    analyticsParams.set("dateRange.end.day",     endD);

    const analyticsRes = await fetch(
      `${LINKEDIN_API}/adAnalyticsV2?` + analyticsParams.toString(),
      {
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "LinkedIn-Version": "202405",
        },
      }
    );

    type AnalyticsRow = {
      pivotValues: string[];
      impressions: number;
      clicks: number;
      costInLocalCurrency: string;
      approximateUniqueImpressions: number;
      oneClickLeads: number;
    };

    const analyticsMap = new Map<string, AnalyticsRow>();
    if (analyticsRes.ok) {
      const analyticsJson = await analyticsRes.json() as { elements?: AnalyticsRow[] };
      for (const row of analyticsJson.elements ?? []) {
        const campId = row.pivotValues?.[0]?.replace("urn:li:sponsoredCampaign:", "") ?? "";
        if (campId) analyticsMap.set(campId, row);
      }
    }

    const now = new Date().toISOString();

    return campaigns.map(c => {
      const a = analyticsMap.get(String(c.id));
      const spend = Number(a?.costInLocalCurrency ?? 0);
      const impressoes = a?.impressions ?? 0;
      const cliques   = a?.clicks ?? 0;
      const budget = Number(c.dailyBudget?.amount ?? c.totalBudget?.amount ?? 0);

      return {
        id:               `linkedin_${c.id}`,
        nome_campanha:    c.name,
        status:           c.status === "ACTIVE" ? "ATIVO" : "PAUSADO",
        gasto_total:      spend,
        orcamento:        budget,
        impressoes,
        alcance:          a?.approximateUniqueImpressions ?? 0,
        cliques,
        ctr:              impressoes > 0 ? (cliques / impressoes) * 100 : 0,
        cpm:              impressoes > 0 ? (spend / impressoes) * 1000 : 0,
        contatos:         a?.oneClickLeads ?? 0,
        plataforma:       "linkedin" as const,
        objective:        c.objectiveType ?? null,
        data_inicio:      c.runSchedule?.start ? new Date(c.runSchedule.start).toISOString() : now,
        data_atualizacao: now,
      };
    });
  }
}
