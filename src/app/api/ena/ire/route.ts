import { IREService } from "@/services/ire-service";
import { requireAuth } from "@/lib/auth/require-auth";
import { logError } from "@/lib/observability/logger";

// GET /api/ena/ire?workspaceId=xxx&days=30
export async function GET(req: Request) {
  const url         = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? "";

  if (!workspaceId) {
    return Response.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const auth = await requireAuth(req, workspaceId);
  if (auth.ok === false) {
    return Response.json({ error: auth.error }, { status: auth.status ?? 401 });
  }

  try {
    const service = new IREService();
    const result  = await service.getOverview(workspaceId);
    return Response.json(result);
  } catch (err) {
    logError("api_ena_ire_failed", err, { workspaceId });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
