// src/services/training-data-service.ts
// Coleta estruturada de dados para fine-tuning futuro do modelo Erizon.
// Cada decisão tomada (aprovada, rejeitada, executada) + seu outcome vira um exemplo de treino.
// Formato: compatível com OpenAI fine-tuning JSONL e Anthropic Constitutional AI.

export interface TrainingExample {
  id: string;
  workspace_id: string;
  source: "decision" | "agente_feedback" | "prediction_outcome" | "manual_label";
  quality: "gold" | "silver" | "bronze";  // gold=humano validou, silver=outcome confirmado, bronze=gerado

  // Input do modelo (contexto da decisão)
  system_prompt: string;
  user_message: string;

  // Output esperado (o que o modelo deveria responder)
  ideal_response: string;

  // Metadados de rastreabilidade
  decision_id?: string;
  campaign_id?: string;
  action_type?: string;
  prediction_metric?: string;
  predicted_value?: number;
  actual_value?: number;
  outcome?: "improved" | "degraded" | "neutral" | "pending";
  human_validated: boolean;
  validator_id?: string;
  created_at: string;
}

export interface TrainingStats {
  total: number;
  by_source: Record<string, number>;
  by_quality: Record<string, number>;
  by_action_type: Record<string, number>;
  gold_by_action_type: Record<string, number>;
  action_distribution: Record<string, number>;
  gold_action_distribution: Record<string, number>;
  diversity: {
    distinct_action_types: number;
    largest_action_share: number;
    balanced_enough: boolean;
  };
  fine_tuning_readiness: {
    offline_eval_ready: boolean;
    training_ready: boolean;
    shadow_ready: boolean;
    production_rollout_ready: boolean;
    next_milestone: string;
  };
  gold_count: number;
  silver_count: number;
  exportable: number;  // gold + silver
}

type TrainingStatsRow = {
  source: string;
  quality: string;
  action_type: string | null;
};

