
import { CommerceConnector, CommerceMockConnector } from "@/connectors/commerce/types";
import { Ga4Connector, Ga4MockConnector } from "@/connectors/ga4/types";
import { MetaAdsConnector, MetaAdsMockConnector } from "@/connectors/meta-ads/types";
import { normalizeCampaignRecord } from "@/ingestion/normalizers/campaign-normalizer";
import { normalizeProfitSnapshot } from "@/ingestion/normalizers/profit-normalizer";
import { OperatingRepository } from "@/repositories/operating-repository";
import { IntegrationCredential, OperationSnapshot, ProfitSnapshot } from "@/types/erizon";

export type PipelineResult = {
  normalizedCampaigns: ReturnType<typeof normalizeCampaignRecord>[];
  profitSnapshots: ProfitSnapshot[];
  syncedAt: string;
  connectors: { meta: string; ga4: string; commerce: string };
};

/**
 * Resolve qual conector usar: real (se credencial presente) ou mock.
 * Importa os conectores reais de forma lazy para evitar erros de env em build.
 */
async function resolveMetaConnector(credential?: IntegrationCredential): Promise<MetaAdsConnector> {
  if (!credential) return new MetaAdsMockConnector();
  const { MetaAdsRealConnector } = await import("@/connectors/meta-ads/MetaAdsRealConnector");
  return new MetaAdsRealConnector();
}

async function resolveGa4Connector(credential?: IntegrationCredential): Promise<Ga4Connector> {
  if (!credential) return new Ga4MockConnector();
  const { Ga4RealConnector } = await import("@/connectors/ga4/Ga4RealConnector");
  return new Ga4RealConnector();
}

async function resolveCommerceConnector(credential?: IntegrationCredential): Promise<CommerceConnector> {
  if (!credential) return new CommerceMockConnector();
  const { CommerceRealConnector } = await import("@/connectors/commerce/CommerceRealConnector");
  return new CommerceRealConnector();
}

export class OperatingSyncPipeline {
  constructor(private readonly repository: OperatingRepository) {}

  async run(credentials: {
    meta?: IntegrationCredential;
    ga4?: IntegrationCredential;
    commerce?: IntegrationCredential;
  }): Promise<PipelineResult> {
    // Resolve conectores em paralelo (lazy import apenas quando credencial presente)
    const [metaConnector, ga4Connector, commerceConnector] = await Promise.all([
      resolveMetaConnector(credentials.meta),
      resolveGa4Connector(credentials.ga4),
      resolveCommerceConnector(credentials.commerce),
    ]);

    const baseSnapshot: OperationSnapshot = await this.repository.getSnapshot();

    // Pull paralelo de todas as fontes
    const [metaRows, revenueRows, orderRows] = await Promise.all([
      credentials.meta ? metaConnector.pullCampaigns(credentials.meta) : Promise.resolve([]),
      credentials.ga4 ? ga4Connector.pullRevenue(credentials.ga4) : Promise.resolve([]),
      credentials.commerce ? commerceConnector.pullOrders(credentials.commerce) : Promise.resolve([]),
    ]);

    const normalizedCampaigns = metaRows.map((row) => {
      // Enriquece com receita do GA4 se disponível
      const ga4Revenue = revenueRows.find((r) => r.campaignId === row.campaignId)?.revenue;
      return normalizeCampaignRecord({
        ...row,
        revenue: ga4Revenue ?? row.revenue,
      });
    });

    // Enriquece previousRoas/CTR/CPA com dados históricos reais do Supabase
    const today = new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
    const campaignIds = normalizedCampaigns.map((c) => c.id);
    const previousSnapshots = await this.repository.getPreviousSnapshots(campaignIds, today);
    const previousMap = new Map(previousSnapshots.map((s) => [s.id, s]));

    const enrichedCampaigns = normalizedCampaigns.map((campaign) => {
      const prev = previousMap.get(campaign.id);
      if (!prev) return campaign;
      return {
        ...campaign,
        lastRoas: prev.roas,
        lastCtr: prev.ctr,
        lastCpa: prev.cpa,
      };
    });

    const profitSnapshots = enrichedCampaigns.flatMap((campaign) => {
      const client = baseSnapshot.clients.find((item) => item.id === campaign.clientId);
      if (!client) return [];
      const order = orderRows.find((item) => item.clientId === campaign.clientId);
      return [normalizeProfitSnapshot({ campaign, client, order })];
    });

    await this.repository.upsertCampaignSnapshots(enrichedCampaigns);
    await this.repository.upsertProfitSnapshots(profitSnapshots);

    return {
      normalizedCampaigns: enrichedCampaigns,
      profitSnapshots,
      syncedAt: new Date().toISOString(),
      connectors: {
        meta: credentials.meta ? "real" : "mock",
        ga4: credentials.ga4 ? "real" : "mock",
        commerce: credentials.commerce ? "real" : "mock",
      },
    };
  }
}
