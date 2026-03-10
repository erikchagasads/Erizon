
import { appendAutopilotTimeline, evaluateAutopilotRule } from "@/core/autopilot-engine";
import { applyAutopilotGovernance } from "@/core/autopilot-governance";
import { buildCreativeInsights } from "@/core/creative-engine";
import { buildDecisionRecommendations, evaluateCampaignHealth } from "@/core/decision-engine";
import { validateDecisionInputs } from "@/core/decision-validation";
import { buildNetworkInsights } from "@/core/network-intelligence";
import { calculateCampaignEconomics } from "@/core/profit-engine";
import { buildRiskFlags } from "@/core/risk-engine";
import { getIntegrationEnvStatus } from "@/config/env";
import { OperatingSyncPipeline } from "@/ingestion/pipelines/operating-sync-pipeline";
import { MockOperatingRepository } from "@/repositories/mock-operating-repository";
import { SupabaseOperatingRepository } from "@/repositories/supabase-operating-repository";
import { AutomationPreview, DataSourceKind, OperatingSystemView } from "@/types/erizon";

function formatHour(timestamp: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(timestamp));
}

function toDataSource(source?: DataSourceKind): DataSourceKind {
  if (source) return source;
  return getIntegrationEnvStatus().supabase ? "supabase" : "mock";
}

export class OperatingSystemService {
  private readonly mockRepository = new MockOperatingRepository();
  private readonly supabaseRepository = new SupabaseOperatingRepository();

  constructor(private readonly source?: DataSourceKind) {}

  private get repository() {
    const selected = toDataSource(this.source);
    return selected === "supabase" ? this.supabaseRepository : this.mockRepository;
  }

  async runSync(workspaceId: string) {
    const credentials = await this.repository.getCredentials(workspaceId);
    const pipeline = new OperatingSyncPipeline(this.repository);
    return pipeline.run({
      meta: credentials.find((item) => item.provider === "meta_ads"),
      ga4: credentials.find((item) => item.provider === "ga4"),
      commerce: credentials.find((item) => ["shopify", "hotmart", "crm"].includes(item.provider)),
    });
  }

