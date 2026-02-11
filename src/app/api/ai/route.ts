import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa a IA com a chave que você colocou na Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    // Validação básica
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Erro: GEMINI_API_KEY não configurada no servidor." }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Instruções de Personalidade (System Prompts)
    const systemInstructions = {
      copy: "Você é um Copywriter Sênior de Resposta Direta. Seu objetivo é criar textos altamente persuasivos usando frameworks como AIDA ou PAS. Foque em benefícios e gatilhos mentais.",
      creative: "Você é um Diretor de Arte e Estrategista de Criativos. Sua função é dar ideias visuais detalhadas para anúncios (fotos, vídeos, carrosséis) que parem o scroll do usuário.",
      script: "Você é um Roteirista especializado em vídeos curtos e virais. Crie roteiros com um gancho (hook) forte nos primeiros 3 segundos, corpo do conteúdo e uma chamada para ação (CTA) clara.",
      analyst: "Você é um Analista de Performance de Elite. Analise os dados métricos fornecidos pelo usuário, identifique gargalos e sugira ajustes práticos em orçamentos, públicos ou criativos."
    };

    const role = systemInstructions[type as keyof typeof systemInstructions] || "Você é um assistente de marketing inteligente.";
    
    const fullPrompt = `${role}\n\nSolicitação do Cliente: ${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro na API Gemini:", error);
    return NextResponse.json({ text: "Ocorreu um erro ao processar sua solicitação com a IA." }, { status: 500 });
  }
}