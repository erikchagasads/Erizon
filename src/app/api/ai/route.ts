import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Chave não configurada na Vercel." }, { status: 500 });
    }

    // Usando gemini-pro para evitar o erro 404 de modelo não encontrado
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter Sênior. Responda de forma persuasiva em Português.",
      creative: "Você é um Diretor de Arte. Dê ideias visuais em Português.",
      script: "Você é um Roteirista. Crie roteiros cativantes em Português.",
      analyst: "Você é um Analista de Dados. Dê insights estratégicos em Português."
    };

    const role = instructions[type] || "Você é um assistente de marketing.";
    
    const result = await model.generateContent(`${role}\n\nPedido: ${prompt}`);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro na API:", error);
    return NextResponse.json({ 
      text: "Erro ao processar sua solicitação.", 
      details: error.message 
    }, { status: 500 });
  }
}