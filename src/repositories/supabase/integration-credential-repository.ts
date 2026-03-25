import { createServerSupabase } from "@/lib/supabase/server";

export class IntegrationCredentialRepository {
  private db = createServerSupabase();

  async getActiveMetaAccessToken(workspaceId: string): Promise<string> {
    const { data, error } = await this.db
      .from("integration_credentials")
      .select("encrypted_value")
      .eq("workspace_id", workspaceId)
      .eq("platform", "meta")
      .eq("credential_key", "access_token")
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (!data?.encrypted_value) throw new Error("Active Meta access token not found");

    return data.encrypted_value;
  }
}
