import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { strategicIntelligenceService } from "@/services/strategic-intelligence-service";

const sum = (values: Array<number | null | undefined>) =>
  values.reduce((total, value) => total + (Number(value) || 0), 0);

const pctChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await params;

    if (!clienteId) {
      return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: cliente, error: clienteErr } = await supabase
      .from("clientes")
      .select("id, nome, nome_cliente, cor, ativo, ultima_atualizacao, crm_token, user_id, ticket_medio")
      .eq("id", clienteId)
      .eq("ativo", true)
      .maybeSingle();

    if (clienteErr || !cliente) {
      return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
    }

    const today = new Date();
    const currentStart = new Date(today);
    currentStart.setDate(today.getDate() - 29);
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(currentStart.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousEnd.getDate() - 29);

    const workspaceId = await strategicIntelligenceService.resolveWorkspaceId(cliente.user_id);

    const [adsRes, currentSnapshotsRes, previousSnapshotsRes, profitDnaRes, strategic] = await Promise.all([
      supabase
        .from("metricas_ads")
        .select("nome_campanha, status, gasto_total, contatos, impressoes, cliques, ctr")
        .eq("cliente_id", clienteId)
        .in("status", ["ATIVO", "ACTIVE", "ATIVA"])
        .order("gasto_total", { ascending: false }),
      supabase
        .from("campaign_snapshots_daily")
        .select("spend, leads, cpl, roas")
        .eq("client_id", clienteId)
        .gte("snapshot_date", currentStart.toISOString().slice(0, 10))
        .lte("snapshot_date", today.toISOString().slice(0, 10)),
      supabase
        .from("campaign_snapshots_daily")
        .select("spend, leads, cpl, roas")
        .eq("client_id", clienteId)
        .gte("snapshot_date", previousStart.toISOString().slice(0, 10))
        .lte("snapshot_date", previousEnd.toISOString().slice(0, 10)),
      supabase
        .from("profit_dna_snapshots")
        .select("cpl_median, roas_median, confidence_score")
        .eq("client_id", clienteId)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      strategicIntelligenceService.getClientSnapshot({
        clientId: clienteId,
        userId: cliente.user_id,
        workspaceId,
      }),
    ]);

    const campanhas = (adsRes.data ?? []).map((campanha) => {
      const leads = campanha.contatos ?? 0;
      const gasto = campanha.gasto_total ?? 0;
      const cpl = leads > 0 ? gasto / leads : 0;
      const ctr = campanha.ctr ?? (campanha.cliques && campanha.impressoes
        ? (campanha.cliques / campanha.impressoes) * 100
        : 0);

      let score = 70;
      if (leads === 0 && gasto > 50) score = 20;
      else if (cpl > 80) score = 35;
      else if (cpl > 50) score = 55;
      else if (cpl < 20 && leads > 5) score = 90;

      let recomendacao = "Manter";
      if (score >= 80) recomendacao = "Escalar";
      else if (score < 40) recomendacao = "Pausar";
      else if (score < 60) recomendacao = "Otimizar";
      else if (gasto < 30) recomendacao = "Maturando";

      return {
        nome_campanha: campanha.nome_campanha,
        status: campanha.status,
        gasto_total: gasto,
        total_leads: leads,
        cpl: Math.round(cpl * 100) / 100,
        impressoes: campanha.impressoes ?? 0,
        cliques: campanha.cliques ?? 0,
        ctr: Math.round(ctr * 100) / 100,
        score,
        recomendacao,
      };
    });

    const totalLeads = campanhas.reduce((total, campanha) => total + campanha.total_leads, 0);
    const totalGasto = campanhas.reduce((total, campanha) => total + campanha.gasto_total, 0);
    const cplMedio = totalLeads > 0 ? totalGasto / totalLeads : 0;
    const averageScore = campanhas.length
      ? Math.round(campanhas.reduce((total, campanha) => total + campanha.score, 0) / campanhas.length)
      : 0;

    const currentSnapshots = currentSnapshotsRes.data ?? [];
    const previousSnapshots = previousSnapshotsRes.data ?? [];

    const currentPeriodSpend = sum(currentSnapshots.map((row) => row.spend));
    const currentPeriodLeads = sum(currentSnapshots.map((row) => row.leads));
    const currentPeriodCpl = currentPeriodLeads > 0 ? currentPeriodSpend / currentPeriodLeads : null;

    const previousPeriodSpend = sum(previousSnapshots.map((row) => row.spend));
    const previousPeriodLeads = sum(previousSnapshots.map((row) => row.leads));
    const previousPeriodCpl = previousPeriodLeads > 0 ? previousPeriodSpend / previousPeriodLeads : null;

    const strongCampaigns = campanhas.filter((campanha) => campanha.score >= 75).length;
    const needsAttention = campanhas.filter((campanha) => campanha.score < 50).length;

    const spendChange = pctChange(currentPeriodSpend, previousPeriodSpend);
    const leadsChange = pctChange(currentPeriodLeads, previousPeriodLeads);
    const cplChange = pctChange(currentPeriodCpl ?? 0, previousPeriodCpl ?? 0);

    const healthLabel =
      averageScore >= 80 ? "crescimento consistente" :
      averageScore >= 60 ? "operacao saudavel" :
      "operacao em ajuste";

    const ownerCopy =
      currentPeriodLeads > 0
        ? `Nos ultimos 30 dias sua operacao gerou ${currentPeriodLeads} leads com CPL medio de R$ ${Math.round(currentPeriodCpl ?? 0).toLocaleString("pt-BR")}.`
        : "Seu portal esta ativo, mas ainda sem volume suficiente para uma leitura mais forte do periodo.";

    const celebration =
      leadsChange >= 15
        ? "Momento de comemoracao: o volume de leads subiu forte neste ciclo."
        : cplChange < -10
          ? "Boa noticia: o custo por lead caiu de forma relevante neste periodo."
          : averageScore >= 80
            ? "Conta em boa fase: a maior parte das campanhas esta performando acima do esperado."
            : null;

    return NextResponse.json({
      nome: cliente.nome_cliente ?? cliente.nome,
      cor: cliente.cor ?? "#6366f1",
      campanhas,
      total_leads: totalLeads,
      gasto_total: totalGasto,
      cpl_medio: Math.round(cplMedio * 100) / 100,
      campanhas_ativas: campanhas.length,
      ultima_atualizacao: cliente.ultima_atualizacao,
      crm_token: (cliente as Record<string, unknown>).crm_token as string ?? null,
      period: {
        current: {
          spend: currentPeriodSpend,
          leads: currentPeriodLeads,
          cpl: currentPeriodCpl ? Math.round(currentPeriodCpl * 100) / 100 : null,
        },
        previous: {
          spend: previousPeriodSpend,
          leads: previousPeriodLeads,
          cpl: previousPeriodCpl ? Math.round(previousPeriodCpl * 100) / 100 : null,
        },
        changes: {
          spend: spendChange,
          leads: leadsChange,
          cpl: cplChange,
        },
      },
      summary: {
        headline: `${cliente.nome_cliente ?? cliente.nome} em ${healthLabel}`,
        owner_copy: ownerCopy,
        celebration,
      },
      momentum: {
        average_score: averageScore,
        strong_campaigns: strongCampaigns,
        needs_attention: needsAttention,
      },
      live_roi: strategic.liveRoi,
      business: strategic.business,
      collective: strategic.collective,
      dna: strategic.dna,
      benchmarks: {
        cpl_median: profitDnaRes.data?.cpl_median ?? null,
        roas_median: profitDnaRes.data?.roas_median ?? null,
        confidence_score: profitDnaRes.data?.confidence_score ?? null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("GET /api/cliente-publico/[id]:", message);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
