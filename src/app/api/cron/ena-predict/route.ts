import { SnapshotRepository } from "@/repositories/supabase/snapshot-repository";
import { AttributionRepository } from "@/repositories/supabase/attribution-repository";
import { IRERepository } from "@/repositories/supabase/ire-repository";
import { predictROAS } from "@/core/predictive-roas-engine";
import { createServerSupabase } from "@/lib/supabase/server";
import { logEvent, logError } from "@/lib/observability/logger";

/**
 * GET /api/cron/ena-predict
 * Cron Vercel: diário às 10:00 UTC (07:00 BRT)
 * 1. Computa ROAS preditivo 7d para todos os workspaces
 * 2. Resolve previsões passadas (compara predicted vs actual)
 */
export async function GET(req: Request) {
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
    logError("ena_predict_cron_fetch_failed", error);
    return Response.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }

  const snapshotRepo    = new SnapshotRepository();
  const attributionRepo = new AttributionRepository();
  const ireRepo         = new IRERepository();
  const today           = new Date().toISOString().slice(0, 10);

  let succeeded = 0;
  let failed    = 0;

  logEvent("ena_predict_cron_started", { workspaceCount: workspaces?.length ?? 0 });

  for (const ws of workspaces ?? []) {
    try {
      const [snapshots, decisionScore, pendingResult] = await Promise.all([
        snapshotRepo.listLatestWithObjective(ws.id),
        ireRepo.getDecisionScore(ws.id),
        db.from("autopilot_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", ws.id)
          .eq("status", "pending")
          .eq("suggestion_type", "scale_budget"),
      ]);

      const pendingCount = pendingResult.count ?? 0;

      const result = predictROAS({
        snapshotHistory:         snapshots,
        decisionScore,
        pendingSuggestionsCount: Number(pendingCount),
      });

      await attributionRepo.upsertPredictiveRoas(ws.id, null, today, result);
      await attributionRepo.resolveOutdatedPredictions(ws.id);

      succeeded++;
    } catch (err) {
      logError("ena_predict_cron_workspace_failed", err, { workspaceId: ws.id });
      failed++;
    }
  }

  logEvent("ena_predict_cron_finished", { succeeded, failed });
  return Response.json({ ok: true, succeeded, failed });
}