  async getOperatingSystemView(): Promise<OperatingSystemView> {
    const raw = await this.repository.getSnapshot();

    // Garante que todas as propriedades são arrays mesmo com banco zerado
    const snapshot = {
      ...raw,
      campaigns:  Array.isArray(raw.campaigns)  ? raw.campaigns  : [],
      clients:    Array.isArray(raw.clients)     ? raw.clients    : [],
      creatives:  Array.isArray(raw.creatives)   ? raw.creatives  : [],
      benchmarks: Array.isArray(raw.benchmarks)  ? raw.benchmarks : [],
      rules:      Array.isArray(raw.rules)       ? raw.rules      : [],
      timeline:   Array.isArray(raw.timeline)    ? raw.timeline   : [],
    };

    const campaignViews = snapshot.campaigns.flatMap((campaign) => {
      const client = snapshot.clients.find((item) => item.id === campaign.clientId);
      const creative = snapshot.creatives.find((item) => item.id === campaign.currentCreativeId);
      if (!client || !creative) return []; // skip em vez de throw
      const economics = calculateCampaignEconomics(campaign, client);
      const health = evaluateCampaignHealth(campaign, client);

      return {
        id: campaign.id,
        nome: campaign.name,
        cliente: client.name,
        objetivo: campaign.objective,
        plataforma: campaign.channel,
        investimentoHoje: campaign.spendToday,
        receitaHoje: campaign.revenueToday,
        lucroHoje: Number(economics.netProfit.toFixed(0)),
        roas: campaign.roas,
        profitRoas: Number(economics.profitRoas.toFixed(2)),
        ctr: campaign.ctr,
        cpa: campaign.cpa,
        cpm: campaign.cpm,
        frequencia: campaign.frequency,
        conversoes: campaign.conversions,
        status: health.status,
        publico: campaign.audience,
        criativoAtual: creative.name,
      };
    });

    const decisions = buildDecisionRecommendations({
      campaigns: snapshot.campaigns,
      clients: snapshot.clients,
      creatives: snapshot.creatives,
      benchmarks: snapshot.benchmarks,
    }).map((decision) => ({
      id: decision.id,
      tipo: decision.type,
      cliente: decision.clientName,
      campanha: decision.campaignName,
      titulo: decision.title,
      motivo: decision.reason,
      impacto: decision.estimatedImpact,
      confianca: decision.confidence,
      prioridade: decision.priority,
      executar: decision.execution,
    }));

    const riskFlags = buildRiskFlags(snapshot.campaigns, snapshot.clients).map((flag) => ({
      id: flag.id,
      cliente: flag.clientName,
      campanha: flag.campaignName,
      severidade: flag.severity,
      diagnostico: flag.diagnosis,
      causa: flag.cause,
      acao: flag.action,
    }));

    const creativePatterns = buildCreativeInsights(
      Array.isArray(snapshot.creatives) ? snapshot.creatives : [],
      Array.isArray(snapshot.benchmarks) ? snapshot.benchmarks : [],
    ).map((insight) => ({
      id: insight.id,
      nome: insight.name,
      formato: insight.format,
      hook: insight.hook,
      benchmarkCtr: insight.benchmarkCtr,
      benchmarkCpa: insight.benchmarkCpa,
      liftCtr: insight.liftCtr,
      status: insight.status,
    }));

    const networkInsights = buildNetworkInsights({
      clients: snapshot.clients,
      creatives: snapshot.creatives,
      benchmarks: snapshot.benchmarks,
    }).map((item) => ({
      id: item.id,
      nicho: item.niche,
      recorte: item.cut,
      insight: item.insight,
      ganho: item.gain,
    }));

    const automationRules = snapshot.rules.map((rule): AutomationPreview => ({
      id: rule.id,
      nome: rule.name,
      condicao: JSON.stringify(rule.condition),
      acao:
        rule.action.type === "increase_budget"
          ? `Aumentar orçamento em ${rule.action.percentage}%`
          : rule.action.type === "decrease_budget"
            ? `Reduzir orçamento em ${rule.action.percentage}%`
            : rule.action.type === "pause_campaign"
              ? "Pausar campanha"
              : "Solicitar refresh criativo",
      status: rule.enabled ? "Ativa" : "Revisão",
      ultimaExecucao: snapshot.timeline[0]?.timestamp ?? snapshot.generatedAt,
    }));

    const timeline = snapshot.timeline.map((event) => ({
      id: event.id,
      hora: formatHour(event.timestamp),
      ator: event.actor,
      acao: event.action,
      detalhe: event.detail,
    }));

    const statsRaw = campaignViews.reduce(
      (acc, item) => {
        acc.receitaHoje      += item.receitaHoje;
        acc.investimentoHoje += item.investimentoHoje;
        acc.lucroHoje        += item.lucroHoje;
        acc.profitRoasSum    += item.profitRoas;
        return acc;
      },
      { receitaHoje: 0, investimentoHoje: 0, lucroHoje: 0, profitRoasSum: 0 },
    );

    const stats = {
      receitaHoje:      statsRaw.receitaHoje,
      investimentoHoje: statsRaw.investimentoHoje,
      lucroHoje:        statsRaw.lucroHoje,
      profitRoasMedio:  campaignViews.length > 0
        ? Number((statsRaw.profitRoasSum / campaignViews.length).toFixed(2))
        : 0,
      decisoesCriticas: decisions.filter((d) => d.prioridade === "Crítica").length,
    };

    const portalClient = snapshot.clients[0];

    // Com banco zerado não há clientes — retorna portalSummary vazio
    if (!portalClient) {
      return {
        stats,
        campaigns: campaignViews,
        decisions,
        riskFlags,
        creativePatterns,
        networkInsights,
        automationRules,
        timeline,
        portalSummary: {
          cliente: "—",
          investimentoMes: 0,
          receitaMes: 0,
          lucroMes: 0,
          profitRoas: 0,
          mensagem: "Nenhum cliente cadastrado ainda. Conecte sua conta Meta Ads em Configurações.",
        },
      };
    }

    const portalCampaigns = campaignViews.filter((item) => item.cliente === portalClient.name);

    // ── portalSummary com dados reais dos últimos 30 dias ─────────────────────
    // Busca todos os snapshots do cliente nos últimos 30 dias para somar
    // investimento e receita acumulados — evita a estimativa ingênua de *30.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const portalSnapshots30d = snapshot.campaigns.filter(
      (c) => {
        const client = snapshot.clients.find((cl) => cl.id === c.clientId);
        return client?.name === portalClient.name;
      }
    );

    // Usa spendToday/revenueToday acumulados como proxy.
    // Se o repositório tiver histórico de profit_snapshots, soma-os.
    const profitSnapshots = (snapshot as typeof snapshot & { profitSnapshots?: Array<{ clientId: string; investimento: number; receita: number; lucro: number; snapshotDate: string }> }).profitSnapshots ?? [];
    const clientProfitHistory = profitSnapshots.filter(
      (ps) => {
        const client = snapshot.clients.find((cl) => cl.id === ps.clientId);
        return client?.name === portalClient.name && ps.snapshotDate >= thirtyDaysAgo;
      }
    );

    let investimentoMes: number;
    let receitaMes: number;
    let lucroMes: number;

