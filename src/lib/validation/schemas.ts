import { z } from "zod";

export const SyncAccountSchema = z.object({
  workspaceId: z.string().uuid("workspaceId must be a valid UUID"),
  clientId: z.string().uuid().nullable().optional(),
  adAccountId: z.string().uuid("adAccountId must be a valid UUID"),
  platformAccountId: z.string().min(1, "platformAccountId is required"),
  snapshotDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "snapshotDate must be YYYY-MM-DD")
    .optional(),
});

export const WorkspaceParamSchema = z.object({
  workspaceId: z.string().uuid("workspaceId must be a valid UUID"),
});

export type SyncAccountInput = z.infer<typeof SyncAccountSchema>;
export type WorkspaceParamInput = z.infer<typeof WorkspaceParamSchema>;
