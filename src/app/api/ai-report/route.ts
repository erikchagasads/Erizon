import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { requireAuth } from "@/lib/auth-guard";
import { checkRateLimit, rateLimitHeaders, RATE_LIMIT_PRESETS } from "@/lib/rate-limiter";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    // Autenticação obrigatória
    const auth = await requireAuth(req);
    if (!auth.user) return auth.response;

    // Rate limit por usuário
    const preset = RATE_LIMIT_PRESETS.ai;
    const rl = checkRateLimit(`ai-report:${auth.user.id}`, preset);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Limite de requisições atingido. Tente novamente em breve." },
        { status: 429, headers: rateLimitHeaders(rl, preset.limit) }
      );
    }

    const body = await req.json();

    const data = body.data || {};
    const clienteNome = body.clienteNome || "Erizon Partner";
    const promptAdicional = body.promptAdicional || "";

    if (!promptAdicional?.trim()) {
      return NextResponse.json({ error: "Descreva o roteiro que você precisa." }, { status: 400 });
    }

    const spend = data.spend ? Number(data.spend).toFixed(2) : null;
    const leads = data.leads ? Number(data.leads) : null;
    const cpl = data.cpl ? Number(data.cpl).toFixed(2) : null;

    const contextoDados = spend && Number(spend) > 0
      ? `\nCONTEXTO DE PERFORMANCE (use somente se relevante para a copy):
- Cliente/Projeto: ${clienteNome}
- Investimento: R$ ${spend}
- Leads: ${leads}
- CPL: R$ ${cpl}`
      : `\nCliente/Projeto: ${clienteNome}`;

    const prompt = `Você é o SCRIPT ENGINE da Erizon — Roteirista e Copywriter de Resposta Direta de elite.
${contextoDados}

PEDIDO:
${promptAdicional}

REGRAS:
1. Se for roteiro: foque em escrita persuasiva, ganchos fortes e linguagem humanizada
2. Use dados de tráfego apenas se fizerem sentido para validar a copy
3. Estrutura recomendada: [GANCHO] → [CORPO] → [CTA]
4. Fale como roteirista que quer vender muito, não como analista de planilhas
5. Nunca diga "não posso fazer"
6. Responda sempre em português BR`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.75,
      max_tokens: 2500,
    });

    const report = chatCompletion.choices[0]?.message?.content || "";
    return NextResponse.json({ analysis: report }, { headers: rateLimitHeaders(rl, preset.limit) });

  } catch (err: unknown) {
    console.error("Erro na API de Roteiros:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erro ao gerar roteiro. Verifique os dados." }, { status: 500 });
  }
}
