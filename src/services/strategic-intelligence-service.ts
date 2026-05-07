import { createServerSupabase } from "@/lib/supabase/server";
import { feedbackLoopService } from "@/services/feedback-loop-service";
import { NetworkIntelligenceService } from "@/services/network-intelligence-service";

type NumericLike = number | string | null | undefined;

type AuditTrailRow = {
  decision_action: string | null;
  approval_status: string | null;
  outcome_success: boolean | null;
  outcome_actual_value: NumericLike;
  decision_impact_estimated: NumericLike;
  created_at: string;
};

type PredictionRow = {
  predicted_metric: string | null;
  predicted_value: NumericLike;
  actual_value: NumericLike;
  confidence_adjustment: NumericLike;
  model_iteration_triggered: boolean | null;
  created_at: string;
};

type LeadRow = {
  estagio: string | null;
  valor_fechado: NumericLike;
  campanha_nome: string | null;
  created_at: string;
  updated_at: string | null;
};

type SnapshotRow = {
  spend: NumericLike;
  revenue: NumericLike;
  leads: NumericLike;
  cpl: NumericLike;
  roas: NumericLike;
  snapshot_date: string;
};

type PreflightRow = {
  id?: string;
  campaign_id?: string | null;
  campaign_name: string | null;
  score: number;
  estimated_cpl_min: NumericLike;
  estimated_cpl_max: NumericLike;
  estimated_roas: NumericLike;
  risks: Array<{ label?: string; recommendation?: string }> | null;
  input_snapshot: {
    orcamentoDiario?: NumericLike;
    metaLeads?: NumericLike;
  } | null;
  forecast_snapshot?: ForecastSnapshot | null;
  created_at: string;
};

type ForecastSnapshot = {
  estimatedLeads7d?: NumericLike;
  estimatedRevenue7d?: NumericLike;
  confidenceLabel?: string | null;
  estimatedCplRange?: [NumericLike, NumericLike] | null;
  estimatedRoas?: NumericLike;
  recommendation?: string | null;
};

type DraftCampaignRow = {
  id: string;
  nome_campanha: string | null;
  status: string | null;
  orcamento: NumericLike;
  preflight_status: string | null;
  preflight_score: NumericLike;
  preflight_result: {
    estimatedCplMin?: NumericLike;
    estimatedCplMax?: NumericLike;
    estimatedRoas?: NumericLike;
    readyToLaunch?: boolean;
    topRecommendation?: string | null;
  } | null;
  forecast_snapshot: ForecastSnapshot | null;
  draft_payload: {
    orcamentoDiario?: NumericLike;
    metaLeads?: NumericLike;
  } | null;
  data_atualizacao: string | null;
  created_at: string;
};

type ProfitDnaRow = {
  cpl_median: NumericLike;
  roas_median: NumericLike;
  confidence_score: NumericLike;
  best_formats: Array<{ format?: string; avg_roas?: NumericLike }> | null;
  key_learnings: Array<{ learning?: string }> | string[] | null;
  golden_audience: string | null;
};

const toNumber = (value: NumericLike) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const avg = (values: NumericLike[]) => {
  const normalized = values.map(toNumber).filter((value) => value > 0);
  if (!normalized.length) return null;
  return normalized.reduce<number>((total, value) => total + value, 0) / normalized.length;
};

const sum = (values: NumericLike[]) =>
  values.reduce<number>((total, value) => total + toNumber(value), 0);

