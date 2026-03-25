import { createServerSupabase } from "@/lib/supabase/server";

export type AdAccountRow = {
  id: string;
  client_id: string | null;
  platform_account_id: string;
  access_token: string | null;
};

export class AdAccountRepository {
  private db = createServerSupabase();

  async listActiveAccounts(workspaceId: string): Promise<AdAccountRow[]> {
    const { data, error } = await this.db
      .from("ad_accounts")
      .select("id, client_id, platform_account_id, access_token")
      .eq("workspace_id", workspaceId)
      .eq("status", "active");

    if (error) throw error;
    return (data ?? []) as AdAccountRow[];
  }
}
