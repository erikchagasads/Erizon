import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa a biblioteca com a chave que você configurou na Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. Coleta os dados enviados pelo seu botão "Executar Comando"
    const { type, prompt, contextData } = await req.json();

    // 2. Validação de segurança da chave
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { text: "Erro: GEMINI_API_KEY não configurada nas variáveis da Vercel." }, 
        { status: 500 }
      );
    }

    // 3. Seleção do Modelo Estável (gemini-pro)
    // Usamos o 'gemini-pro' porque o seu erro anterior confirmou que o 'flash' 
    // ainda não está disponível para a sua versão da API v1beta.
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // 4. Configuração de Personalidade (System Instructions)
    const instructions: any = {
      copy: "Você é um Copywriter Sênior especializado em marketing direto e headlines persuasivas.",
      creative: "Você é um Diretor de Arte experiente. Sugira conceitos visuais e layouts inovadores.",
      script: "Você é um Roteirista de alta performance para vídeos curtos (Reels/TikTok) e anúncios.",
      analyst: "Você é um Analista de Performance de Dados. Analise as métricas e sugira otimizações."
    };

    const role = instructions[type] || "Você é um assistente estratégico de marketing.";
    
    // 5. Construção do Prompt Final
    let finalPrompt = `${role}\n\nResponda sempre em Português do Brasil.\n\nComando do usuário: ${prompt}`;
    
    // Se for o analista, ele anexa os dados do Supabase que você buscou no frontend
    if (type === 'analyst' && contextData) {
      finalPrompt += `\n\nDados para análise: ${JSON.stringify(contextData)}`;
    }

    // 6. Chamada oficial para o Google Gemini
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    // 7. Retorno para o seu frontend (Relatório)
    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("ERRO NA API AI:", error);
    
    // Retorna o erro detalhado para aparecer no seu quadro de "Relatório" se algo falhar
    return NextResponse.json({ 
      text: "Erro ao processar sua solicitação.",
      details: error.message 
    }, { status: 500 });
  }
}