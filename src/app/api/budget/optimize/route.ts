import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { optimizeBudgetAllocation, type ClientBudgetInput } from "@/core/budget-allocation-engine";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  let body: { budgetTotal: number; clientIds?: string[] };
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
  const wid = ws?.workspace_id ?? auth.user.id;
  const since = new Date();
  since.setDate(since.getDate() - 30);

  // Busca clientes
  const clientQuery = db
    .from("clients")
    .select("id, name")
    .eq("workspace_id", wid);
  if (body.clientIds?.length) clientQuery.in("id", body.clientIds);
  const { data: clientsList } = await clientQuery;

  // Busca ROAS médio por cliente (últimos 30 dias)
  const { data: snaps } = await db
    .from("campaign_snapshots_daily")
    .select("client_id, spend, roas")
    .eq("workspace_id", wid)
    .gte("snapshot_date", since.toISOString().split("T")[0])
    .gt("spend", 0);

  // Agrupa ROAS e spend por cliente
  const byClient: Record<string, { roass: number[]; spends: number[] }> = {};
  for (const snap of snaps ?? []) {
    if (!snap.client_id) continue;
    if (!byClient[snap.client_id]) byClient[snap.client_id] = { roass: [], spends: [] };
    if (snap.roas > 0) byClient[snap.client_id].roass.push(snap.roas);
    byClient[snap.client_id].spends.push(snap.spend);
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);

  const inputs: ClientBudgetInput[] = (clientsList ?? [])
    .filter(c => byClient[c.id]?.roass.length >= 3)
    .map(c => ({
      clientId:       c.id,
      clientName:     c.name,
      budgetAtual:    avg(byClient[c.id]?.spends ?? [0]),
      roasHistorico:  avg(byClient[c.id]?.roass ?? [0]),
      spend7d:        byClient[c.id]?.spends.slice(-7).reduce((a, b) => a + b, 0),
      isActive:       true,
    }));

  if (!inputs.length) {
    return NextResponse.json({ error: "Clientes insuficientes com histórico de dados." }, { status: 400 });
  }

  const result = optimizeBudgetAllocation(inputs, body.budgetTotal);

  // Salva simulação
  try {
    await db.from("budget_simulations").insert({
      workspace_id:         wid,
      budget_total:         body.budgetTotal,
      alocacao_input:       inputs,
      alocacao_output:      result.alocacaoOutput,
      impacto_estimado_brl: result.impactoTotalBrl,
    });
  } catch { /* ignora */ }

  return NextResponse.json({ ok: true, result });
}
