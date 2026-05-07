import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleAdsConnector } from "@/connectors/google-ads/GoogleAdsConnector";
import { LinkedInAdsConnector } from "@/connectors/linkedin-ads/LinkedInAdsConnector";
import { TikTokAdsConnector } from "@/connectors/tiktok-ads/TikTokAdsConnector";

type Platform = "google" | "tiktok" | "linkedin";

type SyncResult = {
  platform: Platform;
  userId: string;
  synced: number;
  message?: string;
};

type SyncFailure = {
  platform: Platform;
  userId: string;
  error: string;
};

type GoogleSettings = {
  user_id: string;
  google_ads_access_token: string | null;
  google_ads_refresh_token: string | null;
  google_ads_customer_id: string | null;
  google_ads_developer_token: string | null;
};

type TikTokSettings = {
  user_id: string;
  tiktok_ads_access_token: string | null;
  tiktok_ads_advertiser_id: string | null;
};

type LinkedInSettings = {
  user_id: string;
  linkedin_ads_access_token: string | null;
  linkedin_ads_refresh_token: string | null;
  linkedin_ads_account_id: string | null;
};

function getDateRange(days = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (date: Date) => date.toISOString().split("T")[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function replaceCampaignRows(
  db: SupabaseClient,
  userId: string,
  platform: Platform,
  rows: Record<string, unknown>[]
) {
  const { error: deleteError } = await db
    .from("metricas_ads")
    .delete()
    .eq("user_id", userId)
    .eq("plataforma", platform);

  if (deleteError) throw deleteError;

  if (rows.length === 0) return;

  const { error: insertError } = await db.from("metricas_ads").insert(rows);
  if (insertError) throw insertError;
}

export async function syncTikTokAdsForUser(
  db: SupabaseClient,
  settings: TikTokSettings
): Promise<SyncResult> {
  if (!settings.tiktok_ads_access_token || !settings.tiktok_ads_advertiser_id) {
    throw new Error("TikTok Ads nao conectado.");
  }

  const connector = new TikTokAdsConnector(
    settings.tiktok_ads_access_token,
    settings.tiktok_ads_advertiser_id
  );
  const { startDate, endDate } = getDateRange(30);
  const campaigns = await connector.fetchCampaigns(startDate, endDate);

  const rows = campaigns.map((campaign) => ({
    user_id: settings.user_id,
    campanha_id: campaign.id,
    nome_campanha: campaign.nome_campanha,
    status: campaign.status,
    gasto_total: campaign.gasto_total,
    orcamento: campaign.orcamento,
    impressoes: campaign.impressoes,
    alcance: campaign.alcance,
    cliques: campaign.cliques,
    ctr: campaign.ctr,
    contatos: campaign.contatos,
    plataforma: "tiktok",
    objective: campaign.objective,
    data_inicio: campaign.data_inicio,
    data_atualizacao: campaign.data_atualizacao,
  }));

  await replaceCampaignRows(db, settings.user_id, "tiktok", rows);

  return {
    platform: "tiktok",
    userId: settings.user_id,
    synced: campaigns.length,
    message: campaigns.length === 0 ? "Nenhuma campanha encontrada" : undefined,
  };
}

export async function syncLinkedInAdsForUser(
  db: SupabaseClient,
  settings: LinkedInSettings
): Promise<SyncResult> {
  if (!settings.linkedin_ads_access_token) {
    throw new Error("LinkedIn Ads nao conectado.");
  }

  let accessToken = settings.linkedin_ads_access_token;

  if (settings.linkedin_ads_refresh_token) {
    try {
      const refreshed = await LinkedInAdsConnector.refreshAccessToken(settings.linkedin_ads_refresh_token);
      accessToken = refreshed.accessToken;
      await db
        .from("user_settings")
        .update({
          linkedin_ads_access_token: refreshed.accessToken,
          linkedin_ads_refresh_token: refreshed.refreshToken,
        })
        .eq("user_id", settings.user_id);
    } catch {
      // Keep the current access token if refresh is unavailable.
    }
  }

  const connector = new LinkedInAdsConnector(accessToken, settings.linkedin_ads_account_id ?? "");
  const { startDate, endDate } = getDateRange(30);
  const campaigns = await connector.fetchCampaigns(startDate, endDate);

  const rows = campaigns.map((campaign) => ({
    user_id: settings.user_id,
    campanha_id: campaign.id,
    nome_campanha: campaign.nome_campanha,
    status: campaign.status,
    gasto_total: campaign.gasto_total,
    orcamento: campaign.orcamento,
    impressoes: campaign.impressoes,
    alcance: campaign.alcance,
    cliques: campaign.cliques,
    ctr: campaign.ctr,
    contatos: campaign.contatos,
    plataforma: "linkedin",
    objective: campaign.objective,
    data_inicio: campaign.data_inicio,
    data_atualizacao: campaign.data_atualizacao,
  }));

  await replaceCampaignRows(db, settings.user_id, "linkedin", rows);

  return {
    platform: "linkedin",
    userId: settings.user_id,
    synced: campaigns.length,
    message: campaigns.length === 0 ? "Nenhuma campanha encontrada" : undefined,
  };
}

export async function syncGoogleAdsForUser(
  db: SupabaseClient,
  settings: GoogleSettings
): Promise<SyncResult> {
  if (!settings.google_ads_access_token) {
    throw new Error("Google Ads nao conectado.");
  }

  let accessToken = settings.google_ads_access_token;

  if (settings.google_ads_refresh_token) {
    try {
      accessToken = await GoogleAdsConnector.refreshAccessToken(settings.google_ads_refresh_token);
      await db
        .from("user_settings")
        .update({ google_ads_access_token: accessToken })
        .eq("user_id", settings.user_id);
    } catch {
      // Keep the current access token if refresh is unavailable.
    }
  }

  const developerToken = settings.google_ads_developer_token ?? process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";
  const customerId = settings.google_ads_customer_id ?? process.env.GOOGLE_ADS_CUSTOMER_ID ?? "";

  if (!developerToken || !customerId) {
    throw new Error("Google Ads sem developer token ou customer ID.");
  }

  const connector = new GoogleAdsConnector({
    accessToken,
    refreshToken: settings.google_ads_refresh_token ?? "",
    developerToken,
    customerId,
  });

  const campaigns = await connector.fetchCampaigns("LAST_30_DAYS");
  const rows = campaigns.map((campaign) => ({
    user_id: settings.user_id,
    campanha_id: campaign.id,
    nome_campanha: campaign.nome_campanha,
    status: campaign.status,
    gasto_total: campaign.gasto_total,
    orcamento: campaign.orcamento,
    impressoes: campaign.impressoes,
    alcance: campaign.alcance,
    cliques: campaign.cliques,
    ctr: campaign.ctr,
    contatos: campaign.contatos,
    plataforma: "google",
    objective: campaign.objective,
    data_inicio: campaign.data_inicio,
    data_atualizacao: campaign.data_atualizacao,
  }));

  await replaceCampaignRows(db, settings.user_id, "google", rows);

  return {
    platform: "google",
    userId: settings.user_id,
    synced: campaigns.length,
    message: campaigns.length === 0 ? "Nenhuma campanha encontrada" : undefined,
  };
}

async function runAll<T extends { user_id: string }>(
  platform: Platform,
  rows: T[] | null,
  sync: (settings: T) => Promise<SyncResult>
) {
  const results: SyncResult[] = [];
  const errors: SyncFailure[] = [];

  for (const row of rows ?? []) {
    try {
      results.push(await sync(row));
    } catch (error) {
      errors.push({ platform, userId: row.user_id, error: asErrorMessage(error) });
    }
  }

  return {
    ok: errors.length === 0,
    processed: (rows ?? []).length,
    synced: results.reduce((sum, result) => sum + result.synced, 0),
    results,
    errors,
  };
}

export async function syncAllTikTokAds(db: SupabaseClient) {
  const { data, error } = await db
    .from("user_settings")
    .select("user_id, tiktok_ads_access_token, tiktok_ads_advertiser_id")
    .not("tiktok_ads_access_token", "is", null)
    .not("tiktok_ads_advertiser_id", "is", null);

  if (error) throw error;
  return runAll("tiktok", data as TikTokSettings[] | null, (row) => syncTikTokAdsForUser(db, row));
}

export async function syncAllLinkedInAds(db: SupabaseClient) {
  const { data, error } = await db
    .from("user_settings")
    .select("user_id, linkedin_ads_access_token, linkedin_ads_refresh_token, linkedin_ads_account_id")
    .not("linkedin_ads_access_token", "is", null);

  if (error) throw error;
  return runAll("linkedin", data as LinkedInSettings[] | null, (row) => syncLinkedInAdsForUser(db, row));
}

export async function syncAllGoogleAds(db: SupabaseClient) {
  const { data, error } = await db
    .from("user_settings")
    .select("user_id, google_ads_access_token, google_ads_refresh_token, google_ads_customer_id, google_ads_developer_token")
    .not("google_ads_access_token", "is", null);

  if (error) throw error;
  return runAll("google", data as GoogleSettings[] | null, (row) => syncGoogleAdsForUser(db, row));
}
