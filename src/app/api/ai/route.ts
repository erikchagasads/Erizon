import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa a IA com a chave de ambiente
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. Captura os dados do corpo da requisição
    const { type, prompt } = await req.json();

    // 2. Valida se a chave existe
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { text: "Configuração pendente: Adicione a GEMINI_API_KEY na Vercel." }, 
        { status: 500 }
      );
    }

    // 3. Configura o modelo (gemini-1.5-flash é o ideal para o plano gratuito)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 4. Define as instruções baseadas na aba selecionada
    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter Sênior. Gere headlines e textos persuasivos em Português.",
      creative: "Você é um Diretor de Arte. Sugira conceitos visuais e layouts em Português.",
      script: "Você é um Roteirista de anúncios. Crie roteiros dinâmicos em Português.",
      analyst: "Você é um Analista de Marketing. Forneça insights estratégicos em Português."
    };

    const role = instructions[type] || "Você é um assistente estratégico.";
    
    // 5. Gera o conteúdo
    const result = await model.generateContent(`${role}\n\nSolicitação: ${prompt}`);
    const response = await result.response;
    const text = response.text();

    // 6. Retorna o sucesso
    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Erro na API Gemini:", error);
    return NextResponse.json({ 
      text: "Erro no processamento da IA.", 
      details: error.message 
    }, { status: 500 });
  }
}