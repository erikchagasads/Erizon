import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Força a execução em ambiente Node.js estável
export const runtime = 'nodejs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Chave não configurada na Vercel." }, { status: 500 });
    }

    // Usando o modelo estável 1.5-flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter Sênior especializado em alto padrão. Gere textos persuasivos.",
      creative: "Você é um Diretor de Arte focado em luxo. Sugira conceitos visuais.",
      script: "Você é um Roteirista de anúncios de elite. Crie roteiros dinâmicos.",
      analyst: "Você é um Analista de Marketing estratégico. Forneça insights."
    };

    const role = instructions[type] || "Você é um assistente estratégico.";
    
    // Chamada direta
    const result = await model.generateContent(`${role}\n\nSolicitação: ${prompt}`);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Erro Gemini:", error.message);
    return NextResponse.json({ 
      text: "Erro na IA: Verifique o modelo ou a região.",
      details: error.message 
    }, { status: 500 });
  }
}