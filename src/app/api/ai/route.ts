import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Erro: Chave API não configurada na Vercel." }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter Sênior. Gere headlines de alto padrão.",
      creative: "Você é um Diretor de Arte. Sugira conceitos visuais.",
      script: "Você é um Roteirista. Crie roteiros de anúncios.",
      analyst: "Você é um Analista de Marketing. Forneça insights."
    };

    const role = instructions[type] || "Você é um assistente estratégico.";
    const result = await model.generateContent(`${role}\n\nSolicitação: ${prompt}`);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    return NextResponse.json({ text: "Erro na IA: " + error.message }, { status: 500 });
  }
}