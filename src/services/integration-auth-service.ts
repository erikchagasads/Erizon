
import { IntegrationCredentialRepository } from "@/repositories/integration-credential-repository";
import { IntegrationCredential } from "@/types/erizon";

export class IntegrationAuthService {
  constructor(private readonly repository = new IntegrationCredentialRepository()) {}

  async connectProvider(credential: IntegrationCredential) {
    await this.repository.save(credential);
    await this.repository.markIntegrationConnected({
      workspaceId: credential.workspaceId,
      provider: credential.provider,
      externalAccountId: credential.externalAccountId,
    });

    return {
      provider: credential.provider,
      workspaceId: credential.workspaceId,
      connectedAt: new Date().toISOString(),
      status: "connected" as const,
    };
  }
}
