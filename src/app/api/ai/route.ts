import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa a biblioteca
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Chave não configurada na Vercel." }, { status: 500 });
    }

    // MUDANÇA CRUCIAL: Trocamos 'gemini-1.5-flash' por 'gemini-pro'
    // O 'gemini-pro' é o modelo estável que funciona em todas as regiões.
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter Sênior especializado em headlines. Responda em Português.",
      creative: "Você é um Diretor de Arte. Sugira conceitos visuais em Português.",
      script: "Você é um Roteirista de vídeos virais. Responda em Português.",
      analyst: "Você é um Analista de Performance. Dê insights estratégicos em Português."
    };

    const role = instructions[type] || "Você é um assistente de marketing.";
    
    // Chamada para o Google
    const result = await model.generateContent(`${role}\n\nPedido do usuário: ${prompt}`);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("ERRO NA API:", error);
    // Retorna o erro real para o quadro "Relatório" para a gente saber se falhar
    return NextResponse.json({ 
      text: "Erro ao processar sua solicitação.", 
      details: error.message 
    }, { status: 500 });
  }
}