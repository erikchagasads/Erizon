
import { getIntegrationEnvStatus } from "@/config/env";
import { MockOperatingRepository } from "@/repositories/mock-operating-repository";
import { SupabaseOperatingRepository } from "@/repositories/supabase-operating-repository";
import { DataSourceKind, IntegrationReadiness } from "@/types/erizon";

export class IntegrationReadinessService {
  constructor(
    private readonly source: DataSourceKind = getIntegrationEnvStatus().supabase ? "supabase" : "mock",
    private readonly mockRepository = new MockOperatingRepository(),
    private readonly supabaseRepository = new SupabaseOperatingRepository(),
  ) {}

  async getReadiness(workspaceId: string): Promise<IntegrationReadiness> {
    const env = getIntegrationEnvStatus();
    const repository = this.source === "supabase" && env.supabase ? this.supabaseRepository : this.mockRepository;
    const connectedProviders = await repository.getIntegrations(workspaceId);
    const expected = ["meta_ads", "ga4", "shopify", "hotmart", "crm"] as const;
    const connectedKinds = new Set(connectedProviders.map((item) => item.kind));

    return {
      env,
      connectedProviders,
      missingProviders: expected.filter((item) => !connectedKinds.has(item)),
    };
  }
}
