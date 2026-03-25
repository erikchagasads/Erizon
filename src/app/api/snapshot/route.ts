// src/app/api/snapshot/route.ts — v5
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const hoje = new Date().toISOString().slice(0, 10);

    const { data: campanhas, error: campErr } = await supabase
      .from("metricas_ads")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["ATIVO", "ACTIVE", "ATIVA"]);

    if (campErr) throw campErr;

    if (!campanhas || campanhas.length === 0) {
      return NextResponse.json({ message: "Nenhuma campanha ativa", criados: 0 });
    }

    let gasto_total      = 0;
    let receita_total    = 0;
    let total_leads      = 0;
    let total_impressoes = 0;
    let melhorCampanha: Record<string, unknown> | null = null;

    for (const c of campanhas) {
      const gasto      = Number(c.gasto_total)      || 0;
      const leads      = Number(c.contatos)         || 0;
      const impressoes = Number(c.impressoes)       || 0;
      const receita    = Number(c.receita_estimada) || leads * 0.04 * 450;

      gasto_total      += gasto;
      receita_total    += receita;
      total_leads      += leads;
      total_impressoes += impressoes;

      if (!melhorCampanha || gasto > (Number(melhorCampanha.gasto_total) || 0)) {
        melhorCampanha = c;
      }
    }

    const lucro_total   = receita_total - gasto_total;
    const roas_global   = gasto_total > 0 ? receita_total / gasto_total : 0;
    const margem_global = receita_total > 0 ? lucro_total / receita_total : 0;
    const cpl_medio     = total_leads > 0 ? gasto_total / total_leads : 0;

    const mc            = melhorCampanha;
    const mc_gasto      = Number(mc?.gasto_total) || 0;
    const mc_leads      = Number(mc?.contatos)    || 0;
    const mc_impressoes = Number(mc?.impressoes)  || 0;
    const mc_cliques    = Number(mc?.cliques)     || 0;

    const cpl_ontem = mc_leads > 0 ? mc_gasto / mc_leads : 0;
    const ctr_ontem = mc_impressoes > 0
      ? (mc_cliques / mc_impressoes) * 100
      : Number(mc?.ctr) || 0;

    const snapshot = {
      user_id:         user.id,
      data_snapshot:   hoje,
      gasto_total,
      receita_total,
      lucro_total,
      roas_global,
      margem_global,
      cpl_medio,
      total_leads,
      total_campanhas: campanhas.length,
      campanha_id:     (mc?.id as string)            ?? null,
      campanha_nome:   (mc?.nome_campanha as string) ?? null,
      impressoes:      Math.round(total_impressoes),
      cpl_ontem,
      cpl_semana:      cpl_ontem,
      ctr_ontem,
      ctr_semana:      ctr_ontem,
      leads_ontem:     mc_leads,
      gasto_ontem:     mc_gasto,
    };

    // upsert evita duplicate key se o cron já inseriu o registro do dia
    const { error: upsertErr } = await supabase
      .from("metricas_snapshot_diario")
      .upsert(snapshot, { onConflict: "user_id,data_snapshot" });

    if (upsertErr) {
      console.error("[snapshot] Erro ao fazer upsert:", upsertErr.message);
      throw new Error(upsertErr.message);
    }

    return NextResponse.json({
      message: `Snapshot atualizado para ${hoje}`,
      criados: 1,
      data:    hoje,
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("[snapshot] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const hoje = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("metricas_snapshot_diario")
    .select("id, data_snapshot")
    .eq("user_id", user.id)
    .eq("data_snapshot", hoje)
    .maybeSingle();

  return NextResponse.json({ hoje, snapshot_hoje: !!data });
}