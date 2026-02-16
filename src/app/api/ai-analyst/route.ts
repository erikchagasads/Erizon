import { NextResponse, NextRequest } from "next/server";
import { Groq } from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    // ADICIONADO: mensagemUsuario e contexto agora são capturados aqui
    const { metrics, objetivo, mensagemUsuario, contexto } = await req.json();
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    if (!metrics || !metrics.nome_campanha) {
      return NextResponse.json({ 
        analysis: "❌ Nenhuma campanha selecionada. Escolha uma campanha para analisar." 
      });
    }

    const cpl = metrics.contatos > 0 ? (metrics.gasto_total / metrics.contatos) : 0;
    const percentualGasto = metrics.orcamento > 0 ? (metrics.gasto_total / metrics.orcamento) * 100 : 0;

    // Ajustamos o prompt para ser a "Base de Conhecimento", mas permitimos que ele responda ao usuário
    const promptBase = `Você é um ESPECIALISTA ELITE em Meta Ads.
    
    DADOS DA CAMPANHA ATUAL ("${metrics.nome_campanha}"):
    • Status: ${metrics.status} | Gasto: R$ ${metrics.gasto_total.toFixed(2)}
    • Leads: ${metrics.contatos} | CPL: R$ ${cpl.toFixed(2)}
    • Budget Usado: ${percentualGasto.toFixed(1)}%
    
    CONTEXTO DO SISTEMA:
    ${contexto} 

    DIRETRIZ: Se o usuário fizer uma pergunta específica, responda-a usando os dados acima. Se ele não perguntar nada específico, siga o formato de DIAGNÓSTICO/OPORTUNIDADES/RECOMENDAÇÕES.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um analista sênior de Meta Ads. Você é direto, usa dados e nunca se repete desnecessariamente. Se o usuário perguntar algo novo, foque na resposta nova."
        },
        // Passamos o prompt base como a primeira instrução
        {
          role: "system",
          content: promptBase
        },
        // ADICIONADO: A pergunta real que você digitou no chat!
        {
          role: "user",
          content: mensagemUsuario || "Faça um diagnóstico completo desta campanha."
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8, // Aumentei um pouco para dar mais "vida" às respostas
      max_tokens: 2000,
    });

    return NextResponse.json({ 
      analysis: completion.choices[0].message.content 
    });

  } catch (error: any) {
    console.error("Erro na API AI Analyst:", error);
    return NextResponse.json({ 
      error: `❌ Erro ao processar: ${error.message}` 
    }, { status: 500 });
  }
}