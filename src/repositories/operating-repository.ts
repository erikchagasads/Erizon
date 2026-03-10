
import {
  AutopilotExecutionLog,
  CampaignSnapshot,
  IntegrationCredential,
  OperationSnapshot,
  ProfitSnapshot,
  WorkspaceIntegration,
} from "@/types/erizon";

export interface OperatingRepository {
  getSnapshot(): Promise<OperationSnapshot>;
  getIntegrations(workspaceId: string): Promise<WorkspaceIntegration[]>;
  getCredentials(workspaceId: string): Promise<IntegrationCredential[]>;
  upsertCampaignSnapshots(rows: CampaignSnapshot[]): Promise<void>;
  upsertProfitSnapshots(rows: ProfitSnapshot[]): Promise<void>;
  saveAutopilotLog(entry: AutopilotExecutionLog): Promise<void>;
  /**
   * Retorna os snapshots mais recentes ANTERIORES ao período atual para cada campaign_id.
   * Usado para calcular previousRoas, previousCtr, previousCpa.
   * @param campaignIds Lista de IDs de campanha
   * @param beforeDate Busca snapshots antes desta data (ISO string)
   */
  getPreviousSnapshots(
    campaignIds: string[],
    beforeDate: string
  ): Promise<Array<{ id: string; roas: number; ctr: number; cpa: number }>>;
}
