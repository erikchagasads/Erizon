import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/observability/logger";

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

export interface ExplainableDecision {
  summary: string;
  factors: Array<{
    name: string;
    impact: 'high' | 'medium' | 'low';
    contribution_pct: number;
    metric_before?: number;
    metric_after?: number;
  }>;
  alternatives: Array<{
    action: string;
    score: number;
    why_not_chosen?: string;
  }>;
  references?: {
    historical_similar_cases: number;
    success_rate_pct: number;
  };
}

export class ExplainabilityService {
  /**
   * Gerar explicação legível para uma decisão
   */
  async explainDecision(params: {
    action: string;
    campaign_name: string;
    factors: Array<{ name: string; score: number }>;
    alternatives?: Array<{ action: string; score: number }>;
    confidence: number;
  }): Promise<ExplainableDecision> {
    const factors = this.identifyFactors(params.factors);
    try {

      // 2. Gerar explicação em linguagem natural
      const explanation =
        await this.generateNaturalLanguageExplanation({
          action: params.action,
          campaign_name: params.campaign_name,
          factors,
          alternatives: params.alternatives,
          confidence: params.confidence,
        });

      logger.info('Decision explained', {
        campaign: params.campaign_name,
        action: params.action,
        summary: explanation.summary.substring(0, 100),
      });

      return {
        summary: explanation.summary,
        factors,
        alternatives: explanation.alternatives || [],
        references: {
          historical_similar_cases: 0,
          success_rate_pct: 0,
        },
      };
    } catch (error) {
      logger.error('explainDecision error', { error, params });

      // Fallback explanation
      return {
        summary: `Campanha "${params.campaign_name}" foi recomendada para ação "${params.action}"`,
        factors,
        alternatives: params.alternatives || [],
        references: {
          historical_similar_cases: 0,
          success_rate_pct: 0,
        },
      };
    }
  }

  /**
   * Identificar quais fatores levaram à decisão
   */
  private identifyFactors(
    anomaly_factors: Array<{ name: string; score: number }>
  ): ExplainableDecision['factors'] {
    const factors: ExplainableDecision['factors'] = [];

    if (!anomaly_factors || anomaly_factors.length === 0) {
      return factors;
    }

    // Calcular contribuição % de cada fator
    const totalScore = anomaly_factors.reduce((sum, f) => sum + f.score, 0);

    for (const factor of anomaly_factors) {
      const contribution = (factor.score / totalScore) * 100;

      factors.push({
        name: factor.name,
        impact:
          contribution > 40 ? 'high' : contribution > 20 ? 'medium' : 'low',
        contribution_pct: Number(contribution.toFixed(1)),
      });
    }

    // Ordenar por contribuição
    return factors.sort((a, b) => b.contribution_pct - a.contribution_pct);
  }

  /**
   * Usar OpenAI/Claude para gerar explicação natural
   */
  private async generateNaturalLanguageExplanation(params: {
    action: string;
    campaign_name: string;
    factors: ExplainableDecision['factors'];
    alternatives?: Array<{ action: string; score: number }>;
    confidence: number;
  }): Promise<{
    summary: string;
    alternatives: ExplainableDecision['alternatives'];
  }> {
    try {
      const prompt = `
Você é um especialista em publicidade digital explicando uma decisão de IA para um marketer brasileiro.

Campanha: ${params.campaign_name}
Ação recomendada: ${params.action}
Confiança: ${(params.confidence * 100).toFixed(0)}%

Fatores que influenciaram:
${params.factors.map((f) => `- ${f.name} (contribuição: ${f.contribution_pct}%)`).join('\n')}

Gere uma explicação em português simples (1-2 frases) que um marketer sem conhecimento técnico entenda.

IMPORTANTE: Responda APENAS em JSON, sem markdown, sem código block.

{
  "summary": "Explicação concisa aqui",
  "alternatives": [
    {"action": "Reduzir orçamento 30%", "why_not_chosen": "Menos seguro que pausar"}
  ]
}
`;

      const response = await getAnthropic().messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0].type === "text"
        ? response.content[0].text
        : "{}";

      // Parse JSON
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        // Se falhar parsing, extrair manualmente
        parsed = {
          summary: `Campanha "${params.campaign_name}" recomendada para "${params.action}"`,
          alternatives: [],
        };
      }

      return {
        summary:
          parsed.summary ||
          `Campanha "${params.campaign_name}" recomendada para "${params.action}"`,
        alternatives: parsed.alternatives || [],
      };
    } catch (error) {
      logger.warn('Anthropic explanation failed, using fallback', { error });

      return {
        summary: `Campanha "${params.campaign_name}" recomendada para "${params.action}" com ${(params.confidence * 100).toFixed(0)}% de confiança`,
        alternatives: params.alternatives || [],
      };
    }
  }
}

export const explainabilityService = new ExplainabilityService();
