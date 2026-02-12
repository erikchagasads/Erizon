import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Agora recebemos o prompt e a categoria (ex: copywriting, roteiros...)
    const { prompt, category } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ text: "Erro: GROQ_API_KEY não configurada." }, { status: 500 });
    }

    // Definimos o comportamento da IA com base na categoria selecionada
    let systemInstruction = "Você é a ERIZON, uma IA de alta performance.";
    
    if (category === "copywriting") {
      systemInstruction = "Você é uma Copywriter Expert em conversão e gatilhos mentais. Seu foco é vender.";
    } else if (category === "roteiros") {
      systemInstruction = "Você é uma Roteirista de elite para vídeos virais (Reels/TikTok). Foque em retenção e hooks fortes.";
    } else if (category === "criativos") {
      systemInstruction = "Você é uma Diretora de Arte. Descreva conceitos visuais e textos para anúncios de alta performance.";
    } else if (category === "data analyst") {
      systemInstruction = "Você é uma Analista de Dados. Ajude a interpretar métricas e sugerir otimizações baseadas em números.";
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt || "Olá" }
        ],
        temperature: 0.7, // Um pouco de criatividade
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Erro na Groq");
    }

    const aiResponse = data.choices[0].message.content;
    return NextResponse.json({ text: aiResponse });

  } catch (error: any) {
    console.error("--- ERRO NA ROTA AI ---");
    return NextResponse.json({ text: "Erro na conexão.", details: error.message }, { status: 500 });
  }
}