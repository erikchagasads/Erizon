import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { text: "Chave não configurada na Vercel." }, 
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter Sênior. Gere headlines e textos persuasivos em Português.",
      creative: "Você é um Diretor de Arte. Sugira conceitos visuais e layouts em Português.",
      script: "Você é um Roteirista de anúncios. Crie roteiros dinâmicos em Português.",
      analyst: "Você é um Analista de Marketing. Forneça insights estratégicos em Português."
    };

    const role = instructions[type] || "Você é um assistente estratégico.";
    
    const result = await model.generateContent(`${role}\n\nSolicitação: ${prompt}`);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Erro na API Gemini:", error);
    return NextResponse.json({ 
      text: "Erro no processamento da IA.", 
      details: error.message 
    }, { status: 500 });
  }
}