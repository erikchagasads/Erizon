import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Erro: Chave API não configurada." }, { status: 500 });
    }

    // Usando a versão estável que evita o erro 404
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter Sênior especializado em alto padrão.",
      creative: "Você é um Diretor de Arte focado em luxo.",
      script: "Você é um Roteirista de vídeos imobiliários.",
      analyst: "Você é um Analista de Marketing estratégico."
    };

    const role = instructions[type] || "Você é um assistente estratégico.";
    
    // Chamada simplificada para evitar erros de versão
    const result = await model.generateContent(`${role}\n\nSolicitação: ${prompt}`);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro detalhado:", error);
    return NextResponse.json({ 
      text: "Erro na IA: Verifique o modelo ou a região.",
      details: error.message 
    }, { status: 500 });
  }
}