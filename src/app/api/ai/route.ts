import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { prompt, category } = await req.json();

    // 1. Captura e validação rigorosa das variáveis
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    // Se alguma variável estiver faltando, o erro será específico aqui
    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ ERRO: SUPABASE_URL ou SUPABASE_ANON_KEY não encontradas.");
      return NextResponse.json({ text: "Erro de configuração no banco de dados." }, { status: 500 });
    }

    if (!groqApiKey) {
      console.error("❌ ERRO: GROQ_API_KEY não encontrada.");
      return NextResponse.json({ text: "Erro de configuração na IA." }, { status: 500 });
    }

    // 2. Inicialização do Cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Definição da personalidade (Data Analyst & outros)
    let systemInstruction = "Você é a ERIZON, uma inteligência artificial de alta performance.";
    
    if (category === "data analyst") {
      systemInstruction = `Você é um Data Analyst e Growth Hacker de elite. Analise métricas de anúncios e dê recomendações práticas de escala ou correção.`;
    } else if (category === "copywriting") {
      systemInstruction = "Você é uma Copywriter Expert focada em conversão.";
    }

    // 4. Chamada para a Groq
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt || "Olá" }
        ],
        temperature: 0.6,
      }),
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("❌ ERRO API GROQ:", data);
      throw new Error(data.error?.message || "Erro na Groq");
    }

    const aiText = data.choices[0].message.content;

    // 5. Salvamento no Histórico (Supabase)
    console.log("Tentando salvar no Supabase...");
    const { error: supabaseError } = await supabase
      .from('historico')
      .insert([
        { 
          prompt: prompt, 
          resposta: aiText, 
          categoria: category || 'geral' 
        }
      ]);

    if (supabaseError) {
      console.error("❌ ERRO REAL NO SUPABASE:", supabaseError.message);
      // Não travamos a resposta da IA se o log falhar, mas avisamos no terminal
    } else {
      console.log("✅ DADO GRAVADO COM SUCESSO!");
    }

    return NextResponse.json({ text: aiText });

  } catch (error: any) {
    console.error("--- ERRO NA ROTA ---", error.message);
    return NextResponse.json({ 
      text: "A ERIZON encontrou um problema técnico.", 
      details: error.message 
    }, { status: 500 });
  }
}