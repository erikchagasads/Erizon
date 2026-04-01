import { NextResponse, NextRequest } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const {
      nome,
      email,
      nicho,
      nichoCustom,
      faturamento,
      canais,
      desafio,
      meta,
      orcamento,
      modelo_negocio,
    } = body as Record<string, string>;

    const nichoFinal = nicho === "outro" ? nichoCustom : nicho;

    const prompt = `Você é um analista sênior de growth com 15 anos de experiência em empresas de todos os portes e nichos. Você já trabalhou com e-commerce, SaaS, imobiliárias, clínicas, restaurantes, infoprodutos, serviços locais, B2B, varejo, saúde, educação e muito mais.

Você recebeu o seguinte diagnóstico de um negócio:

- **Nome do responsável:** ${nome}
- **Nicho/Segmento:** ${nichoFinal}
- **Modelo de negócio:** ${modelo_negocio}
- **Faturamento mensal atual:** ${faturamento}
- **Canais de marketing ativos hoje:** ${canais}
- **Maior desafio de crescimento:** ${desafio}
- **Meta para os próximos 3 meses:** ${meta}
- **Orçamento mensal de marketing:** ${orcamento}

Sua tarefa é entregar um diagnóstico de growth PROFUNDO e ESPECÍFICO para este negócio. Não dê respostas genéricas. Cada recomendação deve fazer sentido para o nicho "${nichoFinal}" especificamente.

Estruture sua resposta EXATAMENTE neste formato JSON:

{
  "titulo_diagnostico": "título impactante específico pro nicho",
  "resumo_executivo": "2-3 frases diretas sobre o momento atual do negócio e o maior gap de crescimento",
  "score_growth": número de 0 a 100 baseado nas respostas (quanto mais estruturado, maior),
  "principais_alavancas": [
    {
      "titulo": "nome da alavanca",
      "descricao": "explicação direta do que fazer",
      "impacto": "alto|médio|baixo",
      "prazo": "imediato (1-2 semanas)|curto prazo (1 mês)|médio prazo (2-3 meses)",
      "como_comecar": "primeiro passo prático e específico para este nicho"
    }
  ],
  "plano_30_dias": [
    "ação específica 1 para semana 1",
    "ação específica 2 para semana 2",
    "ação específica 3 para semana 3",
    "ação específica 4 para semana 4"
  ],
  "canais_recomendados": [
    {
      "canal": "nome do canal",
      "por_que_para_este_nicho": "razão específica",
      "como_usar": "tática concreta"
    }
  ],
  "alerta_critico": "o maior erro ou gap que este negócio provavelmente está cometendo agora",
  "proximos_passos": ["passo 1", "passo 2", "passo 3"],
  "frase_motivacional": "frase curta e direta para o dono do negócio"
}

Responda APENAS com o JSON, sem texto adicional antes ou depois.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Você é um analista de growth expert. Responda sempre em JSON válido, sem markdown, sem texto extra." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Tenta extrair JSON mesmo se vier com markdown
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "IA não retornou JSON válido" }, { status: 500 });
    }

    let diagnostico: Record<string, unknown>;
    try {
      diagnostico = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Erro ao parsear resposta da IA" }, { status: 500 });
    }

    // Salvar lead (best effort)
    try {
      const webhookBody = {
        nome_lead: nome,
        email,
        canal: "lp_diagnostico_growth",
        status: "novo",
        nicho: nichoFinal,
        faturamento,
        meta,
      };
      await fetch(`${req.nextUrl.origin}/api/leads/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookBody),
      });
    } catch {
      // não bloqueia
    }

    return NextResponse.json({ diagnostico });
  } catch (err) {
    console.error("[growth-diagnostico]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