    if (clientProfitHistory.length > 0) {
      // Dados históricos reais disponíveis
      investimentoMes = clientProfitHistory.reduce((acc, ps) => acc + (ps.investimento ?? 0), 0);
      receitaMes = clientProfitHistory.reduce((acc, ps) => acc + (ps.receita ?? 0), 0);
      lucroMes = clientProfitHistory.reduce((acc, ps) => acc + (ps.lucro ?? 0), 0);
    } else {
      // Fallback: soma os valores acumulados dos snapshots atuais (spend/revenue são totais do período configurado)
      investimentoMes = portalSnapshots30d.reduce((acc, c) => acc + c.spendToday, 0);
      receitaMes = portalSnapshots30d.reduce((acc, c) => acc + c.revenueToday, 0);
      const portalClients = snapshot.clients.filter((cl) => cl.name === portalClient.name);
      lucroMes = portalSnapshots30d.reduce((acc, c) => {
        const cl = portalClients.find((x) => x.id === c.clientId);
        if (!cl) return acc;
        const econ = calculateCampaignEconomics(c, cl);
        return acc + econ.netProfit;
      }, 0);
    }

    const profitRoasPortal = investimentoMes > 0 ? receitaMes / investimentoMes : 0;

    const decisionCount = decisions.filter(
      (d) => d.cliente === portalClient.name
    ).length;

    const portalSummary = {
      cliente: portalClient.name,
      investimentoMes: Number(investimentoMes.toFixed(2)),
      receitaMes: Number(receitaMes.toFixed(2)),
      lucroMes: Number(lucroMes.toFixed(2)),
      profitRoas: Number(profitRoasPortal.toFixed(2)),
      mensagem: `A Erizon manteve a operação em modo saudável com lucro líquido ${lucroMes >= 0 ? "positivo" : "negativo"} e ${decisionCount} decisão(ões) registrada(s) neste período.`,
      periodoReferencia: "30d",
      fonte: clientProfitHistory.length > 0 ? "historico_real" : "snapshot_acumulado",
    };

    return {
      stats: {
        ...stats,
        profitRoasMedio:
          campaignViews.reduce((acc, item) => acc + item.profitRoas, 0) / Math.max(campaignViews.length, 1),
        decisoesCriticas: decisions.filter((item) => item.prioridade === "Crítica").length,
      },
      campaigns: campaignViews,
      decisions,
      riskFlags,
      creativePatterns,
      networkInsights,
      automationRules,
      timeline,
      portalSummary,
    };
  }

  async getArchitectureSummary() {
    const env = getIntegrationEnvStatus();
    return {
      architecture: {
        source: toDataSource(this.source),
        layers: [
          "connectors",
          "ingestion",
          "repositories",
          "core",
          "services",
          "workers",
          "api",
        ],
        env,
      },
    };
  }

  async getDecisionValidationSummary() {
    const raw = await this.repository.getSnapshot();
    const snapshot = {
      ...raw,
      campaigns: Array.isArray(raw.campaigns) ? raw.campaigns : [],
      clients:   Array.isArray(raw.clients)   ? raw.clients   : [],
    };
    return snapshot.campaigns.map((campaign) => {
      const client = snapshot.clients.find((item) => item.id === campaign.clientId);
      if (!client) return null;
      return validateDecisionInputs({ campaign, client });
    }).filter(Boolean);
  }

  async getAutopilotGovernanceSummary(workspaceId = "ws-erizon") {
    const raw = await this.repository.getSnapshot();
    const snapshot = {
      ...raw,
      campaigns:  Array.isArray(raw.campaigns)  ? raw.campaigns  : [],
      clients:    Array.isArray(raw.clients)     ? raw.clients    : [],
      creatives:  Array.isArray(raw.creatives)   ? raw.creatives  : [],
      rules:      Array.isArray(raw.rules)       ? raw.rules      : [],
    };
    const guardrail = {
      id: "guardrail-default",
      workspaceId,
      name: "Default",
      dailyBudgetIncreaseLimitPct: 20,
      pauseRequiresApproval: true,
      simulationOnly: !getIntegrationEnvStatus().autopilotLiveMode,
      allowedActions: [...["increase_budget", "decrease_budget", "pause_campaign", "request_creative_refresh"]] as Array<"increase_budget" | "decrease_budget" | "pause_campaign" | "request_creative_refresh">,
    };

    const evaluations = snapshot.rules.flatMap((rule) => {
      return snapshot.campaigns.map((campaign) => {
        const client = snapshot.clients.find((item) => item.id === campaign.clientId);
        const creative = snapshot.creatives.find((item) => item.id === campaign.currentCreativeId);
        if (!client) return null;
        const economics = calculateCampaignEconomics(campaign, client);
        const evaluation = evaluateAutopilotRule({ rule, campaign, economics, creative });
        return applyAutopilotGovernance({
          workspaceId,
          guardrail,
          evaluation,
          campaign,
          liveMode: getIntegrationEnvStatus().autopilotLiveMode,
        });
      });
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    for (const item of evaluations) {
      await this.repository.saveAutopilotLog(item.executionLog);
    }

    return evaluations;
  }
}
