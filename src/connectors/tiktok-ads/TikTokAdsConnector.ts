// src/connectors/tiktok-ads/TikTokAdsConnector.ts
// TikTok Marketing API v1.3

export interface TikTokAdsCampaign {
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
  plataforma: "tiktok";
  objective: string | null;
  data_inicio: string;
  data_atualizacao: string;
}

const TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3";

export class TikTokAdsConnector {
  constructor(
    private accessToken: string,
    private advertiserId: string,
  ) {}

  async fetchCampaigns(
    startDate: string,   // YYYY-MM-DD
    endDate: string,     // YYYY-MM-DD
  ): Promise<TikTokAdsCampaign[]> {
    const params = new URLSearchParams({
      advertiser_id: this.advertiserId,
      fields: JSON.stringify([
        "campaign_id", "campaign_name", "status", "budget",
        "budget_mode", "objective_type", "create_time",
      ]),
      page_size: "100",
    });

    const campaignRes = await fetch(`${TIKTOK_API}/campaign/get/?${params}`, {
      headers: {
        "Access-Token": this.accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!campaignRes.ok) throw new Error("TikTok Ads: erro ao buscar campanhas");
    const campaignJson = await campaignRes.json() as {
      data?: {
        list?: Array<{
          campaign_id: string;
          campaign_name: string;
          status: string;
          budget: number;
          objective_type: string;
          create_time: string;
        }>;
      };
    };

    const campaigns = campaignJson.data?.list ?? [];
    if (campaigns.length === 0) return [];

    // Busca métricas
    const metricsParams = new URLSearchParams({
      advertiser_id:     this.advertiserId,
      report_type:       "BASIC",
      data_level:        "AUCTION_CAMPAIGN",
      dimensions:        JSON.stringify(["campaign_id"]),
      metrics:           JSON.stringify([
        "spend", "impressions", "reach", "clicks", "ctr",
        "cpm", "conversion", "start_time",
      ]),
      start_date:        startDate,
      end_date:          endDate,
      page_size:         "100",
    });

    const metricsRes = await fetch(`${TIKTOK_API}/report/integrated/get/?${metricsParams}`, {
      headers: { "Access-Token": this.accessToken },
    });

    type MetricsRow = {
      dimensions: { campaign_id: string };
      metrics: {
        spend: string;
        impressions: string;
        reach: string;
        clicks: string;
        ctr: string;
        cpm: string;
        conversion: string;
      };
    };

    const metricsMap = new Map<string, MetricsRow["metrics"]>();
    if (metricsRes.ok) {
      const metricsJson = await metricsRes.json() as { data?: { list?: MetricsRow[] } };
      for (const row of metricsJson.data?.list ?? []) {
        metricsMap.set(row.dimensions.campaign_id, row.metrics);
      }
    }

    const now = new Date().toISOString();

    return campaigns.map(c => {
      const m = metricsMap.get(c.campaign_id);
      return {
        id:               `tiktok_${c.campaign_id}`,
        nome_campanha:    c.campaign_name,
        status:           c.status === "ENABLE" ? "ATIVO" : "PAUSADO",
        gasto_total:      Number(m?.spend ?? 0),
        orcamento:        c.budget ?? 0,
        impressoes:       Number(m?.impressions ?? 0),
        alcance:          Number(m?.reach ?? 0),
        cliques:          Number(m?.clicks ?? 0),
        ctr:              Number(m?.ctr ?? 0),
        cpm:              Number(m?.cpm ?? 0),
        contatos:         Number(m?.conversion ?? 0),
        plataforma:       "tiktok" as const,
        objective:        c.objective_type ?? null,
        data_inicio:      c.create_time ?? now,
        data_atualizacao: now,
      };
    });
  }
}
