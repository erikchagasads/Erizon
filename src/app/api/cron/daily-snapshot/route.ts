// POST /api/cron/daily-snapshot
// Cria um snapshot diário de cada campanha em campaign_snapshots_daily
// Chamado pelo Vercel Cron às 23:50 todos os dias
// Necessário para o predictive-anomaly-engine ter série temporal de 14 dias

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireCronAuth } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServerSupabase();
  const today = new Date().toISOString().split("T")[0];

  // Busca todos os usuários que têm métricas
  const { data: userRows } = await db
    .from("metricas_ads")
    .select("user_id")
    .limit(1000);

  const userIds = [...new Set((userRows ?? []).map(r => r.user_id as string))];

  let total = 0;
  let errors = 0;

  for (const userId of userIds) {
    // workspaceId = userId (schema legado)
    const workspaceId = userId;

    const { data: campanhas } = await db
      .from("metricas_ads")
      .select("meta_campaign_id, gasto_total, contatos, cliques, ctr, frequencia, orcamento")
      .eq("user_id", userId);

    if (!campanhas?.length) continue;

    const snapshots = campanhas.map(c => {
      const spend   = Number(c.gasto_total ?? 0);
      const leads   = Number(c.contatos ?? 0);
      const clicks  = Number(c.cliques ?? 0);
      // O motor preditivo usa somente sinais operacionais reais.
      // Receita estimada nao entra mais como historico factual.
      const revenue = 0;
      const cpl     = leads > 0 ? spend / leads : 0;
      const roas    = 0;
      const ctr     = Number(c.ctr ?? 0);
      const freq    = Number(c.frequencia ?? 0);

      return {
        workspace_id:  workspaceId,
        campaign_id:   String(c.meta_campaign_id),
        snapshot_date: today,
        spend,
        roas,
        cpl,
        ctr,
        frequency: freq,
        leads,
        clicks,
        revenue,
      };
    });

    const { error } = await db
      .from("campaign_perf_snapshots")
      .upsert(snapshots, { onConflict: "workspace_id,campaign_id,snapshot_date" });

    if (error) {
      console.error(`[daily-snapshot] erro userId=${userId}:`, error.message);
      errors++;
    } else {
      total += snapshots.length;
    }
  }

  return NextResponse.json({ ok: true, date: today, snapshots_created: total, errors });
}

// Também aceita GET para Vercel Cron
export const GET = POST;
