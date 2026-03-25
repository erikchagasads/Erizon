import { IntelligenceService } from "@/services/intelligence-service";
import { requireAuth } from "@/lib/auth/require-auth";
import { WorkspaceParamSchema } from "@/lib/validation/schemas";
import { logError } from "@/lib/observability/logger";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = WorkspaceParamSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { workspaceId } = parsed.data;

  const auth = await requireAuth(req, workspaceId);
  if (!auth.ok) {
    const authErr = auth as { ok: false; error: string; status?: number };
    return Response.json({ error: authErr.error }, { status: authErr.status ?? 401 });
  }

  if (!["owner", "admin"].includes(auth.data.role)) {
    return Response.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const service = new IntelligenceService();
    const result = await service.run(workspaceId);
    return Response.json(result);
  } catch (err) {
    logError("api_intelligence_run_failed", err, { workspaceId });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
