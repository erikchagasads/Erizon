import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { TrainingDataService } from "./training-data-service";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface NeuroScoreInput {
  userId: string;
  workspaceId: string;
  clienteId?: string;
  campanhaId?: string;
  imageBase64: string;
  imageMimeType: "image/jpeg" | "image/png" | "image/webp";
  imageHash: string;
  nicho: string;
  objetivo: "conversao" | "trafego" | "engajamento" | "leads";
  benchmarkCtrP50?: number;
  benchmarkCplP50?: number;
  // [GANCHO VÍDEO] — campos reservados, nunca preenchidos pelo fluxo atual.
  // Quando análise de vídeo for implementada, um método analyzeVideo() separado
  // extrairá frames, chamará analyze() múltiplas vezes e preencherá estes campos.
  _videoUrl?: never;
  _videoDurationS?: never;
}

export interface NeuroScoreResult {
  analysisId: string;
  neuroScore: number;
  atencaoScore: number;
  emocaoScore: number;
  ctaScore: number;
  hookScore: number;
  fadigaScore: number;
  emocaoDominante: string;
  zonasAtencao: string[];
  pontosFortes: string[];
  pontosFracos: string[];
  recomendacoes: {
    prioridade: "alta" | "media" | "baixa";
    acao: string;
    impactoEstimado: string;
  }[];
  reasoning: string;
}

export class NeuroScoreService {
  private async getLearnedPatterns(nicho: string, objetivo: string): Promise<string> {
    const { data } = await supabaseAdmin
      .from("neuro_score_patterns")
      .select("correlacoes, top_criativos, sample_size")
      .eq("nicho", nicho)
      .eq("objetivo", objetivo)
      .eq("platform", "meta")
      .eq("media_type", "image")
      .maybeSingle();

    if (!data || data.sample_size < 10) {
      return "";
    }

    const c = data.correlacoes as Record<string, unknown>;
    const tops = (data.top_criativos as unknown[]).slice(0, 3);

    let ctx = `\n\n## PADRÕES APRENDIDOS PARA NICHO "${nicho.toUpperCase()}" (${data.sample_size} análises com outcome real)\n`;

    if (c.atencao_vs_ctr) {
      const v = c.atencao_vs_ctr as { pearson: number; sample: number };
      ctx += `- Score de Atenção correlaciona com CTR real: r=${v.pearson} (n=${v.sample})\n`;
    }
    if (c.hook_vs_ctr) {
      const v = c.hook_vs_ctr as { pearson: number; sample: number };
      ctx += `- Hook Score correlaciona com CTR real: r=${v.pearson} (n=${v.sample})\n`;
    }
    if (c.fadiga_vs_cpl) {
      const v = c.fadiga_vs_cpl as { pearson: number; sample: number };
      ctx += `- Fadiga Visual correlaciona negativamente com CPL: r=${v.pearson}\n`;
    }
    if (Array.isArray(c.emocoes_vencedoras)) {
      ctx += `- Emoções que mais converteram: ${(c.emocoes_vencedoras as string[]).join(", ")}\n`;
    }
    if (Array.isArray(c.cta_patterns)) {
      ctx += `- Padrões de CTA vencedores:\n${(c.cta_patterns as string[]).map((p) => `  • ${p}`).join("\n")}\n`;
    }

    if (tops.length > 0) {
      ctx += "\n### Exemplos de criativos que performaram acima da média:\n";
      for (const t of tops) {
        const top = t as Record<string, unknown>;
        ctx += `- Neuro Score: ${top.neuro_score} → CTR real: ${top.ctr_real}% | CPL real: R$${top.cpl_real}\n`;
        ctx += `  Características: ${JSON.stringify(top.zonas_atencao)}, emoção: ${top.emocao_dominante}\n`;
      }
    }

    return ctx;
  }

