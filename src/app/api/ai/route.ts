import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa a IA com a chave de ambiente
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt, contextData } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Erro: GEMINI_API_KEY não configurada na Vercel." }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Lógica de instruções personalizada
    let systemInstructions = "";
    if (type === 'analyst' && contextData && contextData.length > 0) {
      const metricsSummary = contextData.map((m: any) => `${m.label}: ${m.value} (${m.change})`).join(', ');
      systemInstructions = `Você é um Analista de Performance de Elite. O cliente possui estas métricas reais: ${metricsSummary}. Analise criticamente e dê 3 sugestões práticas de otimização.`;
    } else {
      const instructions: any = {
        copy: "Você é um Copywriter Sênior. Crie textos persuasivos para anúncios.",
        creative: "Você é um Diretor de Arte. Dê ideias de conceitos visuais e criativos.",
        script: "Você é um Roteirista. Crie roteiros para Reels, TikTok e VSL.",
        analyst: "Você é um Analista de Performance. Peça os dados ao usuário ou analise o que ele enviou."
      };
      systemInstructions = instructions[type] || "Você é um assistente de marketing.";
    }

    const fullPrompt = `${systemInstructions}\n\nPedido: ${prompt || "Análise baseada nos dados disponíveis."}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro na Rota AI:", error);
    return NextResponse.json({ text: "Ocorreu um erro no processamento da IA." }, { status: 500 });
  }
}