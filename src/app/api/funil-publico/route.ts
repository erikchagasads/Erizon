// src/app/api/funil-publico/route.ts — v2 (Groq LLaMA 3.3 70B)

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Groq from "groq-sdk";

const groq = new Groq();
const MODEL = "llama-3.3-70b-versatile";

interface FunilInput {
  produto: string;
  descricao: string;
  objetivo: "leads" | "vendas" | "trafego" | "reconhecimento";
  ticket: number;
  segmento: string;
  regiao: string;
  diferencial: string;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) { values.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); },
      },
    }
  );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body: FunilInput = await req.json();
    const { produto, descricao, objetivo, ticket, segmento, regiao, diferencial } = body;

    if (!produto?.trim()) return NextResponse.json({ error: "Produto é obrigatório." }, { status: 400 });

    const objetivoLabel = {
      leads: "Captação de Leads",
      vendas: "Vendas Diretas",
      trafego: "Tráfego para Site",
      reconhecimento: "Reconhecimento de Marca",
    }[objetivo] ?? objetivo;

    const prompt = `Você é especialista em tráfego pago no Meta Ads para o mercado brasileiro.

Analise o seguinte produto/serviço e gere um funil de público completo:

PRODUTO: ${produto}
DESCRIÇÃO: ${descricao || "Não informada"}
OBJETIVO: ${objetivoLabel}
TICKET MÉDIO: R$${ticket}
SEGMENTO: ${segmento || "Não informado"}
REGIÃO: ${regiao || "Brasil"}
DIFERENCIAL: ${diferencial || "Não informado"}

Retorne APENAS JSON válido, sem markdown, sem texto antes ou depois:

{
  "resumo": "<análise estratégica em 2-3 frases>",
  "nichos": [
    {
      "nome": "<nicho>",
      "tamanho_estimado": "<ex: 2-5 milhões no Brasil>",
      "potencial": "alto|medio|baixo",
      "descricao": "<por que relevante>",
      "subnichos": ["<sub1>", "<sub2>", "<sub3>"]
    }
  ],
  "publicos": [
    {
      "nome": "<nome do público>",
      "prioridade": "principal|secundario|teste",
      "demografico": {
        "idade": "<ex: 25-45>",
        "genero": "todos|masculino|feminino",
        "renda": "<ex: classe B/C>",
        "escolaridade": "<ex: superior>"
      },
      "comportamentos": ["<comp1>", "<comp2>", "<comp3>"],
      "interesses": ["<int1>", "<int2>", "<int3>", "<int4>", "<int5>"],
      "dores": ["<dor1>", "<dor2>", "<dor3>"],
      "desejos": ["<desejo1>", "<desejo2>"],
      "objecoes": ["<obj1>", "<obj2>"],
      "onde_encontrar": ["<seg Meta 1>", "<seg Meta 2>", "<seg Meta 3>"]
    }
  ],
  "angulos_copy": [
    {
      "angulo": "<nome>",
      "publico_alvo": "<para quem>",
      "headline": "<headline>",
      "descricao": "<por que funciona>",
      "exemplo_hook": "<hook de exemplo>"
    }
  ],
  "estrutura_campanha": {
    "objetivo_meta": "<ex: Leads>",
    "orcamento_sugerido": "<ex: R$50-100/dia>",
    "conjuntos": [
      {
        "nome": "<nome>",
        "publico": "<qual público>",
        "tipo": "interesse|lookalike|remarketing|broad",
        "orcamento_percentual": "<ex: 50%>",
        "observacao": "<dica>"
      }
    ],
    "estrategia_teste": "<passo a passo>",
    "metricas_alvo": {
      "cpl_ideal": "<ex: R$20-40>",
      "ctr_minimo": "<ex: 1.5%>",
      "frequencia_max": "<ex: 3.0>",
      "roas_alvo": "<ex: 3x>"
    }
  },
  "alertas": ["<alerta1>", "<alerta2>"]
}

Gere: 3 nichos, 3 públicos, 4 ângulos de copy, 3 conjuntos. Mercado brasileiro, termos reais do Meta Ads.`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 4000,
    });

    const texto = completion.choices[0]?.message?.content ?? "{}";

    let resultado;
    try {
      resultado = JSON.parse(texto.replace(/```json|```/g, "").trim());
    } catch {
      return NextResponse.json({ error: "Erro ao processar resposta da IA. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, resultado, gerado_em: new Date().toISOString() });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("[funil-publico]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