  async analyze(input: NeuroScoreInput): Promise<NeuroScoreResult> {
    const t0 = Date.now();

    const learnedPatterns = await this.getLearnedPatterns(input.nicho, input.objetivo);

    const systemPrompt = `Você é o Neuro Score IA, um sistema especializado em prever performance de criativos para Meta Ads com base em princípios de neurociência cognitiva, psicologia visual e dados empíricos de campanhas reais.

Seu objetivo: analisar um criativo (imagem estática) e prever com precisão sua performance antes de qualquer centavo ser gasto.

## FRAMEWORK DE ANÁLISE

**Atenção Visual (0–100)**
Avalie: hierarquia visual, ponto de entrada do olho, contraste, cores, rosto humano (atrai atenção 3× mais), movimento implícito, densidade de elementos.

**Impacto Emocional (0–100)**
Identifique a emoção dominante: urgência, curiosidade, desejo, confiança, medo, esperança, pertencimento.
Avalie: alinhamento emocional com o objetivo do anúncio, consistência tonal, gatilhos psicológicos ativos.

**CTA Score (0–100)**
Avalie: visibilidade do CTA, posição (inferior direito converte melhor), contraste, especificidade ("Comprar agora" > "Saiba mais"), senso de urgência, tamanho relativo.

**Hook Score (0–100)**
Avalie: o que aparece nos primeiros 300ms de visualização, headline principal, disrupção de feed, padrão de scroll-stop, curiosidade gerada antes de ler o copy.

**Fadiga Visual (0–100 = muito poluído)**
Avalie: número de elementos distintos, poluição tipográfica, excesso de cores, conflito de hierarquia, sobrecarga cognitiva.

**Neuro Score Final**
Média ponderada: Atenção 0.30 + Hook 0.25 + CTA 0.20 + Emoção 0.15 + (100-Fadiga) 0.10

## ZONAS DE ATENÇÃO
Use estas zonas ao descrever onde o olho vai: rosto, olhos, headline, subheadline, produto, cta, background, bordas, logo, legenda.
${learnedPatterns}

## FORMATO DE RESPOSTA
Responda APENAS em JSON válido, sem markdown, sem texto antes ou depois:
{
  "neuro_score": <integer 0-100>,
  "atencao_score": <integer 0-100>,
  "emocao_score": <integer 0-100>,
  "cta_score": <integer 0-100>,
  "hook_score": <integer 0-100>,
  "fadiga_score": <integer 0-100>,
  "emocao_dominante": "<string>",
  "zonas_atencao": ["<zona1>", "<zona2>"],
  "pontos_fortes": ["<string>", ...],
  "pontos_fracos": ["<string>", ...],
  "recomendacoes": [
    { "prioridade": "alta|media|baixa", "acao": "<o que mudar>", "impacto_estimado": "<ex: +15% CTR estimado>" },
    ...
  ],
  "reasoning": "<parágrafo de 3-5 linhas explicando o raciocínio principal>"
}`;

    const userMessage = `Analise este criativo para Meta Ads.
Nicho: ${input.nicho}
Objetivo: ${input.objetivo}
${input.benchmarkCtrP50 ? `Benchmark CTR do nicho (p50): ${input.benchmarkCtrP50}%` : ""}
${input.benchmarkCplP50 ? `Benchmark CPL do nicho (p50): R$${input.benchmarkCplP50}` : ""}

Seja preciso e direto. Cada recomendação deve ser cirúrgica e implementável.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: input.imageMimeType,
                data: input.imageBase64,
              },
            },
            { type: "text", text: userMessage },
          ],
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
      neuro_score: number;
      atencao_score: number;
      emocao_score: number;
      cta_score: number;
      hook_score: number;
      fadiga_score: number;
      emocao_dominante: string;
      zonas_atencao: string[];
      pontos_fortes: string[];
      pontos_fracos: string[];
      recomendacoes: {
        prioridade: "alta" | "media" | "baixa";
        acao: string;
        impacto_estimado: string;
      }[];
      reasoning: string;
    };

    const tempoMs = Date.now() - t0;
    const tokensUsados = response.usage.input_tokens + response.usage.output_tokens;

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("neuro_score_analyses")
      .insert({
        user_id: input.userId,
        workspace_id: input.workspaceId,
        cliente_id: input.clienteId ?? null,
        campanha_id: input.campanhaId ?? null,
        media_type: "image",
        image_hash: input.imageHash,
        nicho: input.nicho,
        objetivo: input.objetivo,
        neuro_score: parsed.neuro_score,
        atencao_score: parsed.atencao_score,
        emocao_score: parsed.emocao_score,
        cta_score: parsed.cta_score,
        hook_score: parsed.hook_score,
        fadiga_score: parsed.fadiga_score,
        emocao_dominante: parsed.emocao_dominante,
        zonas_atencao: parsed.zonas_atencao,
        pontos_fortes: parsed.pontos_fortes,
        pontos_fracos: parsed.pontos_fracos,
        recomendacoes: parsed.recomendacoes,
        reasoning: parsed.reasoning,
        benchmark_ctr_p50: input.benchmarkCtrP50 ?? null,
        benchmark_cpl_p50: input.benchmarkCplP50 ?? null,
        model_version: "v1",
        tokens_usados: tokensUsados,
        tempo_ms: tempoMs,
      })
      .select("id")
      .single();

    if (saveErr) {
      throw new Error(`Erro ao salvar análise: ${saveErr.message}`);
    }

    const training = new TrainingDataService(supabaseAdmin);
    await training
      .recordFromAgenteFeedback({
        workspaceId: input.workspaceId,
        userMessage,
        agentResponse: raw,
        feedback: "positive",
      })
      .catch(() => {});

    return {
      analysisId: saved.id,
      neuroScore: parsed.neuro_score,
      atencaoScore: parsed.atencao_score,
      emocaoScore: parsed.emocao_score,
      ctaScore: parsed.cta_score,
      hookScore: parsed.hook_score,
      fadigaScore: parsed.fadiga_score,
      emocaoDominante: parsed.emocao_dominante,
      zonasAtencao: parsed.zonas_atencao,
      pontosFortes: parsed.pontos_fortes,
      pontosFracos: parsed.pontos_fracos,
      recomendacoes: parsed.recomendacoes.map((item) => ({
        prioridade: item.prioridade,
        acao: item.acao,
        impactoEstimado: item.impacto_estimado,
      })),
      reasoning: parsed.reasoning,
    };
  }
}
