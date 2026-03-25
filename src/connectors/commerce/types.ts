
import { ExternalOrderRecord, IntegrationCredential } from "@/types/erizon";

export interface CommerceConnector {
  pullOrders(credential: IntegrationCredential): Promise<ExternalOrderRecord[]>;
}

export class CommerceMockConnector implements CommerceConnector {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async pullOrders(_credential: IntegrationCredential): Promise<ExternalOrderRecord[]> {
    const now = new Date().toISOString();
    return [
      {
        orderId: "ord-1001",
        clientId: "cli-vitaglow",
        platform: "Shopify",
        date: now,
        grossRevenue: 5980,
        refunds: 239,
        fees: 269,
        logistics: 478,
        productCost: 1555,
      },
      {
        orderId: "ord-1002",
        clientId: "cli-neurohost",
        platform: "Hotmart",
        date: now,
        grossRevenue: 3110,
        refunds: 249,
        fees: 308,
        logistics: 0,
        productCost: 249,
      },
    ];
  }
}
