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
  gold_count: number;
  silver_count: number;
  exportable: number;  // gold + silver
}

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
  }): Promise<void> {
    const systemPrompt = this.buildDecisionSystemPrompt();
    const userMessage = this.buildDecisionUserMessage(params.campaignContext, params.actionType);
    const idealResponse = this.buildDecisionIdealResponse(
      params.actionType,
      params.rationale,
      params.executionSuccess
    );

    const quality: TrainingExample["quality"] = params.outcome
      ? params.outcome === "improved" ? "gold" : "silver"
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
      human_validated: false,
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
    let query = this.db.from("training_examples").select("source, quality");
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    const { data } = await query;
    if (!data) return { total: 0, by_source: {}, by_quality: {}, gold_count: 0, silver_count: 0, exportable: 0 };

    const by_source: Record<string, number> = {};
    const by_quality: Record<string, number> = {};
    for (const row of data as { source: string; quality: string }[]) {
      by_source[row.source] = (by_source[row.source] ?? 0) + 1;
      by_quality[row.quality] = (by_quality[row.quality] ?? 0) + 1;
    }

    return {
      total: data.length,
      by_source,
      by_quality,
      gold_count: by_quality.gold ?? 0,
      silver_count: by_quality.silver ?? 0,
      exportable: (by_quality.gold ?? 0) + (by_quality.silver ?? 0),
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────
  private async upsertExample(ex: Omit<TrainingExample, "id" | "created_at">) {
    await this.db.from("training_examples").insert({
      ...ex,
      created_at: new Date().toISOString(),
    });
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
