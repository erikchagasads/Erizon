import { createServerSupabase } from "@/lib/supabase/server";
import { computeProfitDNA, type DNAProfile } from "@/core/profit-dna-engine";

export class ProfitDNAService {
  private db = createServerSupabase();

  async computeAndSave(workspaceId: string, clientId: string): Promise<DNAProfile> {
    // 1. Busca snapshots históricos do cliente (até 6 meses)
    const since = new Date();
    since.setMonth(since.getMonth() - 6);

    const { data: snapshots } = await this.db
      .from("campaign_snapshots_daily")
      .select("campaign_id, snapshot_date, spend, roas, cpl, ctr, frequency, leads, revenue")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .gte("snapshot_date", since.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: true });

    // 2. Busca memória do cliente (copies aprovadas, ganchos, etc)
    const { data: memoria } = await this.db
      .from("agente_memoria_cliente")
      .select("publico_alvo, copies_aprovadas, ganchos_aprovados, formatos_que_convertem")
      .eq("workspace_id", workspaceId)
      .eq("cliente_id", clientId)
      .maybeSingle();

    // 3. Roda engine
    const dna = computeProfitDNA(
      clientId,
      workspaceId,
      snapshots ?? [],
      memoria ? {
        copiesAprovadas: memoria.copies_aprovadas ?? [],
        ganchosAprovados: memoria.ganchos_aprovados ?? [],
        formatosQueConvertem: memoria.formatos_que_convertem ?? [],
        publicoAlvo: memoria.publico_alvo ?? undefined,
      } : undefined
    );

    // 4. Persiste no banco
    await this.db.from("profit_dna_snapshots").upsert({
      workspace_id:         workspaceId,
      client_id:            clientId,
      computed_at:          new Date().toISOString(),
      best_days_of_week:    dna.bestDaysOfWeek,
      worst_days_of_week:   dna.worstDaysOfWeek,
      best_formats:         dna.bestFormats,
      best_hooks:           dna.keyLearnings,
      best_audiences:       dna.bestAudiences,
      golden_audience:      dna.goldenAudience,
      cpl_p25:              dna.cplP25,
      cpl_median:           dna.cplMedian,
      roas_p25:             dna.roasP25,
      roas_median:          dna.roasMedian,
      frequency_sweet_spot: dna.frequencySweetSpot,
      avg_budget_winner:    dna.avgBudgetWinner,
      seasonality_patterns: Object.fromEntries(
        dna.seasonalityPatterns.map(s => [s.month, s])
      ),
      key_learnings:        dna.keyLearnings,
      n_campaigns_analyzed: dna.nCampaignsAnalyzed,
      n_snapshots_analyzed: dna.nSnapshotsAnalyzed,
      confidence_score:     dna.confidenceScore,
      period_start:         dna.periodStart,
      period_end:           dna.periodEnd,
    }, { onConflict: "workspace_id,client_id" });

    return dna;
  }

  async getForClient(workspaceId: string, clientId: string): Promise<DNAProfile | null> {
    const { data } = await this.db
      .from("profit_dna_snapshots")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (!data) return null;

    return {
      clientId:            data.client_id,
      workspaceId:         data.workspace_id,
      bestDaysOfWeek:      data.best_days_of_week ?? [],
      worstDaysOfWeek:     data.worst_days_of_week ?? [],
      bestFormats:         data.best_formats ?? [],
      bestAudiences:       data.best_audiences ?? [],
      goldenAudience:      data.golden_audience ?? null,
      cplP25:              data.cpl_p25,
      cplMedian:           data.cpl_median,
      roasP25:             data.roas_p25,
      roasMedian:          data.roas_median,
      frequencySweetSpot:  data.frequency_sweet_spot,
      avgBudgetWinner:     data.avg_budget_winner,
      seasonalityPatterns: Object.values(data.seasonality_patterns ?? {}),
      keyLearnings:        data.key_learnings ?? [],
      nCampaignsAnalyzed:  data.n_campaigns_analyzed ?? 0,
      nSnapshotsAnalyzed:  data.n_snapshots_analyzed ?? 0,
      confidenceScore:     data.confidence_score ?? 0,
      periodStart:         data.period_start,
      periodEnd:           data.period_end,
    };
  }

  async computeAllForWorkspace(workspaceId: string): Promise<void> {
    // Busca todos os client_ids únicos com snapshots no workspace
    const { data: rows } = await this.db
      .from("campaign_snapshots_daily")
      .select("client_id")
      .eq("workspace_id", workspaceId)
      .not("client_id", "is", null);

    const clientIds = [...new Set((rows ?? []).map(r => r.client_id).filter(Boolean))];

    for (const clientId of clientIds) {
      await this.computeAndSave(workspaceId, clientId).catch(err => {
        console.error(`[profit-dna] Erro cliente ${clientId}:`, err);
      });
    }
  }
}
