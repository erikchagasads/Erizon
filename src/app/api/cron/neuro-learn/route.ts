import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resultados: string[] = [];

  const { data: semOutcome } = await supabaseAdmin
    .from("neuro_score_analyses")
    .select("id, campanha_id, workspace_id")
    .is("outcome_coletado_em", null)
    .not("campanha_id", "is", null)
    .lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(50);

  for (const analysis of semOutcome ?? []) {
    const { data: camp } = await supabaseAdmin
      .from("metricas_ads")
      .select("ctr, cpm, cpc")
      .eq("campanha_id", analysis.campanha_id)
      .eq("workspace_id", analysis.workspace_id)
      .order("data_ref", { ascending: false })
      .limit(7);

    if (!camp || camp.length < 3) {
      continue;
    }

    const ctrReal = camp.reduce((sum, r) => sum + (r.ctr ?? 0), 0) / camp.length;
    const cplReal = camp.reduce((sum, r) => sum + (r.cpc ?? 0), 0) / camp.length;

    await supabaseAdmin
      .from("neuro_score_analyses")
      .update({
        ctr_real: ctrReal,
        cpl_real: cplReal,
        outcome_coletado_em: new Date().toISOString(),
      })
      .eq("id", analysis.id);

    resultados.push(`outcome: ${analysis.id.slice(0, 8)} CTR=${ctrReal.toFixed(2)}`);
  }

  const { data: combos } = await supabaseAdmin
    .from("neuro_score_analyses")
    .select("nicho, objetivo")
    .not("ctr_real", "is", null)
    .not("nicho", "is", null)
    .eq("media_type", "image");

  const vistos = new Set<string>();
  const combosUnicos = (combos ?? []).filter((c) => {
    const key = `${c.nicho}|${c.objetivo}`;
    if (vistos.has(key)) {
      return false;
    }
    vistos.add(key);
    return true;
  });

  for (const { nicho, objetivo } of combosUnicos) {
    const { data: analyses } = await supabaseAdmin
      .from("neuro_score_analyses")
      .select("neuro_score, atencao_score, hook_score, cta_score, fadiga_score, emocao_dominante, zonas_atencao, ctr_real, cpl_real")
      .eq("nicho", nicho)
      .eq("objetivo", objetivo)
      .eq("media_type", "image")
      .not("ctr_real", "is", null)
      .order("ctr_real", { ascending: false });

    if (!analyses || analyses.length < 10) {
      continue;
    }

    function pearson(xs: number[], ys: number[]): number {
      const n = xs.length;
      if (n < 5) {
        return 0;
      }
      const mx = xs.reduce((a, b) => a + b, 0) / n;
      const my = ys.reduce((a, b) => a + b, 0) / n;
      const num = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0);
      const den = Math.sqrt(
        xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0)
      );
      return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
    }

    const atencoes = analyses.map((a) => a.atencao_score);
    const hooks = analyses.map((a) => a.hook_score);
    const fadigas = analyses.map((a) => a.fadiga_score);
    const ctrs = analyses.map((a) => a.ctr_real ?? 0);
    const cpls = analyses.map((a) => a.cpl_real ?? 0);

    const cutoff = [...ctrs].sort((a, b) => b - a)[Math.floor(ctrs.length * 0.25)];
    const topAnalyses = analyses.filter((a) => (a.ctr_real ?? 0) >= cutoff);
    const emocaoCount: Record<string, number> = {};
    for (const a of topAnalyses) {
      if (a.emocao_dominante) {
        emocaoCount[a.emocao_dominante] = (emocaoCount[a.emocao_dominante] ?? 0) + 1;
      }
    }
    const emocoesVencedoras = Object.entries(emocaoCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);

    const topCriativos = analyses.slice(0, 10).map((a) => ({
      neuro_score: a.neuro_score,
      ctr_real: a.ctr_real,
      cpl_real: a.cpl_real,
      emocao_dominante: a.emocao_dominante,
      zonas_atencao: a.zonas_atencao,
    }));

    const correlacoes = {
      atencao_vs_ctr: { pearson: pearson(atencoes, ctrs), sample: analyses.length },
      hook_vs_ctr: { pearson: pearson(hooks, ctrs), sample: analyses.length },
      fadiga_vs_cpl: { pearson: pearson(fadigas, cpls), sample: analyses.length },
      emocoes_vencedoras: emocoesVencedoras,
    };

    await supabaseAdmin
      .from("neuro_score_patterns")
      .upsert(
        {
          nicho,
          objetivo,
          platform: "meta",
          media_type: "image",
          correlacoes,
          top_criativos: topCriativos,
          sample_size: analyses.length,
          ultima_atualizacao: new Date().toISOString(),
        },
        { onConflict: "nicho,objetivo,platform,media_type" }
      );

    resultados.push(
      `patterns: ${nicho}/${objetivo} n=${analyses.length} r_atencao_ctr=${correlacoes.atencao_vs_ctr.pearson}`
    );
  }

  return NextResponse.json({ ok: true, resultados });
}
