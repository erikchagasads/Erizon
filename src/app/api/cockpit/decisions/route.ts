// GET  /api/cockpit/decisions?workspaceId=xxx  → lista decisões pendentes + histórico
// POST /api/cockpit/decisions                  → gera novas decisões a partir do engine

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { CockpitService } from "@/services/cockpit-service";
import type { PendingDecision } from "@/types/erizon-cockpit";
import {
  filtrarAtivas, processarCampanhas, resolverConfig,
  type CampanhaRaw, type UserEngineConfig,
} from "@/app/lib/engine/pulseEngine";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) {
          values.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch {}
          });
        },
      },
    }
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId obrigatório" }, { status: 400 });

    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cockpit = new CockpitService(supabase as unknown as SupabaseClient);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let state: any = { pending: [], total_impact_brl: 0, mode: "PAZ", counts: {} };
    let history: unknown[] = [];
    try {
      [state, history] = await Promise.all([
        cockpit.getState(workspaceId),
        cockpit.getHistory(workspaceId),
      ]);
    } catch (dbErr) {
      console.error("[cockpit/decisions GET] DB not ready:", dbErr);
    }

    const pendingSource = Array.isArray(state.pending) ? (state.pending as PendingDecision[]) : [];
    const historySource = Array.isArray(history) ? (history as PendingDecision[]) : [];
    const referencedCampaignIds = Array.from(new Set(
      [...pendingSource, ...historySource]
        .map((decision) => decision.campaign_id)
        .filter((campaignId): campaignId is string => typeof campaignId === "string" && campaignId.length > 0)
    ));

    const { data: referencedCampaigns } = referencedCampaignIds.length > 0
      ? await supabase
          .from("metricas_ads")
          .select("id,status")
          .in("id", referencedCampaignIds)
      : { data: [] as Array<Pick<CampanhaRaw, "id" | "status">> };

    const activeIds = new Set(
      filtrarAtivas((referencedCampaigns ?? []) as CampanhaRaw[]).map((campaign) => campaign.id)
    );

    const pending = pendingSource.filter((decision) =>
      decision.campaign_id === null || activeIds.has(decision.campaign_id)
    );

    const filteredHistory = historySource.filter((decision) =>
      decision.campaign_id === null || activeIds.has(decision.campaign_id)
    );

    const counts = pending.reduce((acc: Record<string, number>, decision) => {
      acc[decision.action_type] = (acc[decision.action_type] ?? 0) + 1;
      return acc;
    }, {});

    const totalImpact = pending.reduce(
      (sum: number, decision) => sum + (decision.estimated_impact_brl ?? 0),
      0
    );

    const mode = pending.length > 0 ? state.mode : "PAZ";

    return NextResponse.json({ ...state, pending, history: filteredHistory, counts, total_impact_brl: totalImpact, mode });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { workspaceId, userId } = body;
    if (!workspaceId) return NextResponse.json({ error: "workspaceId obrigatório" }, { status: 400 });

    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Encontra user_id do workspace para buscar métricas
    const { data: wm } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle();

    const targetUserId = userId ?? wm?.user_id ?? user.id;

    // Busca métricas (sem filtro de data_inicio para incluir campanhas com null)
    const [{ data: rawCampanhas }, { data: userSettings }] = await Promise.all([
      supabase.from("metricas_ads").select("*").eq("user_id", targetUserId),
      supabase.from("user_settings").select("*").eq("user_id", targetUserId).maybeSingle(),
    ]);

    if (!rawCampanhas?.length) {
      return NextResponse.json({ ok: true, generated: 0, message: "Sem campanhas para analisar" });
    }

    const campanhasAtivas = filtrarAtivas(rawCampanhas as CampanhaRaw[]);
    const config = resolverConfig(userSettings as UserEngineConfig | null);
    const engine = processarCampanhas(campanhasAtivas, config);

    try {
      // Garante que o workspace existe (upsert) antes de inserir pending_decisions (FK)
      await supabase
        .from("workspaces")
        .upsert({ id: workspaceId, owner_user_id: user.id, name: "Padrão" }, { onConflict: "id", ignoreDuplicates: true });

      const cockpit = new CockpitService(supabase as unknown as SupabaseClient);
      await cockpit.refreshDecisions(workspaceId, engine);
    } catch (dbErr) {
      // Se a tabela pending_decisions não existir ainda, retorna engine sem erro
      console.error("[cockpit/decisions POST] refreshDecisions failed:", dbErr);
      return NextResponse.json({ ok: true, generated: true, engine, warning: "decisions DB not ready" });
    }

    return NextResponse.json({ ok: true, generated: true, engine });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
