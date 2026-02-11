import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Chave não configurada na Vercel." }, { status: 500 });
    }

    // Usando o modelo Flash que é o padrão gratuito atual
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt || "Olá");
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("ERRO:", error.message);
    return NextResponse.json({ 
      text: "Erro: " + error.message,
      status: "Verifique se a chave no Google AI Studio está ativa." 
    }, { status: 500 });
  }
}