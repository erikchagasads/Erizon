import { z } from "zod";

export const syncSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  adAccountId: z.string().uuid(),
  platformAccountId: z.string().min(3),
  snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
