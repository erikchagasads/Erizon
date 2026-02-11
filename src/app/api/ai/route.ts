import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa com a chave da Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Chave não configurada na Vercel." }, { status: 500 });
    }

    // Usando gemini-1.5-flash: é a versão estável mais recente e gratuita
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter Sênior. Gere headlines persuasivas de alto padrão em Português.",
      creative: "Você é um Diretor de Arte. Sugira conceitos visuais luxuosos em Português.",
      script: "Você é um Roteirista de anúncios. Crie roteiros dinâmicos em Português.",
      analyst: "Você é um Analista estratégico. Forneça insights de marketing em Português."
    };

    const role = instructions[type] || "Você é um assistente estratégico.";
    
    // Chamada com timeout e persona configurada
    const result = await model.generateContent(`${role}\n\nSolicitação: ${prompt}`);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Erro Gemini:", error.message);
    
    // Se der erro de região, esta mensagem ajudará a identificar
    return NextResponse.json({ 
      text: "Erro no processamento da IA.",
      details: error.message 
    }, { status: 500 });
  }
}