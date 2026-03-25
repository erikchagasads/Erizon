import { createServerSupabase } from "@/lib/supabase/server";
import type { MetaCampaignInput } from "@/types/erizon-v7";

export class CampaignRepository {
  private db = createServerSupabase();

  async upsertCampaign(input: {
    workspaceId: string;
    clientId?: string | null;
    adAccountId: string;
    raw: MetaCampaignInput;
  }): Promise<{ id: string }> {
    const { data, error } = await this.db
      .from("campaigns")
      .upsert({
        workspace_id: input.workspaceId,
        client_id: input.clientId ?? null,
        ad_account_id: input.adAccountId,
        platform: "meta",
        platform_campaign_id: input.raw.id,
        name: input.raw.name,
        objective: input.raw.objective ?? null,
        configured_status: input.raw.configured_status ?? null,
        effective_status: input.raw.effective_status ?? null,
        delivery_state: input.raw.delivery_state ?? null,
        budget_daily: input.raw.daily_budget ?? null,
        budget_lifetime: input.raw.lifetime_budget ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "platform,platform_campaign_id" })
      .select("id")
      .single();

    if (error) throw error;
    return { id: data.id as string };
  }
}
