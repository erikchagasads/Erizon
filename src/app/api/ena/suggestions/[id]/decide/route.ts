import { requireAuth } from "@/lib/auth/require-auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { logError, logEvent } from "@/lib/observability/logger";

// POST /api/ena/suggestions/:id/decide
// Registra a decisão do usuário sobre uma sugestão e captura metric_before
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const suggestionId = params.id;
  const body = await req.json().catch(() => null);

  if (!body?.workspaceId || !body?.decision) {
    return Response.json({ error: "workspaceId e decision são obrigatórios" }, { status: 400 });
  }

  const { workspaceId, decision } = body as { workspaceId: string; decision: string };

  if (!["applied", "dismissed", "deferred"].includes(decision)) {
    return Response.json({ error: "decision inválido" }, { status: 400 });
  }

  const auth = await requireAuth(req, workspaceId);
  if (auth.ok === false) {
    return Response.json({ error: auth.error }, { status: auth.status ?? 401 });
  }

  const db = createServerSupabase();

  // Busca a sugestão e confirma que pertence ao workspace
  const { data: suggestion, error: fetchErr } = await db
    .from("autopilot_suggestions")
    .select("id, campaign_id, workspace_id, suggestion_type")
    .eq("id", suggestionId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (fetchErr || !suggestion) {
    return Response.json({ error: "Sugestão não encontrada" }, { status: 404 });
  }

  // Captura o snapshot mais recente da campanha como metric_before
  let metricBefore: Record<string, number> | null = null;
  if (suggestion.campaign_id) {
    const { data: snap } = await db
      .from("campaign_snapshots_daily")
      .select("cpl, roas, spend, leads")
      .eq("campaign_id", suggestion.campaign_id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snap) {
      metricBefore = {
        cpl:   snap.cpl   ?? 0,
        roas:  snap.roas  ?? 0,
        spend: snap.spend ?? 0,
        leads: snap.leads ?? 0,
      };
    }
  }

  const { error: updateErr } = await db
    .from("autopilot_suggestions")
    .update({
      decision,
      decided_at:     new Date().toISOString(),
      decided_by:     auth.data.userId,
      metric_before:  metricBefore,
      outcome_7d:     decision === "applied" ? "pending" : null,
      outcome_14d:    decision === "applied" ? "pending" : null,
    })
    .eq("id", suggestionId);

  if (updateErr) {
    logError("ena_decide_update_failed", updateErr, { suggestionId, workspaceId });
    return Response.json({ error: "Erro ao registrar decisão" }, { status: 500 });
  }

  logEvent("ena_suggestion_decided", { suggestionId, workspaceId, decision });
  return Response.json({ ok: true });
}