const pctChange = (current: number, previous: number) => {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const stageWeight = (stage: string | null) => {
  switch (stage) {
    case "fechado":
      return 1;
    case "proposta":
      return 0.6;
    case "contato":
      return 0.25;
    case "novo":
      return 0.1;
    default:
      return 0;
  }
};

const labelFromPosition = (position: "top25" | "median" | "bottom25" | "unknown") => {
  switch (position) {
    case "top25":
      return "top 25%";
    case "bottom25":
      return "abaixo da media";
    case "median":
      return "na media";
    default:
      return "em leitura";
  }
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

export type WorkspaceStrategicSnapshot = {
  moat: {
    dependencyScore: number;
    lockInLine: string;
    reasons: string[];
  };
  learning: {
    approvedCount: number;
    rejectedCount: number;
    measuredCount: number;
    accuracyPct: number;
    confidenceScore: number;
    retrainingTriggers: number;
    topWinningActions: string[];
    topRejectedActions: string[];
    memoryLine: string;
  };
  business: {
    spend30d: number;
    closedRevenue30d: number;
    pipelineValue: number;
    weightedPipelineValue: number;
    conversionRate: number;
    ticketMedio: number;
    roiMultiple: number | null;
    projectedRevenue30d: number;
    projectedMarginPct: number | null;
    summary: string;
  };
  collective: {
    niche: string | null;
    peers: number;
    position: string;
    marketTrend: string | null;
    topPattern: string | null;
    trendNote: string | null;
    insight: string;
  };
  forecast: {
    campaignName: string | null;
    score: number | null;
    confidenceLabel: string;
    estimatedLeads7d: number | null;
    estimatedRevenue7d: number | null;
    estimatedCplRange: [number, number] | null;
    estimatedRoas: number | null;
    recommendation: string | null;
    createdAt: string | null;
    draftCount?: number;
    readyDraftCount?: number;
    budget7d?: number;
    campaigns?: Array<{
      id: string;
      name: string;
      score: number | null;
      estimatedLeads7d: number | null;
    }>;
  } | null;
  dna: {
    bestFormats: string[];
    keyLearnings: string[];
    goldenAudience: string | null;
    confidenceScore: number;
  } | null;
};

export type ClientStrategicSnapshot = {
  liveRoi: {
    todaySpend: number;
    previousSpend: number;
    todayLeads: number;
    previousLeads: number;
    todayRevenue: number;
    previousRevenue: number;
    leadsChange: number;
    revenueChange: number;
    summary: string;
  };
  business: {
    spend30d: number;
    closedRevenue30d: number;
    pipelineValue: number;
    weightedPipelineValue: number;
    conversionRate: number;
    ticketMedio: number;
    roiMultiple: number | null;
    projectedRevenue30d: number;
    projectedMarginPct: number | null;
    summary: string;
  };
  collective: WorkspaceStrategicSnapshot["collective"];
  dna: WorkspaceStrategicSnapshot["dna"];
};

export class StrategicIntelligenceService {
  private db = createServerSupabase();
  private network = new NetworkIntelligenceService();

  async resolveWorkspaceId(userId: string) {
    const { data } = await this.db
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    return data?.workspace_id ?? userId;
  }

  async getWorkspaceSnapshot(params: {
    workspaceId: string;
    userId: string;
  }): Promise<WorkspaceStrategicSnapshot> {
    const { workspaceId, userId } = params;
    const since90d = new Date();
    since90d.setDate(since90d.getDate() - 90);
    const since30d = new Date();
    since30d.setDate(since30d.getDate() - 30);

    const [
      auditTrailRes,
      predictionRes,
      leadsRes,
      snapshotsRes,
      preflightRes,
      draftCampaignsRes,
      nicheRes,
      dnaRes,
      modelConfidence,
      workspacePosition,
    ] = await Promise.all([
      this.db
        .from("decision_audit_trail")
        .select("decision_action, approval_status, outcome_success, outcome_actual_value, decision_impact_estimated, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", since90d.toISOString())
        .order("created_at", { ascending: false })
        .limit(200),
      this.db
        .from("prediction_feedback")
        .select("predicted_metric, predicted_value, actual_value, confidence_adjustment, model_iteration_triggered, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", since90d.toISOString())
        .order("created_at", { ascending: false })
        .limit(200),
      this.db
        .from("crm_leads")
        .select("estagio, valor_fechado, campanha_nome, created_at, updated_at")
        .eq("user_id", userId)
        .gte("created_at", since30d.toISOString()),
      this.db
        .from("campaign_snapshots_daily")
        .select("spend, revenue, leads, cpl, roas, snapshot_date")
        .eq("workspace_id", workspaceId)
        .gte("snapshot_date", since30d.toISOString().slice(0, 10)),
      this.db
        .from("preflight_scores")
        .select("id, campaign_id, campaign_name, score, estimated_cpl_min, estimated_cpl_max, estimated_roas, risks, input_snapshot, forecast_snapshot, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      this.db
        .from("metricas_ads")
        .select("id, nome_campanha, status, orcamento, preflight_status, preflight_score, preflight_result, forecast_snapshot, draft_payload, data_atualizacao, created_at")
        .eq("user_id", userId)
        .eq("status", "rascunho")
        .not("preflight_score", "is", null)
        .order("data_atualizacao", { ascending: false })
        .limit(20),
      this.db
        .from("workspaces")
        .select("niche")
        .eq("id", workspaceId)
        .maybeSingle(),
      this.db
        .from("profit_dna_snapshots")
        .select("cpl_median, roas_median, confidence_score, best_formats, key_learnings, golden_audience")
        .eq("workspace_id", workspaceId)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      feedbackLoopService.getModelConfidence(workspaceId).catch(() => ({
        global: 0.6,
        by_metric: {},
        accuracy_last_100: 0,
      })),
      this.network.getWorkspacePosition(workspaceId).catch(() => null),
    ]);

    const auditTrail = (auditTrailRes.data ?? []) as AuditTrailRow[];
    const predictions = (predictionRes.data ?? []) as PredictionRow[];
    const leads = (leadsRes.data ?? []) as LeadRow[];
    const snapshots = (snapshotsRes.data ?? []) as SnapshotRow[];
    const latestPreflight = (preflightRes.data ?? null) as PreflightRow | null;
    const draftCampaigns = draftCampaignsRes.error
      ? []
      : (draftCampaignsRes.data ?? []) as DraftCampaignRow[];
    const dna = (dnaRes.data ?? null) as ProfitDnaRow | null;

    const approved = auditTrail.filter((row) => ["approved", "auto"].includes(row.approval_status ?? ""));
    const rejected = auditTrail.filter((row) => row.approval_status === "rejected");
    const measuredPredictions = predictions.filter((row) => toNumber(row.actual_value) > 0);
    const accuratePredictions = measuredPredictions.filter((row) => {
      const predicted = toNumber(row.predicted_value);
      const actual = toNumber(row.actual_value);
      if (!predicted || !actual) return false;
      return Math.abs((predicted - actual) / actual) <= 0.2;
    });

    const actionStats = new Map<string, { approved: number; rejected: number; impact: number }>();
    for (const row of auditTrail) {
      const action = row.decision_action ?? "acao";
      const current = actionStats.get(action) ?? { approved: 0, rejected: 0, impact: 0 };
      if (["approved", "auto"].includes(row.approval_status ?? "")) current.approved += 1;
      if (row.approval_status === "rejected") current.rejected += 1;
      current.impact += toNumber(row.decision_impact_estimated);
      actionStats.set(action, current);
    }

    const topWinningActions = [...actionStats.entries()]
      .sort((a, b) => (b[1].approved * 2 + b[1].impact / 500) - (a[1].approved * 2 + a[1].impact / 500))
      .slice(0, 3)
      .map(([action]) => action.replace(/_/g, " "));

    const topRejectedActions = [...actionStats.entries()]
      .sort((a, b) => b[1].rejected - a[1].rejected)
      .slice(0, 2)
      .map(([action]) => action.replace(/_/g, " "));

    const spend30d = sum(snapshots.map((row) => row.spend));
    const closedRevenue30d = leads
      .filter((row) => row.estagio === "fechado")
      .reduce((total, row) => total + toNumber(row.valor_fechado), 0);
    const pipelineValue = leads.reduce((total, row) => total + toNumber(row.valor_fechado), 0);
    const weightedPipelineValue = leads.reduce(
      (total, row) => total + toNumber(row.valor_fechado) * stageWeight(row.estagio),
      0
    );
    const closedCount = leads.filter((row) => row.estagio === "fechado").length;
    const conversionRate = leads.length ? Math.round((closedCount / leads.length) * 100) : 0;
    const ticketMedio = closedCount ? closedRevenue30d / closedCount : 0;
    const roiMultiple = spend30d > 0 && closedRevenue30d > 0 ? closedRevenue30d / spend30d : null;
    const projectedRevenue30d = Math.max(
      closedRevenue30d,
      Math.round(closedRevenue30d + weightedPipelineValue * 0.35)
    );
    const projectedMarginPct =
      projectedRevenue30d > 0 ? Math.round(((projectedRevenue30d - spend30d) / projectedRevenue30d) * 100) : null;

    const niche = nicheRes.data?.niche ?? workspacePosition?.nicho ?? null;
    const nicheInsight = niche ? await this.network.getLatestForNiche(niche).catch(() => null) : null;

    const forecast = draftCampaigns.length > 0
      ? this.buildDraftForecast(draftCampaigns, conversionRate, ticketMedio)
      : latestPreflight
        ? this.buildForecast(latestPreflight, conversionRate, ticketMedio)
        : null;

    const learningAccuracy = measuredPredictions.length
      ? Math.round((accuratePredictions.length / measuredPredictions.length) * 100)
      : Math.round(modelConfidence.accuracy_last_100 ?? 0);

    const dependencyScore = Math.max(
      22,
      Math.min(
        98,
        20 +
          Math.round(modelConfidence.global * 22) +
          Math.min(16, approved.length) +
          (closedRevenue30d > 0 ? 12 : 0) +
          (weightedPipelineValue > 0 ? 8 : 0) +
          (workspacePosition ? 8 : 0) +
          (dna?.golden_audience ? 6 : 0)
      )
    );

    const businessSummary =
      closedRevenue30d > 0
        ? `Nos ultimos 30 dias o trafego virou R$ ${closedRevenue30d.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} em vendas fechadas, com pipeline ponderado de R$ ${weightedPipelineValue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}.`
        : "Seu CRM ainda esta formando massa critica; o proximo salto e ligar mais campanhas a proposta e fechamento.";

    const memoryBits = [
      topWinningActions.length ? `as melhores acoes foram ${topWinningActions.join(", ")}` : null,
      topRejectedActions.length ? `as mais rejeitadas foram ${topRejectedActions.join(", ")}` : null,
      dna?.golden_audience ? `o publico campeao atual e ${dna.golden_audience}` : null,
    ].filter(Boolean);

    return {
      moat: {
        dependencyScore,
        lockInLine:
          dependencyScore >= 75
            ? "A Erizon ja esta virando memoria operacional da conta, nao so painel."
            : dependencyScore >= 55
              ? "A base de aprendizado e negocio ja comeca a aumentar o custo de sair."
              : "A fundacao do moat ja esta ligada; mais uso e outcomes agora aumentam a dependencia real.",
        reasons: [
          approved.length > 0 ? `${approved.length} decisoes aprovadas ja alimentam o proximo ciclo` : null,
          closedRevenue30d > 0 ? `ROI fechado de R$ ${closedRevenue30d.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ja conecta trafego ao caixa` : null,
          workspacePosition ? `benchmark vivo mostra onde a conta esta contra o mercado` : null,
          dna?.golden_audience ? `memoria acumulada ja aponta publico campeao` : null,
        ].filter(Boolean) as string[],
      },
      learning: {
        approvedCount: approved.length,
        rejectedCount: rejected.length,
        measuredCount: measuredPredictions.length,
        accuracyPct: learningAccuracy,
        confidenceScore: Math.round((modelConfidence.global ?? 0.6) * 100),
        retrainingTriggers: predictions.filter((row) => row.model_iteration_triggered).length,
        topWinningActions,
        topRejectedActions,
        memoryLine:
          memoryBits.join("; ") ||
          "A memoria estrategica ainda esta em formacao; cada aprovacao e rejeicao agora ja vira sinal reutilizavel.",
      },
      business: {
        spend30d,
        closedRevenue30d,
        pipelineValue,
        weightedPipelineValue,
        conversionRate,
        ticketMedio,
        roiMultiple,
        projectedRevenue30d,
        projectedMarginPct,
        summary: businessSummary,
      },
      collective: {
        niche,
        peers: nicheInsight?.nWorkspaces ?? 0,
        position: workspacePosition
          ? `${labelFromPosition(workspacePosition.posicaoCpl)} em CPL e ${labelFromPosition(workspacePosition.posicaoRoas)} em ROAS`
          : "comparativo em formacao",
        marketTrend: nicheInsight?.marketTrend ?? null,
        topPattern: nicheInsight?.topPattern ?? null,
        trendNote: nicheInsight?.trendNote ?? null,
        insight:
          workspacePosition?.insight ??
          nicheInsight?.trendNote ??
          "Assim que o nicho acumular dados suficientes, a rede passa a mostrar o que os melhores estao fazendo diferente.",
      },
      forecast,
      dna: dna
        ? {
            bestFormats: uniqueStrings((dna.best_formats ?? []).map((item) => item?.format)),
            keyLearnings: uniqueStrings(
              (dna.key_learnings ?? []).map((item) =>
                typeof item === "string" ? item : item?.learning ?? null
              )
            ).slice(0, 4),
            goldenAudience: dna.golden_audience,
            confidenceScore: Math.round(toNumber(dna.confidence_score) * 100),
          }
        : null,
    };
  }

  async getClientSnapshot(params: {
    clientId: string;
    userId: string;
    workspaceId: string;
  }): Promise<ClientStrategicSnapshot> {
    const { clientId, userId, workspaceId } = params;
    const today = new Date();
    const startToday = new Date(today);
    startToday.setHours(0, 0, 0, 0);
    const previousWindowStart = new Date(startToday);
    previousWindowStart.setDate(previousWindowStart.getDate() - 7);
    const previousWindowEnd = new Date(today);
    previousWindowEnd.setDate(previousWindowEnd.getDate() - 7);
    const since30d = new Date(today);
    since30d.setDate(since30d.getDate() - 30);

    const [workspaceSnapshot, clientLeadsRes, snapshot30dRes, todaySnapRes, previousSnapRes] = await Promise.all([
      this.getWorkspaceSnapshot({ workspaceId, userId }),
      this.db
        .from("crm_leads")
        .select("estagio, valor_fechado, campanha_nome, created_at, updated_at")
        .eq("user_id", userId)
        .eq("cliente_id", clientId)
        .gte("created_at", since30d.toISOString()),
      this.db
        .from("campaign_snapshots_daily")
        .select("spend, revenue, leads, cpl, roas, snapshot_date")
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId)
        .gte("snapshot_date", since30d.toISOString().slice(0, 10)),
      this.db
        .from("campaign_snapshots_daily")
        .select("spend, revenue, leads, cpl, roas, snapshot_date")
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId)
        .eq("snapshot_date", startToday.toISOString().slice(0, 10)),
      this.db
        .from("campaign_snapshots_daily")
        .select("spend, revenue, leads, cpl, roas, snapshot_date")
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId)
        .eq("snapshot_date", previousWindowStart.toISOString().slice(0, 10)),
    ]);

    const clientLeads = (clientLeadsRes.data ?? []) as LeadRow[];
    const clientSnapshots = (snapshot30dRes.data ?? []) as SnapshotRow[];
    const todaySnapshots = (todaySnapRes.data ?? []) as SnapshotRow[];
    const previousSnapshots = (previousSnapRes.data ?? []) as SnapshotRow[];

    const todayLeadsRows = clientLeads.filter((row) => new Date(row.created_at) >= startToday);
    const previousLeadsRows = clientLeads.filter((row) => {
      const created = new Date(row.created_at);
      return created >= previousWindowStart && created <= previousWindowEnd;
    });

    const todayRevenue = todayLeadsRows
      .filter((row) => row.estagio === "fechado")
      .reduce((total, row) => total + toNumber(row.valor_fechado), 0);
    const previousRevenue = previousLeadsRows
      .filter((row) => row.estagio === "fechado")
      .reduce((total, row) => total + toNumber(row.valor_fechado), 0);

    const todayLeads = todayLeadsRows.length;
    const previousLeads = previousLeadsRows.length;
    const todaySpend = sum(todaySnapshots.map((row) => row.spend));
    const previousSpend = sum(previousSnapshots.map((row) => row.spend));

    const closedRevenue30d = clientLeads
      .filter((row) => row.estagio === "fechado")
      .reduce((total, row) => total + toNumber(row.valor_fechado), 0);
    const pipelineValue = clientLeads.reduce((total, row) => total + toNumber(row.valor_fechado), 0);
    const weightedPipelineValue = clientLeads.reduce(
      (total, row) => total + toNumber(row.valor_fechado) * stageWeight(row.estagio),
      0
    );
    const spend30d = sum(clientSnapshots.map((row) => row.spend));
    const closedCount = clientLeads.filter((row) => row.estagio === "fechado").length;
    const conversionRate = clientLeads.length ? Math.round((closedCount / clientLeads.length) * 100) : 0;
    const ticketMedio = closedCount ? closedRevenue30d / closedCount : 0;
    const roiMultiple = spend30d > 0 && closedRevenue30d > 0 ? closedRevenue30d / spend30d : null;
    const projectedRevenue30d = Math.max(
      closedRevenue30d,
      Math.round(closedRevenue30d + weightedPipelineValue * 0.35)
    );
    const projectedMarginPct =
      projectedRevenue30d > 0 ? Math.round(((projectedRevenue30d - spend30d) / projectedRevenue30d) * 100) : null;

    const liveSummary =
      todayLeads > previousLeads
        ? `Hoje ja entraram ${todayLeads} leads. Na mesma janela da semana passada eram ${previousLeads}.`
        : todayRevenue > previousRevenue
          ? `Hoje o faturamento fechado ja bateu R$ ${todayRevenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}, acima da semana passada.`
          : `Hoje o portal registrou ${todayLeads} leads e R$ ${todaySpend.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} investidos ate aqui.`;

    return {
      liveRoi: {
        todaySpend,
        previousSpend,
        todayLeads,
        previousLeads,
        todayRevenue,
        previousRevenue,
        leadsChange: pctChange(todayLeads, previousLeads),
        revenueChange: pctChange(todayRevenue, previousRevenue),
        summary: liveSummary,
      },
      business: {
        spend30d,
        closedRevenue30d,
        pipelineValue,
        weightedPipelineValue,
        conversionRate,
        ticketMedio,
        roiMultiple,
        projectedRevenue30d,
        projectedMarginPct,
        summary:
          closedRevenue30d > 0
            ? `Nos ultimos 30 dias o investimento de trafego sustentou R$ ${closedRevenue30d.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} em vendas fechadas.`
            : "O portal ja acompanha a operacao, e o proximo passo e marcar mais propostas e fechamentos para mostrar ROI real ao vivo.",
      },
      collective: workspaceSnapshot.collective,
      dna: workspaceSnapshot.dna,
    };
  }

  private buildForecast(
    latestPreflight: PreflightRow,
    conversionRate: number,
    ticketMedio: number
  ): WorkspaceStrategicSnapshot["forecast"] {
    const estimatedCplMin = toNumber(latestPreflight.estimated_cpl_min);
    const estimatedCplMax = toNumber(latestPreflight.estimated_cpl_max);
    const budget = toNumber(latestPreflight.input_snapshot?.orcamentoDiario) * 7;
    const estimatedLeadsMin =
      budget > 0 && estimatedCplMax > 0 ? Math.floor(budget / estimatedCplMax) : null;
    const estimatedLeadsMax =
      budget > 0 && estimatedCplMin > 0 ? Math.floor(budget / estimatedCplMin) : null;
    const estimatedLeads7d =
      estimatedLeadsMin !== null && estimatedLeadsMax !== null
        ? Math.round((estimatedLeadsMin + estimatedLeadsMax) / 2)
        : latestPreflight.input_snapshot?.metaLeads
          ? toNumber(latestPreflight.input_snapshot.metaLeads)
          : null;

    const estimatedRevenue7d =
      estimatedLeads7d && ticketMedio > 0 && conversionRate > 0
        ? Math.round(estimatedLeads7d * (conversionRate / 100) * ticketMedio)
        : null;

    const recommendation =
      latestPreflight.risks?.[0]?.recommendation ??
      latestPreflight.risks?.[0]?.label ??
      null;

    const confidenceLabel =
      latestPreflight.score >= 85
        ? "alta confianca"
        : latestPreflight.score >= 70
          ? "confianca moderada"
          : "exige validacao";

    return {
      campaignName: latestPreflight.campaign_name,
      score: latestPreflight.score,
      confidenceLabel,
      estimatedLeads7d,
      estimatedRevenue7d,
      estimatedCplRange:
        estimatedCplMin > 0 && estimatedCplMax > 0 ? [estimatedCplMin, estimatedCplMax] : null,
      estimatedRoas: toNumber(latestPreflight.estimated_roas) || null,
      recommendation,
      createdAt: latestPreflight.created_at,
    };
  }

  private buildDraftForecast(
    drafts: DraftCampaignRow[],
    conversionRate: number,
    ticketMedio: number
  ): WorkspaceStrategicSnapshot["forecast"] {
    const normalized = drafts.map((draft) => {
      const snapshot = draft.forecast_snapshot ?? {};
      const cplRange = snapshot.estimatedCplRange ?? null;
      const estimatedCplMin =
        toNumber(cplRange?.[0]) || toNumber(draft.preflight_result?.estimatedCplMin);
      const estimatedCplMax =
        toNumber(cplRange?.[1]) || toNumber(draft.preflight_result?.estimatedCplMax);
      const budget7d = toNumber(draft.draft_payload?.orcamentoDiario || draft.orcamento) * 7;
      const leadsFromSnapshot = toNumber(snapshot.estimatedLeads7d);
      const estimatedLeads7d =
        leadsFromSnapshot > 0
          ? leadsFromSnapshot
          : budget7d > 0 && estimatedCplMin > 0 && estimatedCplMax > 0
            ? Math.round((Math.floor(budget7d / estimatedCplMax) + Math.floor(budget7d / estimatedCplMin)) / 2)
            : toNumber(draft.draft_payload?.metaLeads) || null;
      const revenueFromSnapshot = toNumber(snapshot.estimatedRevenue7d);
      const estimatedRevenue7d =
        revenueFromSnapshot > 0
          ? revenueFromSnapshot
          : estimatedLeads7d && ticketMedio > 0 && conversionRate > 0
            ? Math.round(estimatedLeads7d * (conversionRate / 100) * ticketMedio)
            : null;

      return {
        id: draft.id,
        name: draft.nome_campanha ?? "Campanha em rascunho",
        score: draft.preflight_score ? toNumber(draft.preflight_score) : null,
        ready: draft.preflight_result?.readyToLaunch ?? toNumber(draft.preflight_score) >= 60,
        estimatedCplMin,
        estimatedCplMax,
        estimatedRoas: toNumber(snapshot.estimatedRoas) || toNumber(draft.preflight_result?.estimatedRoas) || null,
        estimatedLeads7d,
        estimatedRevenue7d,
        budget7d,
        recommendation:
          snapshot.recommendation ??
          draft.preflight_result?.topRecommendation ??
          null,
        createdAt: draft.data_atualizacao ?? draft.created_at,
      };
    });

    const estimatedLeads7d = normalized.reduce((total, draft) => total + toNumber(draft.estimatedLeads7d), 0) || null;
    const estimatedRevenue7d = normalized.reduce((total, draft) => total + toNumber(draft.estimatedRevenue7d), 0) || null;
    const budget7d = normalized.reduce((total, draft) => total + draft.budget7d, 0);
    const scores = normalized.map((draft) => draft.score).filter((score): score is number => score !== null);
    const avgScore = scores.length
      ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
      : null;
    const cplMinValues = normalized.map((draft) => draft.estimatedCplMin).filter((value) => value > 0);
    const cplMaxValues = normalized.map((draft) => draft.estimatedCplMax).filter((value) => value > 0);
    const readyDraftCount = normalized.filter((draft) => draft.ready).length;
    const createdAt = normalized
      .map((draft) => draft.createdAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    return {
      campaignName:
        normalized.length === 1
          ? normalized[0].name
          : `${normalized.length} campanhas em rascunho`,
      score: avgScore,
      confidenceLabel:
        readyDraftCount === normalized.length
          ? "rascunhos prontos"
          : readyDraftCount > 0
            ? "parte pronta"
            : "exige ajustes",
      estimatedLeads7d,
      estimatedRevenue7d,
      estimatedCplRange:
        cplMinValues.length && cplMaxValues.length
          ? [Math.min(...cplMinValues), Math.max(...cplMaxValues)]
          : null,
      estimatedRoas: avg(normalized.map((draft) => draft.estimatedRoas)) ?? null,
      recommendation:
        readyDraftCount === normalized.length
          ? "Rascunhos avaliados. Aprove e publique apenas quando criativo, publico e verba estiverem fechados."
          : normalized.find((draft) => draft.recommendation)?.recommendation ?? "Ainda ha rascunhos que precisam de ajuste antes de publicar.",
      createdAt,
      draftCount: normalized.length,
      readyDraftCount,
      budget7d,
      campaigns: normalized.map((draft) => ({
        id: draft.id,
        name: draft.name,
        score: draft.score,
        estimatedLeads7d: draft.estimatedLeads7d,
      })),
    };
  }
}

export const strategicIntelligenceService = new StrategicIntelligenceService();
