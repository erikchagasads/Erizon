
import { IntegrationCredential } from "@/types/erizon";

export type Ga4RevenueRecord = {
  clientId: string;
  campaignId: string;
  date: string;
  revenue: number;
};

export interface Ga4Connector {
  pullRevenue(credential: IntegrationCredential): Promise<Ga4RevenueRecord[]>;
}

export class Ga4MockConnector implements Ga4Connector {
  async pullRevenue(): Promise<Ga4RevenueRecord[]> {
    return [
      { clientId: "cli-vitaglow", campaignId: "cmp-1", date: new Date().toISOString(), revenue: 5980 },
      { clientId: "cli-vitaglow", campaignId: "cmp-2", date: new Date().toISOString(), revenue: 1840 },
      { clientId: "cli-neurohost", campaignId: "cmp-4", date: new Date().toISOString(), revenue: 3110 },
    ];
  }
}
