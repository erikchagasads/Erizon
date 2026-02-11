import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa a IA usando a variável de ambiente configurada na Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. Recebe os dados do frontend
    const { type, prompt, contextData } = await req.json();

    // 2. Validação da Chave de API
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { text: "Erro: GEMINI_API_KEY não configurada na Vercel." },
        { status: 500 }
      );
    }

    // 3. Configuração do Modelo Estável
    // Alterado para 'gemini-pro' para garantir compatibilidade total
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // 4. Definição de Instruções por Categoria
    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter Sênior especializado em marketing direto e conversão.",
      creative: "Você é um Diretor de Arte. Sugira conceitos visuais, cores e layouts impactantes.",
      script: "Você é um Roteirista de alta performance focado em vídeos virais e anúncios de retenção.",
      analyst: "Você é um Analista de Performance. Analise os dados fornecidos e sugira otimizações práticas."
    };

    const role = instructions[type] || "Você é um assistente estratégico de marketing.";
    
    // 5. Construção do Prompt
    let finalPrompt = `${role}\n\nResponda sempre em Português do Brasil de forma profissional e direta.\n\nComando: ${prompt}`;
    
    // Adiciona contexto extra caso seja uma análise de dados
    if (type === 'analyst' && contextData) {
      finalPrompt += `\n\nDados do Cliente para contexto: ${JSON.stringify(contextData)}`;
    }

    // 6. Chamada para a API do Google Gemini
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    // 7. Retorno do sucesso
    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("ERRO CRÍTICO NA API AI:", error);
    
    // Retorna o erro detalhado para facilitar o seu diagnóstico no painel
    return NextResponse.json({ 
      text: "Erro ao processar sua solicitação.",
      details: error.message 
    }, { status: 500 });
  }
}