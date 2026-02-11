import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { type, prompt, contextData } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: "Chave não configurada." }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      // Isso impede que a IA bloqueie respostas por excesso de cautela
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const instructions: any = {
      copy: "Você é um Copywriter Sênior. Responda em Português.",
      creative: "Você é um Diretor de Arte. Responda em Português.",
      script: "Você é um Roteirista de vídeos. Responda em Português.",
      analyst: "Você é um Analista de Performance. Responda em Português."
    };

    const result = await model.generateContent(`${instructions[type] || ""} \n\n ${prompt}`);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("ERRO DETALHADO:", error);
    return NextResponse.json({ text: "Erro na IA: " + error.message }, { status: 500 });
  }
}