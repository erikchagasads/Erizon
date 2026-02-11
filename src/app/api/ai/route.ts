import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Chave não configurada." }, { status: 500 });
    }

    // O NOME CORRETO É 'gemini-1.5-flash' (mais rápido) ou 'gemini-1.5-pro'
    // Vamos usar o flash que é o que costuma estar liberado para todos
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ 
      text: "Erro na IA: " + error.message,
      // Isso vai nos mostrar se o erro mudou
      details: error.stack 
    }, { status: 500 });
  }
}