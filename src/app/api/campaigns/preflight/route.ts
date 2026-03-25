import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { runPreflight, type PreflightInput } from "@/core/preflight-engine";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  let body: PreflightInput & { clientId?: string; campaignName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const db = createServerSupabase();
  const { data: ws } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const workspaceId = ws?.workspace_id ?? auth.user.id;

  // Enriquece com dados do Profit DNA do cliente
  if (body.clientId) {
    const { data: dna } = await db
      .from("profit_dna_snapshots")
      .select("cpl_median, roas_median")
      .eq("workspace_id", workspaceId)
      .eq("client_id", body.clientId)
      .maybeSingle();

    if (dna) {
      body.historicoCpl  = body.historicoCpl  ?? dna.cpl_median ?? undefined;
      body.historicoRoas = body.historicoRoas ?? dna.roas_median ?? undefined;
    }

    // Enriquece com benchmarks do nicho
    const { data: memoria } = await db
      .from("agente_memoria_cliente")
      .select("cpl_alvo, roas_alvo")
      .eq("workspace_id", workspaceId)
      .eq("cliente_id", body.clientId)
      .maybeSingle();

    if (memoria) {
      body.cplAlvo  = body.cplAlvo  ?? memoria.cpl_alvo  ?? undefined;
      body.roasAlvo = body.roasAlvo ?? memoria.roas_alvo ?? undefined;
    }
  }

  // Roda engine
  const result = runPreflight(body);

  // Salva no banco
  try {
    await db.from("preflight_scores").insert({
      workspace_id:      workspaceId,
      client_id:         body.clientId ?? null,
      campaign_name:     (body as { campaignName?: string }).campaignName ?? null,
      score:             result.score,
      risks:             result.risks,
      estimated_cpl_min: result.estimatedCplMin,
      estimated_cpl_max: result.estimatedCplMax,
      estimated_roas:    result.estimatedRoas,
      input_snapshot:    body,
    });
  } catch { /* não bloqueia se falhar */ }

  return NextResponse.json({ ok: true, result });
}
