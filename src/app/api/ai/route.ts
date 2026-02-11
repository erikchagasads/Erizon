import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa a IA com a chave que você colocou na Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Erro: GEMINI_API_KEY não configurada." }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemInstructions = {
      copy: "Você é um Copywriter Sênior. Crie textos persuasivos para anúncios.",
      creative: "Você é um Diretor de Arte. Dê ideias de criativos e conceitos visuais.",
      script: "Você é um Roteirista. Crie roteiros para Reels, TikTok e VSL.",
      analyst: "Você é um Analista de Dados. Analise as métricas e sugira melhorias."
    };

    const role = systemInstructions[type as keyof typeof systemInstructions] || "Você é um assistente de marketing.";
    const fullPrompt = `${role}\n\nSolicitação: ${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ text: "Erro ao processar inteligência artificial." }, { status: 500 });
  }
}