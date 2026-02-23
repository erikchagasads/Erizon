import { NextResponse, NextRequest } from "next/server";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { metrics, mensagemUsuario, contexto } = await req.json();

    const listaCampanhas = Array.isArray(metrics)
      ? metrics
      : metrics
      ? [metrics]
      : [];

    if (listaCampanhas.length === 0) {
      return NextResponse.json({
        analysis:
          "Nenhuma campanha encontrada. Verifique se há campanhas sincronizadas no sistema.",
      });
    }

    // ── Formata resumo das campanhas para o prompt ─────────────────────────
    const resumoCampanhas = listaCampanhas
      .map((c: any) => {
        const gasto = Number(c.gasto_total ?? 0);
        const contatos = Number(c.contatos ?? 0);
        const orcamento = Number(c.orcamento ?? 0);
        const impressoes = Number(c.impressoes ?? 0);
        const alcance = Number(c.alcance ?? 0);

        const cpl = contatos > 0 ? (gasto / contatos).toFixed(2) : "0.00";
        const pctGasto =
          orcamento > 0 ? ((gasto / orcamento) * 100).toFixed(1) : "0.0";
        const freq =
          alcance > 0 ? (impressoes / alcance).toFixed(2) : "N/A";

        return [
          `• ${c.nome_campanha ?? "SEM NOME"}`,
          `  Status: ${c.status ?? "—"}`,
          `  Gasto: R$ ${gasto.toFixed(2)} | Budget: R$ ${orcamento.toFixed(2)} (${pctGasto}% usado)`,
          `  Leads: ${contatos} | CPL: R$ ${cpl}`,
          `  Impressões: ${impressoes.toLocaleString("pt-BR")} | Alcance: ${alcance.toLocaleString("pt-BR")} | Frequência: ${freq}`,
        ].join("\n");
      })
      .join("\n\n");

    const isTodas = listaCampanhas.length > 1;

    const promptBase = `Você é um ANALISTA SÊNIOR de Meta Ads com 10+ anos de experiência.

${
  isTodas
    ? `ANÁLISE CONSOLIDADA — ${listaCampanhas.length} CAMPANHAS:`
    : `ANÁLISE DA CAMPANHA: "${listaCampanhas[0]?.nome_campanha ?? ""}"`
}

${resumoCampanhas}

${contexto ? `\nCONTEXTO ADICIONAL:\n${contexto}` : ""}

CRITÉRIOS DE AVALIAÇÃO (use estes benchmarks):
- CPL: abaixo de R$15 = excelente | R$15-30 = bom | R$30-50 = atenção | acima de R$50 = crítico
- Frequência: acima de 2.5 = sinal de alarme de saturação de audiência
- Budget consumo: acima de 90% = risco de interrupção de entrega

REGRAS DE RESPOSTA:
- Use APENAS os dados fornecidos acima, nunca invente números
- Se for pergunta específica → responda diretamente ao ponto
- Se for diagnóstico geral → use o formato: DIAGNÓSTICO → PROBLEMAS → OPORTUNIDADES → TOP 3 AÇÕES
- Seja objetivo, máximo 400 palavras
- Quando analisar múltiplas campanhas, destaque sempre a melhor e a pior performance
- Indique frequência alta (>2.5) como alarme explícito
- Termine com uma ação concreta e prioritária`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Você é um analista sênior de Meta Ads. Direto, preciso, orientado a dados. Responde sempre em português BR. Foca no que o gestor precisa fazer AGORA para melhorar resultados.",
        },
        {
          role: "system",
          content: promptBase,
        },
        {
          role: "user",
          content:
            mensagemUsuario ||
            (isTodas
              ? "Faça um diagnóstico completo de todas as campanhas."
              : "Faça um diagnóstico completo desta campanha."),
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens: 2000,
    });

    return NextResponse.json({
      analysis: completion.choices[0].message.content,
    });
  } catch (error: any) {
    console.error("Erro na API AI Analyst:", error);
    return NextResponse.json(
      { error: `Erro ao processar análise: ${error.message}` },
      { status: 500 }
    );
  }
}