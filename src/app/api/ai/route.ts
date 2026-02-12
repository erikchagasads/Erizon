import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { prompt, category } = await req.json();

    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_ANON_KEY?.trim();
    const groqApiKey = process.env.GROQ_API_KEY?.trim();

    // Alerta de segurança sobre o formato da chave
    if (supabaseKey && !supabaseKey.startsWith('eyJ')) {
      console.error("❌ ERRO CRÍTICO: Você está usando a chave errada! A chave do Supabase deve começar com 'eyJ'. Vá em Settings > API e pegue a chave 'anon public'.");
      return NextResponse.json({ text: "Erro: Chave do banco de dados configurada incorretamente." }, { status: 500 });
    }

    if (!supabaseUrl || !supabaseKey || !groqApiKey) {
      return NextResponse.json({ text: "Erro: Variáveis de ambiente faltando." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Chamada Groq
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Você é a ERIZON." },
          { role: "user", content: prompt }
        ],
      }),
    });

    const data = await groqResponse.json();
    const aiText = data.choices[0].message.content;

    // TENTATIVA DE GRAVAÇÃO
    const { error: supabaseError } = await supabase
      .from('historico')
      .insert([{ prompt, resposta: aiText, categoria: category || 'geral' }]);

    if (supabaseError) {
      console.error("❌ ERRO SUPABASE:", supabaseError.message);
      return NextResponse.json({ text: aiText, warning: "Não salvou no banco." });
    }

    console.log("✅ AGORA SIM! Salvo com sucesso no Supabase.");
    return NextResponse.json({ text: aiText });

  } catch (error: any) {
    return NextResponse.json({ text: "Erro interno.", details: error.message }, { status: 500 });
  }
}