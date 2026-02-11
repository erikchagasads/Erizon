import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa a IA com a chave de ambiente
// Certifique-se de que GEMINI_API_KEY está na sua Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, prompt } = body;

    // 1. Verificação da Chave
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "") {
      return NextResponse.json({ 
        text: "ERRO DE CONFIGURAÇÃO: A chave GEMINI_API_KEY não foi encontrada nas variáveis de ambiente da Vercel." 
      }, { status: 500 });
    }

    // 2. Configuração do Modelo (Flash é o mais rápido e gratuito)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });

    // 3. Definição de Personas (System Instructions)
    const instructions: Record<string, string> = {
      copy: "Você é um Copywriter de alta conversão. Gere textos curtos, impactantes e persuasivos em Português Brasileiro.",
      creative: "Você é um Diretor Criativo. Sugira ideias visuais e ângulos de marketing inovadores em Português Brasileiro.",
      script: "Você é um Especialista em vídeos virais. Crie roteiros para Reels/TikTok com ganchos fortes em Português Brasileiro.",
      analyst: "Você é um Analista de Dados estratégico. Analise métricas e dê sugestões práticas de melhoria em Português Brasileiro."
    };

    const role = instructions[type] || "Você é um assistente de marketing estratégico.";

    // 4. Chamada da API do Google
    const result = await model.generateContent(`${role}\n\nSolicitação do usuário: ${prompt}`);
    
    // Aguarda a resposta completa
    const response = await result.response;
    const text = response.text();

    // 5. Retorna o texto gerado
    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("ERRO NO ROUTE AI:", error);

    // Tratamento de erros específicos
    let errorMessage = "Ocorreu um erro ao processar sua solicitação.";
    
    if (error.message?.includes("location not supported")) {
      errorMessage = "Erro de Região: O Google ainda não permite chamadas dessa região via servidor. Tente usar uma VPN ou mude a região da Vercel para Washington (iad1).";
    } else if (error.message?.includes("API_KEY_INVALID")) {
      errorMessage = "Erro de Chave: Sua GEMINI_API_KEY é inválida ou expirou.";
    }

    return NextResponse.json({ 
      text: "Erro no processamento da IA.",
      details: errorMessage,
      rawError: error.message
    }, { status: 500 });
  }
}