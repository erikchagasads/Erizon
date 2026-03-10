
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { IntegrationCredential } from "@/types/erizon";

export class IntegrationCredentialRepository {
  async save(credential: IntegrationCredential) {
    const supabase = getSupabaseServerClient();
    await supabase.from("integration_credentials").upsert({
      workspace_id: credential.workspaceId,
      provider: credential.provider,
      external_account_id: credential.externalAccountId,
      access_token: credential.accessToken,
      refresh_token: credential.refreshToken ?? null,
      expires_at: credential.expiresAt ?? null,
      metadata: credential.metadata ?? {},
    });
  }

  async markIntegrationConnected(params: {
    workspaceId: string;
    provider: IntegrationCredential["provider"];
    externalAccountId: string;
  }) {
    const supabase = getSupabaseServerClient();
    await supabase.from("workspace_integrations").upsert({
      workspace_id: params.workspaceId,
      kind: params.provider,
      status: "connected",
      external_account_id: params.externalAccountId,
      access_token_masked: "••••••••",
      last_synced_at: new Date().toISOString(),
    });
  }
}
