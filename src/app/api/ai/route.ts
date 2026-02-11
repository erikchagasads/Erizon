import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Forçamos a versão estável da API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Chave não configurada." }, { status: 500 });
    }

    // Trocamos para o modelo PRO que é tiro e queda
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json({ text: "Erro na IA: " + error.message }, { status: 500 });
  }
}