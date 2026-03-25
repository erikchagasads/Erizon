import { randomUUID } from "crypto";
import { z } from "zod";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

const headerSchema = z.object({
  "x-user-id": z.string().uuid(),
  "x-workspace-id": z.string().uuid(),
});

export async function requireRequestContext(req: Request) {
  const parsed = headerSchema.safeParse({
    "x-user-id": req.headers.get("x-user-id"),
    "x-workspace-id": req.headers.get("x-workspace-id"),
  });

  if (!parsed.success) {
    const err = new Error("Missing or invalid auth headers");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }

  const requestId = req.headers.get("x-request-id") || randomUUID();
  await requireWorkspaceAccess(parsed.data["x-user-id"], parsed.data["x-workspace-id"]);

  return {
    requestId,
    userId: parsed.data["x-user-id"],
    workspaceId: parsed.data["x-workspace-id"],
  };
}
