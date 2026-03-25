import { MetaAdsConnector } from "@/connectors/meta-ads/meta-ads.connector";
import { normalizeMetaCampaignSnapshot } from "@/ingestion/normalizers/meta-campaign-normalizer";
import { CampaignRepository } from "@/repositories/supabase/campaign-repository";
import { SnapshotRepository } from "@/repositories/supabase/snapshot-repository";
import { AdAccountRepository } from "@/repositories/supabase/ad-account-repository";
import { logEvent, logError } from "@/lib/observability/logger";

export class AdsSyncService {
  constructor(
    private campaignRepository = new CampaignRepository(),
    private snapshotRepository = new SnapshotRepository(),
    private adAccountRepository = new AdAccountRepository()
  ) {}

  /**
   * Syncs all active ad accounts for a workspace.
   * Access tokens are read from the database — never accepted from callers.
   */
  async syncWorkspace(input: {
    workspaceId: string;
    snapshotDate?: string;
  }): Promise<{ syncedAccounts: number; importedCampaigns: number }> {
    const snapshotDate =
      input.snapshotDate ?? new Date().toISOString().slice(0, 10);

    const accounts = await this.adAccountRepository.listActiveAccounts(
      input.workspaceId
    );

    let totalCampaigns = 0;

    for (const account of accounts) {
      if (!account.access_token) {
        logEvent("ads_sync_skipped_no_token", {
          workspaceId: input.workspaceId,
          adAccountId: account.id,
        });
        continue;
      }

      try {
        const imported = await this.syncAccount({
          workspaceId: input.workspaceId,
          clientId: account.client_id ?? null,
          adAccountId: account.id,
          platformAccountId: account.platform_account_id,
          accessToken: account.access_token,
          snapshotDate,
        });
        totalCampaigns += imported;
      } catch (err) {
        logError("ads_sync_account_failed", err, {
          workspaceId: input.workspaceId,
          adAccountId: account.id,
        });
        // Continue with remaining accounts even if one fails
      }
    }

    logEvent("ads_sync_workspace_completed", {
      workspaceId: input.workspaceId,
      syncedAccounts: accounts.length,
      importedCampaigns: totalCampaigns,
    });

    return { syncedAccounts: accounts.length, importedCampaigns: totalCampaigns };
  }

  private async syncAccount(input: {
    workspaceId: string;
    clientId?: string | null;
    adAccountId: string;
    platformAccountId: string;
    accessToken: string;
    snapshotDate: string;
  }): Promise<number> {
    const connector = new MetaAdsConnector(input.accessToken);
    const campaigns = await connector.fetchCampaigns(input.platformAccountId);

    for (const raw of campaigns) {
      const campaign = await this.campaignRepository.upsertCampaign({
        workspaceId: input.workspaceId,
        clientId: input.clientId ?? null,
        adAccountId: input.adAccountId,
        raw,
      });

      const snapshot = normalizeMetaCampaignSnapshot({
        workspaceId: input.workspaceId,
        clientId: input.clientId ?? null,
        adAccountId: input.adAccountId,
        campaignId: campaign.id,
        snapshotDate: input.snapshotDate,
        raw,
      });

      await this.snapshotRepository.upsertDailySnapshot(snapshot);
    }

    logEvent("ads_sync_account_completed", {
      workspaceId: input.workspaceId,
      adAccountId: input.adAccountId,
      importedCampaigns: campaigns.length,
    });

    return campaigns.length;
  }
}
