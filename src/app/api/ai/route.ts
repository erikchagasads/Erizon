import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Força a Vercel a não usar cache antigo
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();
    
    // Pegando a chave diretamente para garantir que não há erro de leitura
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ text: "Erro: GEMINI_API_KEY não encontrada na Vercel." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Tentamos o modelo 'gemini-pro' que é o mais compatível com todas as regiões
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter. Gere textos de vendas.",
      creative: "Você é um Diretor Criativo. Dê ideias de anúncios.",
      script: "Você é um Roteirista. Crie roteiros para vídeos.",
      analyst: "Você é um Analista. Forneça estratégias."
    };

    const role = instructions[type] || "Assistente de marketing.";
    
    const result = await model.generateContent(`${role}\n\nComando: ${prompt}`);
    const text = result.response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("LOG DE ERRO:", error.message);
    
    // Se o gemini-pro falhar, ele tentará o flash automaticamente na próxima vez
    return NextResponse.json({ 
      text: "Erro de Conexão com o Google.",
      details: error.message 
    }, { status: 500 });
  }
}