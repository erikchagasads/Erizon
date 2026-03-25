import { PulseService } from "@/services/pulse-service";
import { requireAuth } from "@/lib/auth/require-auth";
import { logError } from "@/lib/observability/logger";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? "";

  if (!workspaceId) {
    return Response.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const auth = await requireAuth(req, workspaceId);
  if (!auth.ok) {
    const authErr = auth as { ok: false; error: string; status?: number };
    return Response.json({ error: authErr.error }, { status: authErr.status ?? 401 });
  }

  try {
    const service = new PulseService();
    const result = await service.getOverview(workspaceId);
    return Response.json(result);
  } catch (err) {
    logError("api_pulse_failed", err, { workspaceId });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
