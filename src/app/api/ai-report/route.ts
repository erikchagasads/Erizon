import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
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

    // Monta contexto de métricas apenas se houver dados reais
    const contextoDados = spend && Number(spend) > 0
      ? `\nCONTEXTO DE PERFORMANCE (use somente se relevante para a copy):
- Cliente/Projeto: ${clienteNome}
- Investimento: R$ ${spend}
- Leads: ${leads}
- CPL: R$ ${cpl}`
      : `\nCliente/Projeto: ${clienteNome}`

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
6. Responda sempre em português BR`

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.75,
      max_tokens: 2500,
    });

    const report = chatCompletion.choices[0]?.message?.content || "";
    return NextResponse.json({ analysis: report });

  } catch (err: any) {
    console.error("Erro na API de Roteiros:", err.message);
    return NextResponse.json({ error: "Erro ao gerar roteiro. Verifique os dados." }, { status: 500 });
  }
}
