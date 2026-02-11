import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Força a Vercel a não usar cache para esta rota
export const dynamic = 'force-dynamic';

// Inicializa a IA usando a chave que você configurou na Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    // Validação de segurança para garantir que a chave existe
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        text: "Erro: Chave API (GEMINI_API_KEY) não encontrada nas variáveis da Vercel." 
      }, { status: 500 });
    }

    // Usando o modelo gemini-1.5-flash (mais estável para deploys)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Instruções específicas para cada aba do seu Studio
    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter Sênior. Gere headlines de alto padrão e magnéticas.",
      creative: "Você é um Diretor de Arte. Forneça conceitos visuais luxuosos.",
      script: "Você é um Roteirista de anúncios de elite. Crie roteiros dinâmicos.",
      analyst: "Você é um Analista de Marketing. Forneça insights estratégicos de escala."
    };

    const role = instructions[type] || "Você é um assistente estratégico da ERIZON.";

    // Chamada para a API do Google
    const result = await model.generateContent(`${role}\n\nSolicitação: ${prompt}`);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Erro na API Gemini:", error.message);
    
    // Tratamento amigável de erro de região ou limite
    let userMessage = "Erro no processamento da IA.";
    if (error.message.includes("location")) {
      userMessage = "Erro: Região não suportada. Verifique se a Vercel está em Washington (iad1).";
    }

    return NextResponse.json({ 
      text: userMessage,
      details: error.message 
    }, { status: 500 });
  }
}