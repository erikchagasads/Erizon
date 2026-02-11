import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt, contextData } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "API_KEY Ausente." }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Lógica do Analista com Dados Reais
    let systemInstructions = "";
    if (type === 'analyst' && contextData) {
      const metricsSummary = contextData.map((m: any) => `${m.label}: ${m.value} (${m.change})`).join(', ');
      systemInstructions = `Você é um Analista de Performance de Elite. O cliente possui as seguintes métricas reais: ${metricsSummary}. Analise esses dados criticamente, aponte onde ele está perdendo dinheiro e dê 3 sugestões práticas de otimização baseadas nesses números específicos.`;
    } else {
      const instructions: any = {
        copy: "Você é um Copywriter Sênior. Crie textos persuasivos de alta conversão.",
        creative: "Você é um Diretor de Arte. Dê ideias de criativos impactantes.",
        script: "Você é um Roteirista de vídeos curtos. Crie roteiros virais com hooks fortes."
      };
      systemInstructions = instructions[type] || "Você é um assistente de marketing.";
    }

    const fullPrompt = `${systemInstructions}\n\nPedido do usuário: ${prompt || "Análise geral baseada nos meus dados."}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json({ text: "Erro no processamento da IA." }, { status: 500 });
  }
}