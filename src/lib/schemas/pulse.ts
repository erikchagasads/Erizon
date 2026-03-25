import { z } from "zod";

export const pulseQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
});
