import { createServerSupabase } from "@/lib/supabase/server";

export type NicheInsight = {
  nicho: string;
  semanaInicio: string;
  cplP25: number | null;
  cplP50: number | null;
  cplP75: number | null;
  roasP25: number | null;
  roasP50: number | null;
  roasP75: number | null;
  ctrP50: number | null;
  nWorkspaces: number;
  topPattern: string | null;
  marketTrend: "rising" | "stable" | "falling" | null;
  trendNote: string | null;
  computedAt: string;
};

export type WorkspacePosition = {
  nicho: string;
  suaCpl: number | null;
  benchmarkCplP50: number | null;
  posicaoCpl: "top25" | "median" | "bottom25" | "unknown";
  suaRoas: number | null;
  benchmarkRoasP50: number | null;
  posicaoRoas: "top25" | "median" | "bottom25" | "unknown";
  insight: string;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.floor((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export class NetworkIntelligenceService {
  private db = createServerSupabase();

  // Computa benchmarks semanais para todos os nichos
  async computeWeeklyInsights(): Promise<void> {
    const semanaInicio = this.getSemanaInicio();

    // Busca workspaces que optaram por participar (ou que nunca optaram out)
    const { data: optedOut } = await this.db
      .from("network_participation")
      .select("workspace_id")
      .eq("opted_in", false);

    const excludedIds = (optedOut ?? []).map(r => r.workspace_id);

    // Busca dados dos últimos 7 dias agrupados por nicho
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data: rows } = await this.db
      .from("campaign_snapshots_daily")
      .select("workspace_id, spend, cpl, roas, ctr, frequency")
      .gte("snapshot_date", since.toISOString().split("T")[0])
      .not("workspace_id", "in", `(${excludedIds.join(",") || "null"})`);

    if (!rows?.length) return;

    // Busca nichos por workspace
    const { data: wsData } = await this.db
      .from("workspaces")
      .select("id, niche");

    const nicheMap = Object.fromEntries((wsData ?? []).map(w => [w.id, w.niche ?? "geral"]));

    // Agrupa por nicho
    const byNiche: Record<string, { cpls: number[]; roass: number[]; ctrs: number[]; wsIds: Set<string> }> = {};

    for (const row of rows) {
      if (!row.workspace_id || excludedIds.includes(row.workspace_id)) continue;
      const nicho = nicheMap[row.workspace_id] ?? "geral";
      if (!byNiche[nicho]) byNiche[nicho] = { cpls: [], roass: [], ctrs: [], wsIds: new Set() };
      byNiche[nicho].wsIds.add(row.workspace_id);
      if (row.cpl > 0 && row.cpl < 9999) byNiche[nicho].cpls.push(row.cpl);
      if (row.roas > 0) byNiche[nicho].roass.push(row.roas);
      if (row.ctr > 0) byNiche[nicho].ctrs.push(row.ctr);
    }

    // Salva insights por nicho
    for (const [nicho, data] of Object.entries(byNiche)) {
      if (data.wsIds.size < 2) continue; // Mínimo 2 workspaces para benchmark

      const sortedCpl = [...data.cpls].sort((a, b) => a - b);
      const sortedRoas = [...data.roass].sort((a, b) => b - a); // desc
      const sortedCtr = [...data.ctrs].sort((a, b) => a - b);

      const cplP50 = sortedCpl.length ? percentile(sortedCpl, 50) : null;
      const roasP50 = sortedRoas.length ? avg(data.roass) : null;

      // Determina tendência comparando com semana anterior
      const { data: prevInsight } = await this.db
        .from("network_weekly_insights")
        .select("cpl_p50, roas_p50")
        .eq("nicho", nicho)
        .lt("semana_inicio", semanaInicio)
        .order("semana_inicio", { ascending: false })
        .limit(1)
        .maybeSingle();

      let marketTrend: "rising" | "stable" | "falling" = "stable";
      let trendNote = "Performance estável esta semana";

      if (prevInsight?.cpl_p50 && cplP50) {
        const cplChange = ((cplP50 - prevInsight.cpl_p50) / prevInsight.cpl_p50) * 100;
        if (cplChange > 10) {
          marketTrend = "falling";
          trendNote = `CPL subiu ${Math.round(cplChange)}% vs semana anterior — mercado mais competitivo`;
        } else if (cplChange < -10) {
          marketTrend = "rising";
          trendNote = `CPL caiu ${Math.abs(Math.round(cplChange))}% vs semana anterior — ótimo momento para escalar`;
        }
      }

      await this.db.from("network_weekly_insights").upsert({
        nicho,
        semana_inicio:  semanaInicio,
        cpl_p25:        sortedCpl.length >= 4 ? percentile(sortedCpl, 25) : null,
        cpl_p50:        cplP50,
        cpl_p75:        sortedCpl.length >= 4 ? percentile(sortedCpl, 75) : null,
        roas_p25:       sortedRoas.length >= 4 ? percentile(sortedRoas, 75) : null, // p75 desc = p25 performance
        roas_p50:       roasP50,
        roas_p75:       sortedRoas.length >= 4 ? percentile(sortedRoas, 25) : null,
        ctr_p50:        sortedCtr.length ? percentile(sortedCtr, 50) : null,
        n_workspaces:   data.wsIds.size,
        n_campaigns:    data.cpls.length,
        market_trend:   marketTrend,
        trend_note:     trendNote,
        computed_at:    new Date().toISOString(),
      }, { onConflict: "nicho,semana_inicio" });
    }
  }

  // Retorna insight da última semana para um nicho
  async getLatestForNiche(nicho: string): Promise<NicheInsight | null> {
    const { data } = await this.db
      .from("network_weekly_insights")
      .select("*")
      .eq("nicho", nicho)
      .order("semana_inicio", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return this.mapRow(data);
  }

  // Compara a performance de um workspace com a rede
  async getWorkspacePosition(workspaceId: string): Promise<WorkspacePosition | null> {
    // Busca nicho do workspace
    const { data: ws } = await this.db
      .from("workspaces")
      .select("niche")
      .eq("id", workspaceId)
      .maybeSingle();

    const nicho = ws?.niche ?? "geral";

    // Métricas do workspace na última semana
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data: snaps } = await this.db
      .from("campaign_snapshots_daily")
      .select("cpl, roas")
      .eq("workspace_id", workspaceId)
      .gte("snapshot_date", since.toISOString().split("T")[0]);

    const myCpls = (snaps ?? []).filter(s => s.cpl > 0 && s.cpl < 9999).map(s => s.cpl);
    const myRoass = (snaps ?? []).filter(s => s.roas > 0).map(s => s.roas);

    const myCpl = myCpls.length ? avg(myCpls) : null;
    const myRoas = myRoass.length ? avg(myRoass) : null;

    // Busca benchmark da rede
    const insight = await this.getLatestForNiche(nicho);
    if (!insight) return null;

    let posicaoCpl: WorkspacePosition["posicaoCpl"] = "unknown";
    if (myCpl && insight.cplP25 && insight.cplP75) {
      if (myCpl <= insight.cplP25) posicaoCpl = "top25";
      else if (myCpl >= insight.cplP75) posicaoCpl = "bottom25";
      else posicaoCpl = "median";
    }

    let posicaoRoas: WorkspacePosition["posicaoRoas"] = "unknown";
    if (myRoas && insight.roasP25 && insight.roasP75) {
      if (myRoas >= insight.roasP25) posicaoRoas = "top25";
      else if (myRoas <= insight.roasP75) posicaoRoas = "bottom25";
      else posicaoRoas = "median";
    }

    const insightText =
      posicaoCpl === "top25" ? `Seu CPL está no top 25% do nicho ${nicho} — você está ganhando` :
      posicaoCpl === "bottom25" ? `Seu CPL está acima da média do nicho — há espaço para otimizar` :
      posicaoRoas === "top25" ? `Seu ROAS está entre os melhores do nicho ${nicho}` :
      `Performance alinhada com a média do mercado`;

    return {
      nicho,
      suaCpl: myCpl,
      benchmarkCplP50: insight.cplP50,
      posicaoCpl,
      suaRoas: myRoas,
      benchmarkRoasP50: insight.roasP50,
      posicaoRoas,
      insight: insightText,
    };
  }

  private getSemanaInicio(): string {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // domingo
    return d.toISOString().split("T")[0];
  }

  private mapRow(data: Record<string, unknown>): NicheInsight {
    return {
      nicho:         data.nicho as string,
      semanaInicio:  data.semana_inicio as string,
      cplP25:        data.cpl_p25 as number | null,
      cplP50:        data.cpl_p50 as number | null,
      cplP75:        data.cpl_p75 as number | null,
      roasP25:       data.roas_p25 as number | null,
      roasP50:       data.roas_p50 as number | null,
      roasP75:       data.roas_p75 as number | null,
      ctrP50:        data.ctr_p50 as number | null,
      nWorkspaces:   data.n_workspaces as number,
      topPattern:    data.top_pattern as string | null,
      marketTrend:   data.market_trend as NicheInsight["marketTrend"],
      trendNote:     data.trend_note as string | null,
      computedAt:    data.computed_at as string,
    };
  }
}
