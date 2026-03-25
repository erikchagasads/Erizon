import { IREService } from "@/services/ire-service";
import { createServerSupabase } from "@/lib/supabase/server";
import { logEvent, logError } from "@/lib/observability/logger";

/**
 * GET /api/cron/ena-compute
 * Cron Vercel: diário às 09:00 UTC (06:00 BRT)
 * Computa o I.R.E. para todos os workspaces ativos.
 */
export async function GET(req: Request) {
  // Validação do cron secret para evitar chamadas não autorizadas
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = createServerSupabase();
  const { data: workspaces, error } = await db.from("workspaces").select("id");

  if (error) {
    logError("ena_cron_fetch_workspaces_failed", error);
    return Response.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }

  const service = new IREService();
  const results: { workspaceId: string; ireScore?: number; error?: string }[] = [];

  logEvent("ena_cron_started", { workspaceCount: workspaces?.length ?? 0 });

  for (const ws of workspaces ?? []) {
    try {
      const result = await service.compute(ws.id);
      results.push({ workspaceId: ws.id, ireScore: result.ireScore });
    } catch (err) {
      logError("ena_cron_workspace_failed", err, { workspaceId: ws.id });
      results.push({ workspaceId: ws.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const succeeded = results.filter(r => !r.error).length;
  const failed    = results.filter(r =>  r.error).length;

  logEvent("ena_cron_finished", { succeeded, failed });

  return Response.json({ ok: true, succeeded, failed, results });
}
