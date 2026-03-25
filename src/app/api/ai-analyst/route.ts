import { NextResponse, NextRequest } from "next/server";
import { Groq } from "groq-sdk";
import { z, validationError } from "@/lib/validate";
import { requireAuth } from "@/lib/auth-guard";
import { checkRateLimit, rateLimitHeaders, RATE_LIMIT_PRESETS } from "@/lib/rate-limiter";
import { getContextoCliente } from "@/lib/agente-memoria";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const AnalystBodySchema = z.object({
  mensagemUsuario: z.string().nonempty("mensagem obrigatória").max(2000),
  metrics: z.array(z.object({
    nome: z.string(),
    gasto: z.number().min(0),
    leads: z.number().min(0),
    cpl: z.number().min(0),
    ctr: z.number().min(0),
    status: z.string(),
  })).optional(),
  contexto: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.user) return auth.response;

    const rl = checkRateLimit(`ai-analyst:${auth.user.id}`, RATE_LIMIT_PRESETS.ai);
    const rlHeaders = rateLimitHeaders(rl, RATE_LIMIT_PRESETS.ai.limit);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit atingido. Aguarde antes de enviar nova mensagem." },
        { status: 429, headers: rlHeaders }
      );
    }

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 }); }

    const parsed = AnalystBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(validationError(parsed), { status: 422 });

    const { metrics, mensagemUsuario, contexto } = parsed.data;
    const cliente_id = (body as Record<string, unknown>).cliente_id as string | undefined;

    // Buscar memoria do cliente
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const memoriaCliente = await getContextoCliente(supabase, auth.user.id, cliente_id, "analista");
    const listaCampanhas = Array.isArray(metrics) ? metrics : metrics ? [metrics] : [];

    if (listaCampanhas.length === 0) {
      return NextResponse.json({
        analysis: "Nenhuma campanha encontrada. Verifique se há campanhas sincronizadas no sistema.",
      });
    }

    // ── Formata resumo das campanhas para o prompt ─────────────────────────
    const resumoCampanhas = listaCampanhas
      .map((c: Record<string, unknown>) => {
        const gasto = Number(c.gasto_total ?? 0);
        const contatos = Number(c.contatos ?? 0);
        const orcamento = Number(c.orcamento ?? 0);
        const impressoes = Number(c.impressoes ?? 0);
        const alcance = Number(c.alcance ?? 0);

        const cpl = contatos > 0 ? (gasto / contatos).toFixed(2) : "0.00";
        const pctGasto =
          orcamento > 0 ? ((gasto / orcamento) * 100).toFixed(1) : "0.0";
        const freq =
          alcance > 0 ? (impressoes / alcance).toFixed(2) : "N/A";

        return [
          `• ${c.nome_campanha ?? "SEM NOME"}`,
          `  Status: ${c.status ?? "—"}`,
          `  Gasto: R$ ${gasto.toFixed(2)} | Budget: R$ ${orcamento.toFixed(2)} (${pctGasto}% usado)`,
          `  Leads: ${contatos} | CPL: R$ ${cpl}`,
          `  Impressões: ${impressoes.toLocaleString("pt-BR")} | Alcance: ${alcance.toLocaleString("pt-BR")} | Frequência: ${freq}`,
        ].join("\n");
      })
      .join("\n\n");

    const isTodas = listaCampanhas.length > 1;

    const promptBase = `Você é um ANALISTA SÊNIOR de Meta Ads com 10+ anos de experiência no mercado brasileiro.

${
  isTodas
    ? `ANÁLISE CONSOLIDADA — ${listaCampanhas.length} CAMPANHAS:`
    : `ANÁLISE DA CAMPANHA: "${listaCampanhas[0]?.nome ?? ""}"`
}

${resumoCampanhas}

${contexto ? `\nCONTEXTO ADICIONAL:\n${contexto}` : ""}${memoriaCliente}

── BENCHMARKS DO MERCADO BRASILEIRO ──
CPL:
  • Excelente: abaixo de R$15
  • Bom: R$15-30
  • Atenção: R$30-50
  • Crítico: acima de R$50

ROAS:
  • Excelente: acima de 3×
  • Bom: 2-3×
  • Atenção: 1-2×
  • Crítico: abaixo de 1× (prejuízo)

CTR:
  • Excelente: acima de 2%
  • Bom: 1-2%
  • Atenção: 0.5-1%
  • Crítico: abaixo de 0.5% (criativo saturado)

FREQUÊNCIA:
  • Seguro: abaixo de 2.0
  • Atenção: 2.0-2.5 (monitorar saturação)
  • Alarme: acima de 2.5 (público esgotado, trocar criativo)
  • Crítico: acima de 3.5 (pausar e reformular)

CPM:
  • Eficiente: abaixo de R$15
  • Normal: R$15-30
  • Alto: acima de R$30 (revisar segmentação)

CONSUMO DE BUDGET:
  • Saudável: 70-90% no período
  • Sub-entrega: abaixo de 70% (problema de lance ou público)
  • Risco: acima de 95% (pode interromper entrega)

── SKILLS DE ANÁLISE ──

DIAGNÓSTICO RÁPIDO: Identifique o status geral (Crítico/Atenção/Saudável/Oportunidade)
CAUSA RAIZ: O que está causando o problema real (criativo, público, oferta, orçamento, timing)
IMPACTO FINANCEIRO: Quanto está sendo desperdiçado ou quanto pode ser ganho
AÇÃO PRIORITÁRIA: Uma ação concreta para implementar HOJE
PRÓXIMO TESTE: O que testar na próxima semana para validar melhoria

── REGRAS ──
- Use APENAS os dados fornecidos, nunca invente números
- Se pergunta específica → responda diretamente sem rodeios
- Se diagnóstico geral → formato: DIAGNÓSTICO → CAUSA → IMPACTO → AÇÕES
- Destaque sempre a melhor e pior campanha quando houver múltiplas
- Frequência > 2.5 = alarme explícito obrigatório
- Termine SEMPRE com uma ação concreta e prioritária com prazo`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Você é o Analista Neural da Erizon — analista sênior de Meta Ads integrado à plataforma de gestão de tráfego.

IDENTIDADE:
- 10+ anos analisando campanhas de performance no Brasil
- Especialista em identificar causa raiz de problemas de campanha
- Orientado a dados reais — nunca inventa métricas
- Parceiro de trabalho do gestor, não consultor distante

COMO VOCÊ ANALISA:
1. Vê os números → identifica o padrão
2. Identifica a causa raiz (não o sintoma)
3. Quantifica o impacto financeiro
4. Entrega ação concreta com prazo

ESTILO DE RESPOSTA:
- Direto ao ponto — sem enrolação
- Use bullets e formatação clara
- Números reais com contexto (não só o dado bruto)
- Tom de parceiro que entende o negócio, não de robô analítico
- Sempre em português BR`,
        },
        {
          role: "system",
          content: promptBase,
        },
        {
          role: "user",
          content:
            mensagemUsuario ||
            (isTodas
              ? "Faça um diagnóstico completo de todas as campanhas."
              : "Faça um diagnóstico completo desta campanha."),
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens: 2000,
    });

    return NextResponse.json({
      analysis: completion.choices[0].message.content,
    });
  } catch (error: unknown) {
    console.error("Erro na API AI Analyst:", error);
    return NextResponse.json(
      { error: `Erro ao processar análise: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}