export class TrainingDataService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private db: any) {}

  // ── Registra exemplo a partir de uma decisão aprovada + executada ──────────
  async recordFromDecision(params: {
    workspaceId: string;
    decisionId: string;
    campaignId: string;
    actionType: string;
    rationale: string;
    campaignContext: Record<string, unknown>;
    executionSuccess: boolean;
    outcome?: "improved" | "degraded" | "neutral";
    validatorId?: string;
    humanValidated?: boolean;
  }): Promise<void> {
    const systemPrompt = this.buildDecisionSystemPrompt();
    const userMessage = this.buildDecisionUserMessage(params.campaignContext, params.actionType);
    const idealResponse = this.buildDecisionIdealResponse(
      params.actionType,
      params.rationale,
      params.executionSuccess
    );

    const quality: TrainingExample["quality"] = params.humanValidated || params.outcome === "improved"
      ? "gold"
      : params.outcome
        ? "silver"
        : "bronze";

    await this.upsertExample({
      workspace_id: params.workspaceId,
      source: "decision",
      quality,
      system_prompt: systemPrompt,
      user_message: userMessage,
      ideal_response: idealResponse,
      decision_id: params.decisionId,
      campaign_id: params.campaignId,
      action_type: params.actionType,
      outcome: params.outcome,
      human_validated: params.humanValidated ?? false,
      validator_id: params.validatorId,
    });
  }

  // ── Registra exemplo a partir de feedback do agente ───────────────────────
  async recordFromAgenteFeedback(params: {
    workspaceId: string;
    userMessage: string;
    agentResponse: string;
    feedback: "positive" | "negative" | "edited";
    editedResponse?: string;
  }): Promise<void> {
    const quality: TrainingExample["quality"] =
      params.feedback === "positive" ? "silver" :
      params.feedback === "edited" ? "gold" : "bronze";

    // Se editado pelo humano, o ideal é a versão editada
    const idealResponse = params.feedback === "edited" && params.editedResponse
      ? params.editedResponse
      : params.agentResponse;

    // Só salva positivos e editados (negativos descartam o exemplo)
    if (params.feedback === "negative") return;

    await this.upsertExample({
      workspace_id: params.workspaceId,
      source: "agente_feedback",
      quality,
      system_prompt: this.buildAgenteSystemPrompt(),
      user_message: params.userMessage,
      ideal_response: idealResponse,
      human_validated: params.feedback === "edited",
    });
  }

  // ── Registra exemplo a partir de predição com outcome confirmado ──────────
  async recordFromPredictionOutcome(params: {
    workspaceId: string;
    campaignId: string;
    predictedMetric: string;
    predictedValue: number;
    actualValue: number;
    context: Record<string, unknown>;
  }): Promise<void> {
    const errorPct = Math.abs((params.predictedValue - params.actualValue) / (params.actualValue || 1)) * 100;
    const quality: TrainingExample["quality"] = errorPct < 10 ? "gold" : errorPct < 25 ? "silver" : "bronze";

    // Gera exemplo de treino mostrando contexto → predição correta
    const userMessage = `Dado o contexto da campanha:\n${JSON.stringify(params.context, null, 2)}\n\nPreveja o ${params.predictedMetric} para os próximos 7 dias.`;
    const idealResponse = `Com base nos padrões históricos desta conta, o ${params.predictedMetric} esperado é ${params.actualValue.toFixed(2)}. Confiança: ${quality === "gold" ? "alta" : "média"}.`;

    await this.upsertExample({
      workspace_id: params.workspaceId,
      source: "prediction_outcome",
      quality,
      system_prompt: this.buildPredictionSystemPrompt(),
      user_message: userMessage,
      ideal_response: idealResponse,
      campaign_id: params.campaignId,
      prediction_metric: params.predictedMetric,
      predicted_value: params.predictedValue,
      actual_value: params.actualValue,
      human_validated: false,
    });
  }

  // ── Exporta exemplos no formato JSONL para fine-tuning ────────────────────
  async exportJSONL(workspaceId?: string, minQuality: "gold" | "silver" | "bronze" = "silver"): Promise<string> {
    const qualityOrder = { gold: 3, silver: 2, bronze: 1 };
    const minScore = qualityOrder[minQuality];

    let query = this.db
      .from("training_examples")
      .select("system_prompt, user_message, ideal_response, quality")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (workspaceId) query = query.eq("workspace_id", workspaceId);

    const { data } = await query;
    if (!data?.length) return "";

    const filtered = (data as TrainingExample[]).filter(
      ex => qualityOrder[ex.quality] >= minScore
    );

    // Formato OpenAI fine-tuning JSONL
    return filtered.map(ex => JSON.stringify({
      messages: [
        { role: "system", content: ex.system_prompt },
        { role: "user", content: ex.user_message },
        { role: "assistant", content: ex.ideal_response },
      ]
    })).join("\n");
  }

  // ── Stats de coleta ───────────────────────────────────────────────────────
  async getStats(workspaceId?: string): Promise<TrainingStats> {
    let query = this.db.from("training_examples").select("source, quality, action_type");
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    const { data } = await query;
    if (!data) return this.emptyStats();

    const by_source: Record<string, number> = {};
    const by_quality: Record<string, number> = {};
    const by_action_type: Record<string, number> = {};
    const gold_by_action_type: Record<string, number> = {};

    for (const row of data as TrainingStatsRow[]) {
      by_source[row.source] = (by_source[row.source] ?? 0) + 1;
      by_quality[row.quality] = (by_quality[row.quality] ?? 0) + 1;

      if (row.source === "decision") {
        const actionType = row.action_type ?? "unknown";
        by_action_type[actionType] = (by_action_type[actionType] ?? 0) + 1;

        if (row.quality === "gold") {
          gold_by_action_type[actionType] = (gold_by_action_type[actionType] ?? 0) + 1;
        }
      }
    }

    const goldCount = by_quality.gold ?? 0;
    const silverCount = by_quality.silver ?? 0;
    const actionDistribution = this.toPercentDistribution(by_action_type);
    const goldActionDistribution = this.toPercentDistribution(gold_by_action_type);
    const largestGoldShare = Math.max(0, ...Object.values(goldActionDistribution));
    const distinctGoldActions = Object.keys(gold_by_action_type).length;
    const balancedEnough = goldCount >= 200 && distinctGoldActions >= 3 && largestGoldShare <= 0.65;

    return {
      total: data.length,
      by_source,
      by_quality,
      by_action_type,
      gold_by_action_type,
      action_distribution: actionDistribution,
      gold_action_distribution: goldActionDistribution,
      diversity: {
        distinct_action_types: distinctGoldActions,
        largest_action_share: largestGoldShare,
        balanced_enough: balancedEnough,
      },
      fine_tuning_readiness: {
        offline_eval_ready: goldCount >= 200 && balancedEnough,
        training_ready: goldCount >= 500 && balancedEnough,
        shadow_ready: goldCount >= 1000 && balancedEnough,
        production_rollout_ready: goldCount >= 1000 && balancedEnough,
        next_milestone: this.nextFineTuningMilestone(goldCount, balancedEnough, distinctGoldActions, largestGoldShare),
      },
      gold_count: goldCount,
      silver_count: silverCount,
      exportable: goldCount + silverCount,
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────
  private async upsertExample(ex: Omit<TrainingExample, "id" | "created_at">) {
    await this.db.from("training_examples").insert({
      ...ex,
      created_at: new Date().toISOString(),
    });
  }

  private emptyStats(): TrainingStats {
    return {
      total: 0,
      by_source: {},
      by_quality: {},
      by_action_type: {},
      gold_by_action_type: {},
      action_distribution: {},
      gold_action_distribution: {},
      diversity: {
        distinct_action_types: 0,
        largest_action_share: 0,
        balanced_enough: false,
      },
      fine_tuning_readiness: {
        offline_eval_ready: false,
        training_ready: false,
        shadow_ready: false,
        production_rollout_ready: false,
        next_milestone: "Coletar 200 exemplos gold com pelo menos 3 tipos de ação.",
      },
      gold_count: 0,
      silver_count: 0,
      exportable: 0,
    };
  }

  private toPercentDistribution(counts: Record<string, number>): Record<string, number> {
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    if (total === 0) return {};

    return Object.fromEntries(
      Object.entries(counts).map(([key, value]) => [key, Number((value / total).toFixed(4))])
    );
  }

  private nextFineTuningMilestone(
    goldCount: number,
    balancedEnough: boolean,
    distinctGoldActions: number,
    largestGoldShare: number
  ): string {
    if (distinctGoldActions < 3) {
      return "Aumentar diversidade: coletar exemplos gold em pelo menos 3 tipos de ação.";
    }

    if (largestGoldShare > 0.65) {
      return "Rebalancear exemplos gold: nenhum tipo de ação deve passar de 65% do conjunto.";
    }

    if (!balancedEnough || goldCount < 200) {
      return `Coletar ${Math.max(0, 200 - goldCount)} exemplos gold para iniciar avaliação offline.`;
    }

    if (goldCount < 500) {
      return `Coletar ${500 - goldCount} exemplos gold para treinar o primeiro candidato.`;
    }

    if (goldCount < 1000) {
      return `Coletar ${1000 - goldCount} exemplos gold para liberar shadow mode.`;
    }

    return "Pronto para shadow mode com holdout fixo e rollout progressivo.";
  }

  private buildDecisionSystemPrompt(): string {
    return `Você é o motor de decisão do Erizon AI, especialista em gestão de tráfego pago. Analise métricas de campanhas e tome decisões precisas de otimização com impacto financeiro claro. Sempre justifique com números.`;
  }

  private buildAgenteSystemPrompt(): string {
    return `Você é o copiloto de marketing do Erizon AI. Ajude gestores de tráfego a entender performance de campanhas, identificar oportunidades e tomar decisões baseadas em dados reais da conta.`;
  }

  private buildPredictionSystemPrompt(): string {
    return `Você é o motor preditivo do Erizon AI. Com base no histórico de performance de campanhas, faça previsões calibradas de métricas para os próximos 7 dias. Seja preciso e indique o nível de confiança.`;
  }

  private buildDecisionUserMessage(context: Record<string, unknown>, actionType: string): string {
    return `Contexto da campanha:\n${JSON.stringify(context, null, 2)}\n\nQual ação você recomenda? Tipo esperado: ${actionType}`;
  }

  private buildDecisionIdealResponse(actionType: string, rationale: string, success: boolean): string {
    const actionLabel: Record<string, string> = {
      pause: "Pausar campanha",
      resume: "Retomar campanha",
      scale_budget: "Escalar orçamento",
      reduce_budget: "Reduzir orçamento",
      alert: "Emitir alerta",
    };
    const label = actionLabel[actionType] ?? actionType;
    const status = success ? "Ação executada com sucesso no Meta Ads." : "Ação recomendada para aprovação manual.";
    return `**${label}**\n\n${rationale}\n\n${status}`;
  }
}
