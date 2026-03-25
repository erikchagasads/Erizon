import { requireAuth } from "@/lib/auth/require-auth";
import { SnapshotRepository } from "@/repositories/supabase/snapshot-repository";
import { AttributionRepository } from "@/repositories/supabase/attribution-repository";
import { IRERepository } from "@/repositories/supabase/ire-repository";
import { predictROAS } from "@/core/predictive-roas-engine";
import { logError } from "@/lib/observability/logger";
import { createServerSupabase } from "@/lib/supabase/server";

// GET /api/ena/predictive-roas?workspaceId=xxx
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
    const snapshotRepo    = new SnapshotRepository();
    const attributionRepo = new AttributionRepository();
    const ireRepo         = new IRERepository();
    const db              = createServerSupabase();

    // Tenta retornar previsão já calculada de hoje
    const today   = new Date().toISOString().slice(0, 10);
    const cached  = await attributionRepo.getLatestPredictiveRoas(workspaceId);
    if (cached && cached.computedDate === today) {
      return Response.json(cached);
    }

    // Computa on-demand
    const [snapshots, decisionScore, pendingCount] = await Promise.all([
      snapshotRepo.listLatestWithObjective(workspaceId),
      ireRepo.getDecisionScore(workspaceId),
      db.from("autopilot_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "pending")
        .eq("suggestion_type", "scale_budget")
        .then(r => r.count ?? 0),
    ]);

    const result = predictROAS({
      snapshotHistory:          snapshots,
      decisionScore,
      pendingSuggestionsCount:  Number(pendingCount),
    });

    // Persiste para o cron não recomputar
    await attributionRepo.upsertPredictiveRoas(workspaceId, null, today, result);

    return Response.json({ ...result, computedDate: today });
  } catch (err) {
    logError("api_ena_predictive_roas_failed", err, { workspaceId });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
