import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { runPreflight, type PreflightInput } from "@/core/preflight-engine";
import { createServerSupabase } from "@/lib/supabase/server";
import { strategicIntelligenceService } from "@/services/strategic-intelligence-service";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  let body: PreflightInput & { clientId?: string; campaignName?: string; campaignId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }

  const db = createServerSupabase();
  const { data: ws } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const workspaceId = ws?.workspace_id ?? auth.user.id;

  if (body.clientId) {
    const { data: dna } = await db
      .from("profit_dna_snapshots")
      .select("cpl_median, roas_median")
      .eq("workspace_id", workspaceId)
      .eq("client_id", body.clientId)
      .maybeSingle();

    if (dna) {
      body.historicoCpl = body.historicoCpl ?? dna.cpl_median ?? undefined;
      body.historicoRoas = body.historicoRoas ?? dna.roas_median ?? undefined;
    }

    const { data: memoria } = await db
      .from("agente_memoria_cliente")
      .select("cpl_alvo, roas_alvo")
      .eq("workspace_id", workspaceId)
      .eq("cliente_id", body.clientId)
      .maybeSingle();

    if (memoria) {
      body.cplAlvo = body.cplAlvo ?? memoria.cpl_alvo ?? undefined;
      body.roasAlvo = body.roasAlvo ?? memoria.roas_alvo ?? undefined;
    }
  }

  const result = runPreflight(body);
  const strategic = await strategicIntelligenceService.getWorkspaceSnapshot({
    workspaceId,
    userId: auth.user.id,
  });
  const weeklyBudget = Number(body.orcamentoDiario ?? 0) * 7;
  const estimatedLeadsMin =
    weeklyBudget > 0 && result.estimatedCplMax
      ? Math.floor(weeklyBudget / result.estimatedCplMax)
      : null;
  const estimatedLeadsMax =
    weeklyBudget > 0 && result.estimatedCplMin
      ? Math.floor(weeklyBudget / result.estimatedCplMin)
      : null;
  const estimatedLeads7d =
    estimatedLeadsMin !== null && estimatedLeadsMax !== null
      ? Math.round((estimatedLeadsMin + estimatedLeadsMax) / 2)
      : body.metaLeads ?? null;
  const estimatedRevenue7d =
    estimatedLeads7d && strategic.business.ticketMedio > 0 && strategic.business.conversionRate > 0
      ? Math.round(estimatedLeads7d * (strategic.business.conversionRate / 100) * strategic.business.ticketMedio)
      : null;
  const confidenceLabel =
    result.score >= 85
      ? "alta confianca"
      : result.score >= 70
        ? "confianca moderada"
        : "precisa de validacao";

  const forecastSnapshot = {
    estimatedLeads7d,
    estimatedRevenue7d,
    confidenceLabel,
    estimatedCplRange:
      result.estimatedCplMin && result.estimatedCplMax
        ? [result.estimatedCplMin, result.estimatedCplMax]
        : null,
    estimatedRoas: result.estimatedRoas,
    recommendation: result.topRecommendation,
    conversionRate: strategic.business.conversionRate,
    ticketMedio: strategic.business.ticketMedio,
    networkInsight: strategic.collective.insight,
    memoryLine: strategic.learning.memoryLine,
  };

  try {
    await db.from("preflight_scores").insert({
      workspace_id: workspaceId,
      client_id: body.clientId ?? null,
      campaign_name: body.campaignName ?? null,
      campaign_id: body.campaignId ?? null,
      score: result.score,
      risks: result.risks,
      estimated_cpl_min: result.estimatedCplMin,
      estimated_cpl_max: result.estimatedCplMax,
      estimated_roas: result.estimatedRoas,
      input_snapshot: body,
      forecast_snapshot: forecastSnapshot,
    });

    if (body.campaignId) {
      await db
        .from("metricas_ads")
        .update({
          preflight_status: "avaliada",
          preflight_score: result.score,
          preflight_result: result,
          forecast_snapshot: forecastSnapshot,
          draft_payload: body,
          data_atualizacao: new Date().toISOString(),
        })
        .eq("id", body.campaignId)
        .eq("user_id", auth.user.id)
        .eq("status", "rascunho");
    }
  } catch {
    // Forecast should still return even when optional persistence fails.
  }

  return NextResponse.json({
    ok: true,
    result,
    forecast: forecastSnapshot,
  });
}
