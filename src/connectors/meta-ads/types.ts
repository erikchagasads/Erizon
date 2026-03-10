
import { ExternalCampaignRecord, IntegrationCredential } from "@/types/erizon";

export interface MetaAdsConnector {
  pullCampaigns(credential: IntegrationCredential): Promise<ExternalCampaignRecord[]>;
}

export class MetaAdsMockConnector implements MetaAdsConnector {
  async pullCampaigns(credential: IntegrationCredential): Promise<ExternalCampaignRecord[]> {
    const now = new Date().toISOString();
    return [
      {
        campaignId: "cmp-1",
        accountId: credential.externalAccountId,
        clientId: "cli-vitaglow",
        name: "Produto X | Conversão | UGC 01",
        objective: "Compra",
        channel: "Meta Ads",
        audience: "Broad feminino 25-44",
        activeDays: 12,
        dailyBudget: 1800,
        spend: 1280,
        impressions: 70210,
        clicks: 1994,
        conversions: 31,
        revenue: 5980,
        frequency: 1.9,
        cpm: 18.2,
        cpc: 0.64,
        ctr: 2.84,
        cpa: 41.29,
        roas: 4.67,
        previousRoas: 4.1,
        previousCtr: 2.52,
        previousCpa: 46.1,
        creativeId: "crt-1",
        date: now,
      },
      {
        campaignId: "cmp-2",
        accountId: credential.externalAccountId,
        clientId: "cli-vitaglow",
        name: "Produto X | Remarketing | Oferta",
        objective: "Compra",
        channel: "Meta Ads",
        audience: "Remarketing 30 dias",
        activeDays: 27,
        dailyBudget: 900,
        spend: 740,
        impressions: 34210,
        clicks: 482,
        conversions: 12,
        revenue: 1840,
        frequency: 4.2,
        cpm: 21.6,
        cpc: 1.53,
        ctr: 1.41,
        cpa: 61.67,
        roas: 2.49,
        previousRoas: 3.02,
        previousCtr: 1.92,
        previousCpa: 51.2,
        creativeId: "crt-2",
        date: now,
      },
    ];
  }
}
