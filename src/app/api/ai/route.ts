import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa a IA com a chave
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. Verifica se a chave existe
    if (!process.env.GEMINI_API_KEY) {
      console.error("ERRO: Chave GEMINI_API_KEY não encontrada.");
      return NextResponse.json({ text: "Erro: Chave de API não configurada na Vercel." }, { status: 500 });
    }

    const { type, prompt, contextData } = await req.json();

    // 2. Configura o modelo (Usando o flash que é mais rápido)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 3. Define as instruções de sistema
    const instructions: any = {
      copy: "Você é um Copywriter Sênior focado em conversão.",
      creative: "Você é um Diretor de Arte criativo.",
      script: "Você é um Roteirista de vídeos virais.",
      analyst: "Você é um Analista de Dados de tráfego pago."
    };

    const role = instructions[type] || "Você é um assistente de marketing.";
    
    let fullPrompt = `${role}\n\nPedido: ${prompt}`;
    
    if (type === 'analyst' && contextData) {
      fullPrompt += `\n\nContexto de dados do cliente: ${JSON.stringify(contextData)}`;
    }

    // 4. Tenta gerar o conteúdo
    const result = await model.generateContent(fullPrompt);
    
    // 5. Forma segura de extrair o texto
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("IA retornou resposta vazia");
    }

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("ERRO NA ROTA AI:", error);
    
    // Retorna o erro real para facilitar o debug
    return NextResponse.json({ 
      text: "Erro no processamento da IA.",
      details: error.message 
    }, { status: 500 });
  }
}