import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createServerSupabase } from "@/lib/supabase/server";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  let body: { brief: string; clientId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!body.brief?.trim()) {
    return NextResponse.json({ error: "Brief não pode ser vazio." }, { status: 400 });
  }

  const db = createServerSupabase();
  // Tenta workspace_members; fallback para user_id como workspace_id (schema legado)
  const { data: ws } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const workspaceId = ws?.workspace_id ?? auth.user.id;

  // Enriquece com Profit DNA + memória do cliente
  let contextoDNA = "";
  let contextoMemoria = "";

  if (body.clientId) {
    const [dna, memoria] = await Promise.all([
      db.from("profit_dna_snapshots").select("*").eq("workspace_id", workspaceId).eq("client_id", body.clientId).maybeSingle(),
      db.from("agente_memoria_cliente").select("*").eq("workspace_id", workspaceId).eq("cliente_id", body.clientId).maybeSingle(),
    ]);

    if (dna.data) {
      const d = dna.data;
      const bestDays = (d.best_days_of_week as { dayLabel: string }[] ?? []).slice(0, 2).map(x => x.dayLabel).join(", ");
      const bestFormat = (d.best_formats as { format: string; avgRoas: number }[] ?? []).slice(0, 1).map(x => `${x.format} (ROAS ${x.avgRoas?.toFixed(1)}x)`).join("");

      contextoDNA = `
PROFIT DNA DO CLIENTE:
- CPL mediano histórico: R$${d.cpl_median ?? "não disponível"}
- ROAS mediano histórico: ${d.roas_median ? `${d.roas_median.toFixed(1)}x` : "não disponível"}
- Melhores dias da semana: ${bestDays || "não identificado"}
- Melhor formato de criativo: ${bestFormat || "não identificado"}
- Frequência ideal antes de fadiga: ${d.frequency_sweet_spot ? `${d.frequency_sweet_spot.toFixed(1)}x` : "não identificado"}
- Orçamento médio de campanhas vencedoras: ${d.avg_budget_winner ? `R$${Math.round(d.avg_budget_winner)}/dia` : "não identificado"}
`;
    }

    if (memoria.data) {
      const m = memoria.data;
      const hooks = (m.ganchos_aprovados as string[] ?? []).slice(0, 3).join(", ");
      const copies = (m.copies_aprovadas as string[] ?? []).slice(0, 2).join(" | ");
      const formatos = (m.formatos_que_convertem as string[] ?? []).join(", ");

      contextoMemoria = `
MEMÓRIA ESTRATÉGICA DO CLIENTE:
- Nicho: ${m.nicho ?? "não informado"}
- Público-alvo: ${m.publico_alvo ?? "não informado"}
- CPL alvo: ${m.cpl_alvo ? `R$${m.cpl_alvo}` : "não definido"}
- ROAS alvo: ${m.roas_alvo ? `${m.roas_alvo}x` : "não definido"}
- Ganchos aprovados: ${hooks || "não registrado"}
- Copies aprovadas: ${copies || "não registrado"}
- Formatos que convertem: ${formatos || "não registrado"}
`;
    }
  }

  const systemPrompt = `Você é um especialista em tráfego pago no Brasil com 10 anos de experiência em Meta Ads.
Sua missão: transformar um brief em linguagem natural em uma estrutura COMPLETA de campanha pronta para implementação.

RESPONDA EM FORMATO JSON com a seguinte estrutura:
{
  "parsed": {
    "objetivo": "LEADS|SALES|TRAFFIC|AWARENESS",
    "publicoAlvo": "descrição do público",
    "geografia": "localização",
    "orcamentoDiario": 0,
    "metaCpl": 0,
    "metaLeads": 0,
    "prazo": "período da campanha"
  },
  "estrutura": {
    "nomeCampanha": "nome sugerido",
    "objetivo": "objetivo do Meta Ads",
    "orcamentoDiario": 0,
    "estrategiaBid": "Custo mais baixo|Custo alvo|ROAS alvo",
    "conjuntosAnuncio": [
      {
        "nome": "nome do conjunto",
        "publico": "descrição detalhada do público",
        "placamentos": ["Feed Instagram", "Stories", "Reels"],
        "orcamento": 0
      }
    ],
    "criativos": [
      {
        "titulo": "título do anúncio",
        "gancho": "primeiras palavras/frame",
        "copy": "texto completo do anúncio",
        "cta": "botão de CTA",
        "formato": "video|imagem|carrossel",
        "observacoes": "dicas específicas"
      }
    ],
    "cronograma": {
      "fase1": "descrição da fase 1 (aprendizado)",
      "fase2": "descrição da fase 2 (escala)",
      "kpisMonitorar": ["CPL", "CTR", "Frequência"],
      "gatilhoEscala": "quando escalar",
      "gatilhoPausa": "quando pausar"
    }
  },
  "alertas": ["alertas importantes sobre o setup"],
  "preflightScore": 0
}

${contextoDNA}
${contextoMemoria}

Seja específico, prático e orientado ao mercado brasileiro. Use linguagem técnica de gestor de tráfego.`;

  // Streaming response via Groq
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 2000,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Brief: ${body.brief}` },
          ],
          stream: true,
        });

        let fullText = "";
        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            fullText += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }

        // Salva no banco
        try {
          let parsed = {};
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);

          await db.from("campaign_briefs").insert({
            workspace_id:        workspaceId,
            client_id:           body.clientId ?? null,
            brief_text:          body.brief,
            generated_structure: parsed,
            status:              "draft",
          });
        } catch { /* ignora erros de parse/save */ }

      } catch {
        controller.enqueue(encoder.encode(JSON.stringify({ error: "Erro ao gerar estrutura." })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
