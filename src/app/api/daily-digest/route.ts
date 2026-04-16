import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { strategicIntelligenceService } from "@/services/strategic-intelligence-service";
import { filtrarAtivas, type CampanhaRaw } from "@/app/lib/engine/pulseEngine";

type SnapshotRow = {
  spend: number | null;
  leads: number | null;
  cpl: number | null;
  roas: number | null;
  campaign_id: string | null;
};

type PendingDecisionRow = {
  id: string;
  campaign_id?: string | null;
  action_type: string;
  title: string;
  estimated_impact_brl: number | null;
  confidence: string;
};

type AlertRow = {
  campaign_name: string;
  status: string;
};

const sum = (values: Array<number | null | undefined>) =>
  values.reduce((total, value) => total + (Number(value) || 0), 0);

const average = (values: Array<number | null | undefined>) => {
  const normalized = values.map((value) => Number(value) || 0).filter((value) => value > 0);
  if (normalized.length === 0) return null;
  return normalized.reduce((total, value) => total + value, 0) / normalized.length;
};

const pctChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function normalizeNicheLabel(value: string | null) {
  if (!value) return null;
  return value.replace(/_/g, " ");
}

function compareToBenchmark(myValue: number | null, benchmarkValue: number | null, inverse = false) {
  if (!myValue || !benchmarkValue) return "neutral" as const;
  if (inverse) {
    if (myValue <= benchmarkValue * 0.95) return "winning" as const;
    if (myValue >= benchmarkValue * 1.08) return "attention" as const;
    return "neutral" as const;
  }

  if (myValue >= benchmarkValue * 1.05) return "winning" as const;
  if (myValue <= benchmarkValue * 0.92) return "attention" as const;
  return "neutral" as const;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(values) {
            values.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {}
            });
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { data: workspaceMember } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const workspaceId = workspaceMember?.workspace_id ?? user.id;

    const today = new Date();
    const currentStart = new Date(today);
    currentStart.setDate(today.getDate() - 6);
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(currentStart.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousEnd.getDate() - 6);

    const currentStartStr = currentStart.toISOString().slice(0, 10);
    const previousStartStr = previousStart.toISOString().slice(0, 10);
    const previousEndStr = previousEnd.toISOString().slice(0, 10);
    const todayStr = today.toISOString().slice(0, 10);

    const [currentMetricsRes, previousMetricsRes, pendingDecisionsRes, alertsRes, topCampaignRes, workspaceRes, benchmarkRes, strategic, rawCampaignsRes] =
      await Promise.all([
        supabase
          .from("campaign_snapshots_daily")
          .select("spend, leads, cpl, roas, campaign_id")
          .eq("workspace_id", workspaceId)
          .gte("snapshot_date", currentStartStr)
          .lte("snapshot_date", todayStr),
        supabase
          .from("campaign_snapshots_daily")
          .select("spend, leads, cpl, roas, campaign_id")
          .eq("workspace_id", workspaceId)
          .gte("snapshot_date", previousStartStr)
          .lte("snapshot_date", previousEndStr),
        supabase
          .from("pending_decisions")
          .select("id, campaign_id, action_type, title, estimated_impact_brl, confidence")
          .eq("workspace_id", workspaceId)
          .eq("status", "pending")
          .order("created_at", { ascending: true }),
        supabase
          .from("metricas_ads")
          .select("campaign_name, status")
          .eq("user_id", user.id)
          .in("status", ["PAUSADA", "PAUSED", "ERRO", "ERROR"])
          .limit(5),
        supabase
          .from("metricas_ads")
          .select("campaign_name, contatos, gasto_total, ctr")
          .eq("user_id", user.id)
          .gt("contatos", 0)
          .order("contatos", { ascending: false })
          .order("gasto_total", { ascending: true })
          .limit(1),
        supabase
          .from("workspaces")
          .select("niche")
          .eq("id", workspaceId)
          .maybeSingle(),
        supabase
          .from("network_weekly_insights")
          .select("nicho, cpl_p50, roas_p50, trend_note, n_workspaces")
          .order("semana_inicio", { ascending: false })
          .limit(1),
        strategicIntelligenceService.getWorkspaceSnapshot({ workspaceId, userId: user.id }),
        supabase
          .from("metricas_ads")
          .select("id, status")
          .eq("user_id", user.id),
      ]);

    const currentMetrics = (currentMetricsRes.data ?? []) as SnapshotRow[];
    const previousMetrics = (previousMetricsRes.data ?? []) as SnapshotRow[];
    const activeIds = new Set(
      filtrarAtivas((rawCampaignsRes.data ?? []) as CampanhaRaw[]).map((campaign) => campaign.id)
    );

    const pendingDecisions = ((pendingDecisionsRes.data ?? []) as PendingDecisionRow[]).filter(
      (decision) => decision.campaign_id == null || activeIds.has(decision.campaign_id)
    );
    const alertCampaigns = (alertsRes.data ?? []) as AlertRow[];
    const topCampaign = topCampaignRes.data?.[0] ?? null;

    const currentSpend = sum(currentMetrics.map((row) => row.spend));
    const currentLeads = sum(currentMetrics.map((row) => row.leads));
    const currentCampaigns = new Set(currentMetrics.map((row) => row.campaign_id).filter(Boolean)).size;
    const currentAvgCpl = average(currentMetrics.map((row) => row.cpl));
    const currentAvgRoas = average(currentMetrics.map((row) => row.roas));

    const previousSpend = sum(previousMetrics.map((row) => row.spend));
    const previousLeads = sum(previousMetrics.map((row) => row.leads));
    const previousAvgCpl = average(previousMetrics.map((row) => row.cpl));
    const previousAvgRoas = average(previousMetrics.map((row) => row.roas));

    const currentRevenue = 0;
    const previousRevenue = 0;

    const spendChange = pctChange(currentSpend, previousSpend);
    const revenueChange = 0;
    const leadsChange = pctChange(currentLeads, previousLeads);
    const cplChange = pctChange(currentAvgCpl ?? 0, previousAvgCpl ?? 0);
    const roasChange = pctChange(currentAvgRoas ?? 0, previousAvgRoas ?? 0);

    const revenueOpportunityBrl = sum(
      pendingDecisions
        .filter((decision) => ["scale_budget", "resume"].includes(decision.action_type))
        .map((decision) => decision.estimated_impact_brl)
    );
    const wastedBudgetRecoveredBrl = sum(
      pendingDecisions
        .filter((decision) => ["pause", "reduce_budget", "alert"].includes(decision.action_type))
        .map((decision) => decision.estimated_impact_brl)
    );
    const pendingImpactBrl = sum(pendingDecisions.map((decision) => decision.estimated_impact_brl));

    const urgentCount = pendingDecisions.filter(
      (decision) => decision.confidence === "high" || ["pause", "reduce_budget"].includes(decision.action_type)
    ).length;

    const habitScore = Math.max(
      18,
      Math.min(
        98,
        40 +
          (pendingDecisions.length > 0 ? 12 : 0) +
          (currentCampaigns >= 3 ? 10 : 0) +
          (strategic.business.closedRevenue30d > 0 ? 14 : 0) +
          (alertCampaigns.length === 0 ? 8 : 0) +
          (currentAvgRoas && currentAvgRoas >= 2 ? 10 : 0)
      )
    );

    const niche = workspaceRes.data?.niche ?? null;
    const benchmarkRow = benchmarkRes.data?.find((row) => row.nicho === niche) ?? benchmarkRes.data?.[0] ?? null;

    const benchmark =
      benchmarkRow
        ? {
            niche: normalizeNicheLabel(benchmarkRow.nicho ?? niche ?? null),
            cpl: {
              my: currentAvgCpl,
              benchmark: benchmarkRow?.cpl_p50 ?? null,
              status: compareToBenchmark(currentAvgCpl, benchmarkRow?.cpl_p50 ?? null, true),
            },
            roas: {
              my: currentAvgRoas,
              benchmark: benchmarkRow?.roas_p50 ?? null,
              status: compareToBenchmark(currentAvgRoas, benchmarkRow?.roas_p50 ?? null, false),
            },
            insight:
              compareToBenchmark(currentAvgCpl, benchmarkRow?.cpl_p50 ?? null, true) === "winning"
                ? "Seu CPL esta melhor que a mediana do mercado neste momento."
                : compareToBenchmark(currentAvgRoas, benchmarkRow?.roas_p50 ?? null, false) === "winning"
                  ? "Seu ROAS esta acima da mediana do nicho. Vale proteger e escalar com cuidado."
                  : benchmarkRow?.trend_note ?? "Performance proxima da media do mercado. A alavanca esta na execucao diaria.",
          }
        : null;

    const heroHeadline =
      pendingDecisions.length > 0
        ? `voce acordou com ${pendingDecisions.length} decis${pendingDecisions.length === 1 ? "ao" : "oes"} esperando acao`
        : alertCampaigns.length > 0
          ? `${alertCampaigns.length} campanhas pedem cuidado antes de escalar`
          : strategic.business.closedRevenue30d > 0
            ? `o CRM ja mostra retorno real entrando na operacao`
            : "o cockpit esta limpo e pronto para a proxima decisao";

    const summaryParts = [
      `Nos ultimos 7 dias voce investiu R$ ${currentSpend.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
      currentLeads > 0 ? `captou ${currentLeads} leads` : null,
      strategic.business.closedRevenue30d > 0
        ? `o CRM ja fechou R$ ${strategic.business.closedRevenue30d.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} em 30 dias`
        : null,
    ].filter(Boolean);

    const collectiveInsight =
      strategic.collective.topPattern
        ? `${strategic.collective.insight} Padrao em alta na rede: ${strategic.collective.topPattern}.`
        : strategic.collective.insight;

    const insights = [
      strategic.business.closedRevenue30d > 0
        ? `O CRM registra R$ ${strategic.business.closedRevenue30d.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} fechados em 30 dias. Agora a leitura de negocio ja saiu da suposicao.`
        : "Sua janela semanal mostra operacao real de spend e leads. Receita fechada ainda depende do CRM estar mais completo.",
      spendChange < 0 && revenueChange >= 0
        ? "Voce gastou menos sem derrubar resultado. Isso e sinal de operacao mais eficiente."
        : "O investimento segue puxando o resultado. Priorize o que mais move leads, CPL e execucao.",
      benchmark?.insight ?? collectiveInsight,
      strategic.learning.memoryLine,
    ];

    const actions = [
      pendingDecisions.length > 0
        ? `${pendingDecisions.length} decis${pendingDecisions.length === 1 ? "ao" : "oes"} aguardam aprovacao e podem mover R$ ${pendingImpactBrl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}.`
        : "Sem fila travada agora. Use o momento para revisar benchmark e preparar a proxima rodada.",
      alertCampaigns.length > 0
        ? `${alertCampaigns.length} campanha${alertCampaigns.length === 1 ? "" : "s"} estao pausadas ou com erro e merecem revisao.`
        : "Nenhum alerta operacional severo apareceu no recorte atual.",
      benchmark?.cpl.status === "attention"
        ? "Seu CPL esta acima da mediana do nicho. Criativo e segmentacao sao a prioridade."
        : benchmark?.roas.status === "winning"
          ? "Seu ROAS esta acima do mercado. Proteja os vencedores e escale so o que mantem margem."
          : "Seu benchmark esta equilibrado. O maior ganho agora vem da velocidade de execucao.",
      strategic.forecast?.estimatedLeads7d
        ? `Antes de publicar, seu ultimo preflight ja projeta ${strategic.forecast.estimatedLeads7d} leads em 7 dias com ${strategic.forecast.confidenceLabel}.`
        : "Sem previsao recente salva. Rode o preflight antes da proxima campanha para enxergar impacto antes de gastar.",
    ];

    return NextResponse.json({
      hero: {
        greeting: getGreeting(),
        headline: heroHeadline,
        summary: `${summaryParts.join(", ")}. ${pendingDecisions.length > 0 ? "Existe motivo real para abrir o app agora." : "A home virou seu check-in executivo da manha."}`,
      },
      period: {
        current: {
          spend: currentSpend,
          revenue: currentRevenue,
          leads: currentLeads,
          campaigns: currentCampaigns,
          avgCpl: currentAvgCpl,
          avgRoas: currentAvgRoas,
        },
        previous: {
          spend: previousSpend,
          revenue: previousRevenue,
          leads: previousLeads,
          avgCpl: previousAvgCpl,
          avgRoas: previousAvgRoas,
        },
        changes: {
          spend: spendChange,
          revenue: 0,
          leads: leadsChange,
          avgCpl: cplChange,
          avgRoas: roasChange,
        },
      },
      decisions: {
        count: pendingDecisions.length,
        urgentCount,
        pendingImpactBrl,
        pending: pendingDecisions,
      },
      alerts: {
        count: alertCampaigns.length,
        criticalCount: urgentCount,
        pausedCampaigns: alertCampaigns,
      },
      topCampaign: topCampaign
        ? {
            campaign_name: topCampaign.campaign_name,
            leads: Number(topCampaign.contatos ?? 0),
            spend: Number(topCampaign.gasto_total ?? 0),
            ctr: Number(topCampaign.ctr ?? 0),
          }
        : null,
      benchmark,
      learning: strategic.learning,
      business: strategic.business,
      collective: {
        ...strategic.collective,
        insight: collectiveInsight,
      },
      forecast: strategic.forecast,
      dna: strategic.dna,
      progress: {
        wastedBudgetRecoveredBrl,
        revenueOpportunityBrl,
        efficiencyDelta: Math.round(((revenueChange || 0) - (spendChange || 0)) / 2),
        habitScore,
      },
      dataQuality: {
        operationalWindow: "7d",
        revenueSource: strategic.business.closedRevenue30d > 0 ? "crm" : "unavailable",
        benchmarkSource: benchmark ? "network_weekly_insights" : "unavailable",
        benchmarkPeers: Number(benchmarkRow?.n_workspaces ?? 0),
      },
      actions,
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[daily-digest]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
