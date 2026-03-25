// src/connectors/google-ads/GoogleAdsConnector.ts
// Google Ads API v17 — OAuth2 + campanhas normalizadas

export interface GoogleAdsCampaign {
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
  contatos: number;         // conversões
  plataforma: "google";
  objective: string | null;
  data_inicio: string;
  data_atualizacao: string;
}

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  developerToken: string;
  customerId: string;       // ex: "1234567890"
}

const GOOGLE_ADS_API = "https://googleads.googleapis.com/v17";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GoogleAdsConnector {
  constructor(private tokens: GoogleTokens) {}

  // Renova access token usando refresh token
  static async refreshAccessToken(refreshToken: string): Promise<string> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_ADS_CLIENT_ID!,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type:    "refresh_token",
      }),
    });
    if (!res.ok) throw new Error("Falha ao renovar token Google Ads");
    const json = await res.json() as { access_token: string };
    return json.access_token;
  }

  // Busca campanhas com métricas via GAQL (Google Ads Query Language)
  async fetchCampaigns(dateRange: "LAST_30_DAYS" | "LAST_7_DAYS" | "TODAY" = "LAST_30_DAYS"): Promise<GoogleAdsCampaign[]> {
    const customerId = this.tokens.customerId.replace(/-/g, "");
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpm,
        metrics.cost_micros,
        metrics.conversions,
        campaign.start_date
      FROM campaign
      WHERE segments.date DURING ${dateRange}
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 100
    `;

    const res = await fetch(
      `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          "Authorization":        `Bearer ${this.tokens.accessToken}`,
          "developer-token":      this.tokens.developerToken,
          "Content-Type":         "application/json",
          "login-customer-id":    customerId,
        },
        body: JSON.stringify({ query: query.trim() }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      const snippet = err.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
      throw new Error(`Google Ads API error ${res.status}: ${snippet}`);
    }

    // searchStream retorna NDJSON
    const text = await res.text();
    const results: GoogleAdsCampaign[] = [];
    const now = new Date().toISOString();

    for (const line of text.split("\n")) {
      if (!line.trim() || line === "[" || line === "]") continue;
      try {
        const chunk = JSON.parse(line.replace(/^,/, "")) as {
          results?: Array<{
            campaign: {
              id: string;
              name: string;
              status: string;
              advertisingChannelType: string;
              startDate: string;
            };
            campaignBudget?: { amountMicros: string };
            metrics: {
              impressions: string;
              clicks: string;
              ctr: string;
              averageCpm: string;
              costMicros: string;
              conversions: string;
            };
          }>;
        };

        for (const row of chunk.results ?? []) {
          const spend    = Number(row.metrics.costMicros ?? 0) / 1_000_000;
          const budget   = Number(row.campaignBudget?.amountMicros ?? 0) / 1_000_000;
          const clicks   = Number(row.metrics.clicks ?? 0);
          const impressoes = Number(row.metrics.impressions ?? 0);
          const ctr      = Number(row.metrics.ctr ?? 0) * 100; // Google retorna 0-1
          const cpm      = Number(row.metrics.averageCpm ?? 0) / 1_000_000;
          const conversoes = Number(row.metrics.conversions ?? 0);

          results.push({
            id:               `google_${row.campaign.id}`,
            nome_campanha:    row.campaign.name,
            status:           row.campaign.status === "ENABLED" ? "ATIVO" : "PAUSADO",
            gasto_total:      spend,
            orcamento:        budget > 0 ? budget * 30 : 0, // budget diário → mensal
            impressoes,
            alcance:          impressoes, // Google não expõe alcance separado
            cliques:          clicks,
            ctr,
            cpm,
            contatos:         conversoes,
            plataforma:       "google",
            objective:        row.campaign.advertisingChannelType ?? null,
            data_inicio:      row.campaign.startDate ?? now,
            data_atualizacao: now,
          });
        }
      } catch {
        // linha inválida, ignora
      }
    }

    return results;
  }
}
