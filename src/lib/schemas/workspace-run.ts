import { z } from "zod";

export const workspaceRunSchema = z.object({
  workspaceId: z.string().uuid().optional(),
});
