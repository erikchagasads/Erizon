import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt, contextData } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Erro: GEMINI_API_KEY não configurada na Vercel." }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let systemInstructions = "";
    if (type === 'analyst' && contextData && contextData.length > 0) {
      const metricsSummary = contextData.map((m: any) => `${m.label}: ${m.value} (${m.change})`).join(', ');
      systemInstructions = `Você é um Analista de Performance de Elite. O cliente possui estas métricas: ${metricsSummary}. Analise e dê 3 sugestões práticas.`;
    } else {
      const instructions: any = {
        copy: "Você é um Copywriter Sênior. Crie textos persuasivos.",
        creative: "Você é um Diretor de Arte. Dê ideias de criativos visuais.",
        script: "Você é um Roteirista. Crie roteiros para vídeos curtos.",
        analyst: "Você é um Analista de Performance. Peça os dados para analisar."
      };
      systemInstructions = instructions[type] || "Você é um assistente de marketing.";
    }

    const fullPrompt = `${systemInstructions}\n\nPedido: ${prompt || "Análise geral."}`;
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json({ text: "Erro no processamento da IA." }, { status: 500 });
  }
}