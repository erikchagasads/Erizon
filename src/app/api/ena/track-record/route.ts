import { requireAuth } from "@/lib/auth/require-auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { logError } from "@/lib/observability/logger";

// GET /api/ena/track-record?workspaceId=xxx
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

  const db = createServerSupabase();

  try {
    const { data, error } = await db
      .from("autopilot_suggestions")
      .select("id, suggestion_type, decision, outcome_7d, metric_before, metric_after_7d, decided_at, campaign_id, title")
      .eq("workspace_id", workspaceId)
      .not("decision", "is", null)
      .order("decided_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const rows = data ?? [];
    const decided  = rows.filter(r => r.decision === "applied");
    const resolved = decided.filter(r => r.outcome_7d && r.outcome_7d !== "pending");

    const improved = resolved.filter(r => r.outcome_7d === "improved").length;
    const degraded = resolved.filter(r => r.outcome_7d === "degraded").length;
    const neutral  = resolved.filter(r => r.outcome_7d === "neutral").length;
    const pending  = decided.filter(r => r.outcome_7d === "pending").length;

    const effectivenessRate = resolved.length > 0
      ? Math.round((improved / (improved + degraded || 1)) * 100)
      : null;

    // Agrupado por tipo de sugestão
    const byType: Record<string, { total: number; improved: number; rate: number }> = {};
    for (const r of resolved) {
      const t = r.suggestion_type ?? "unknown";
      if (!byType[t]) byType[t] = { total: 0, improved: 0, rate: 0 };
      byType[t].total++;
      if (r.outcome_7d === "improved") byType[t].improved++;
    }
    for (const t of Object.keys(byType)) {
      byType[t].rate = byType[t].total > 0
        ? Math.round((byType[t].improved / byType[t].total) * 100)
        : 0;
    }

    // Últimas 10 decisões com contexto
    const recentDecisions = rows.slice(0, 10).map(r => ({
      id:             r.id,
      campaignId:     r.campaign_id,
      title:          r.title,
      suggestionType: r.suggestion_type,
      decision:       r.decision,
      outcome7d:      r.outcome_7d,
      metricBefore:   r.metric_before,
      metricAfter7d:  r.metric_after_7d,
      decidedAt:      r.decided_at,
    }));

    return Response.json({
      totalDecided:     decided.length,
      improved,
      degraded,
      neutral,
      pending,
      effectivenessRate,
      byType,
      recentDecisions,
    });
  } catch (err) {
    logError("api_ena_track_record_failed", err, { workspaceId });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
