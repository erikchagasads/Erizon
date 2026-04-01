import { NextResponse, NextRequest } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const {
      nome, empresa, whatsapp,
      nicho, foco, ticket,
      objetivo, qualidade_leads, dor,
      estrutura, investimento,
      instagram,
      modo,
    } = body as Record<string, string>;

    const isPanorama = modo === "panorama_estrategico";

    const prompt = isPanorama
      ? buildPromptPanorama({ nome, empresa, nicho, foco, ticket, objetivo, qualidade_leads, dor, estrutura, investimento, instagram })
      : buildPromptGrowth({ nome, nicho, foco, ticket, objetivo, qualidade_leads, dor, estrutura, investimento, instagram });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Você é um analista estratégico de marketing e tráfego pago sênior. Responda APENAS com JSON válido, sem markdown, sem texto adicional antes ou depois.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "IA não retornou JSON válido" }, { status: 500 });
    }

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Erro ao parsear resposta da IA" }, { status: 500 });
    }

    // Salva lead (best effort)
    try {
      await fetch(`${req.nextUrl.origin}/api/leads/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_lead: nome,
          telefone: whatsapp?.replace(/\D/g, "") ? `55${whatsapp.replace(/\D/g, "")}` : undefined,
          canal: "lp_diagnostico_growth",
          status: "novo",
          nicho,
          faturamento: ticket,
          meta: objetivo,
        }),
      });
    } catch {
      // não bloqueia
    }

    return NextResponse.json(isPanorama ? { diagnostico: result } : { diagnostico: result });
  } catch (err) {
    console.error("[growth-diagnostico]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ── Prompt: Panorama Estratégico (para clientes do gestor de tráfego) ──────────
function buildPromptPanorama(d: Record<string, string>) {
  return `Você é um gestor de tráfego e estrategista de marketing digital com 10 anos de experiência em todos os nichos.

Você recebeu as respostas de um cliente em potencial:

- Nome: ${d.nome}${d.empresa ? ` / Empresa: ${d.empresa}` : ""}
- Nicho: ${d.nicho}
- Foco do negócio: ${d.foco}
- Ticket médio: ${d.ticket}
- Objetivo principal: ${d.objetivo}
- Qualidade dos leads hoje: ${d.qualidade_leads}
- Principal dor: ${d.dor}
- Estrutura digital: ${d.estrutura}
- Investimento em tráfego: ${d.investimento}${d.instagram ? `\n- Instagram: @${d.instagram.replace("@", "")}` : ""}

Gere um PANORAMA ESTRATÉGICO personalizado e específico para o nicho "${d.nicho}".
Seja direto, preciso, sem enrolar. Fale como especialista que já viu centenas de operações.
${d.instagram ? `Leve em conta que o cliente tem Instagram (@${d.instagram.replace("@", "")}) — mencione insights sobre presença digital.` : ""}

Responda EXATAMENTE neste JSON:

{
  "titulo": "título impactante específico para este negócio (máx 12 palavras)",
  "status_operacao": "2-3 frases diretas sobre o momento atual desta operação específica, sem ser genérico",
  "score": número de 0 a 100 (baseado na estrutura atual: sem estrutura digital = baixo, investimento alto + leads ruins = médio-baixo, tudo estruturado = alto),
  "ponto_critico": "o maior gargalo desta operação ESPECÍFICA para o nicho ${d.nicho} — seja cirúrgico",
  "oportunidades": [
    "oportunidade 1 específica para este nicho e situação",
    "oportunidade 2",
    "oportunidade 3"
  ],
  "recomendacao_comercial": "recomendação estratégica principal — canais, abordagem e tática específicos para ${d.nicho} com ticket ${d.ticket}",
  "recomendacao_residencial": ${d.foco?.includes("Misto") ? `"segunda recomendação para o lado residencial/complementar"` : "null"},
  "risco_atual": "o que acontece se continuar do jeito que está — consequência real e específica",
  "frase_fechamento": "frase de impacto curta (máx 20 palavras) que resume o que precisa ser feito — poderosa e direta",
  "cta_label": "texto do botão de agendamento (ex: 'Quero implementar essa estratégia')"
}`;
}

// ── Prompt: Diagnóstico de Growth Genérico ─────────────────────────────────────
function buildPromptGrowth(d: Record<string, string>) {
  return `Você é um analista sênior de growth com 15 anos de experiência em todos os nichos.

Dados do negócio:
- Nicho: ${d.nicho}
- Foco: ${d.foco}
- Ticket médio: ${d.ticket}
- Objetivo: ${d.objetivo}
- Qualidade dos leads: ${d.qualidade_leads}
- Principal dor: ${d.dor}
- Estrutura digital: ${d.estrutura}
- Investimento: ${d.investimento}${d.instagram ? `\n- Instagram: @${d.instagram.replace("@", "")}` : ""}

Entregue um diagnóstico de growth profundo e específico para o nicho "${d.nicho}".

JSON exato:

{
  "titulo_diagnostico": "título impactante específico",
  "resumo_executivo": "2-3 frases diretas sobre o momento atual e o maior gap",
  "score_growth": número 0-100,
  "principais_alavancas": [
    {
      "titulo": "nome",
      "descricao": "explicação direta",
      "impacto": "alto|médio|baixo",
      "prazo": "imediato|curto prazo|médio prazo",
      "como_comecar": "primeiro passo prático"
    }
  ],
  "plano_30_dias": ["semana 1", "semana 2", "semana 3", "semana 4"],
  "canais_recomendados": [
    { "canal": "nome", "por_que_para_este_nicho": "razão", "como_usar": "tática" }
  ],
  "alerta_critico": "maior erro ou gap atual",
  "proximos_passos": ["passo 1", "passo 2", "passo 3"],
  "frase_motivacional": "frase curta e direta"
}`;
}
