import { AutopilotService } from "@/services/autopilot-service";
import { requireAuth } from "@/lib/auth/require-auth";
import { WorkspaceParamSchema } from "@/lib/validation/schemas";
import { logError } from "@/lib/observability/logger";
import { isCronAuthorized } from "@/lib/cron-auth";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServerSupabase();
  const { data: workspaces, error } = await db
    .from("workspaces")
    .select("id, status");

  if (error) {
    logError("autopilot_cron_fetch_workspaces_failed", error);
    return Response.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }

  const service = new AutopilotService();
  const results: { workspaceId: string; processedSnapshots?: number; error?: string }[] = [];

  for (const workspace of workspaces ?? []) {
    if (workspace.status && workspace.status !== "active") continue;

    try {
      const result = await service.run(workspace.id);
      results.push({ workspaceId: workspace.id, processedSnapshots: result.processedSnapshots });
    } catch (err) {
      logError("autopilot_cron_workspace_failed", err, { workspaceId: workspace.id });
      results.push({ workspaceId: workspace.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const succeeded = results.filter((result) => !result.error).length;
  const failed = results.filter((result) => result.error).length;

  return Response.json({ ok: true, succeeded, failed, results });
}

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
    const service = new AutopilotService();
    const result = await service.run(workspaceId);
    return Response.json(result);
  } catch (err) {
    logError("api_autopilot_run_failed", err, { workspaceId });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
