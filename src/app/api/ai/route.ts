import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa com a chave que vimos que já está configurada na Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Chave ausente na Vercel." }, { status: 500 });
    }

    // Trocamos para o 'gemini-1.5-flash-latest'. 
    // Esse nome força o Google a pegar a versão mais recente e compatível.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter Sênior. Responda em Português.",
      creative: "Você é um Diretor de Arte. Responda em Português.",
      script: "Você é um Roteirista. Responda em Português.",
      analyst: "Você é um Analista de Performance. Responda em Português."
    };

    const role = instructions[type] || "Você é um assistente de marketing.";
    
    // O segredo: passamos um objeto simples para o generateContent
    const result = await model.generateContent(`${role}\n\nComando: ${prompt}`);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("ERRO GOOGLE:", error.message);
    return NextResponse.json({ 
      text: "Erro na IA: " + error.message 
    }, { status: 500 });
  }
}