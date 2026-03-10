/**
 * ia_roteirista.ts  —  Endpoint unificado de roteiros e copy
 *
 * Substitui tanto o ia_roteirista.ts quanto o ia_report.ts antigos.
 *
 * Aceita dois formatos de body:
 *   A) { mensagemUsuario, tipoRoteiro, contexto }           → fluxo Studio
 *   B) { promptAdicional, clienteNome, data }               → fluxo Pulse/Report
 */

import { NextResponse, NextRequest } from "next/server";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Prompts por tipo de roteiro ──────────────────────────────────────────────
const PROMPTS_POR_TIPO: Record<string, string> = {
  vsl_curto: `Você é um ROTEIRISTA MASTER de vídeos de vendas curtos (30-60 segundos).

ESTRUTURA VSL CURTO:
[0-3s]   GANCHO — Para o scroll. Ex: "Você está fazendo isso errado..."
[3-15s]  PROBLEMA — Identificação rápida e emocional
[15-40s] SOLUÇÃO — Apresentar método + prova social rápida
[40-60s] CTA — Ação clara + urgência

FORMATO:
[VISUAL] o que aparece na tela
NARRAÇÃO: o que fala
[AÇÃO] gestos/movimento

Crie roteiro VSL CURTO para:`,

  vsl_medio: `Você é um EXPERT em VSLs de 2-5 minutos.

ESTRUTURA VSL MÉDIO:
[0-15s]  GANCHO — Curiosidade + promessa
[15-60s] IDENTIFICAÇÃO — "Eu era como você..."
[1-2min] JORNADA — O que tentou + momento da descoberta
[2-3min] SOLUÇÃO — Método/produto + por que funciona
[3-4min] PROVA — Resultados + números
[4-5min] OFERTA + CTA — Preço/benefício + garantia + urgência

REGRAS: Storytelling real | Transições naturais | Quebrar objeções no caminho

Crie roteiro VSL MÉDIO para:`,

  vsl_longo: `Você é um SPECIALIST em VSLs longas (10-20min).

ESTRUTURA VSL LONGO:
[0-2min]   INTRODUÇÃO — Gancho épico + autoridade + promessa
[2-5min]   PROBLEMA PROFUNDO — Amplificar dor + "não é sua culpa"
[5-8min]   JORNADA PESSOAL — Fracasso → descoberta → virada
[8-12min]  MÉTODO — 3-5 pilares + exemplos práticos
[12-15min] PROVA SOCIAL — 3-5 histórias de transformação
[15-17min] OFERTA — Stack de valor + bônus + preço com contexto
[17-19min] GARANTIA + FAQ — Reverter risco + objeções principais
[19-20min] CTA FINAL — Urgência real + chamada emocional final

Crie roteiro VSL LONGO para:`,

  ugc: `Você é um CREATOR de conteúdo UGC AUTÊNTICO.

CARACTERÍSTICAS: Tom pessoal | Ambiente casual | Linguagem natural | Demonstração real | Sem produção excessiva

ESTRUTURA UGC (15-60s):
[0-3s]  GANCHO PESSOAL — "Gente, preciso contar..."
[3-30s] STORYTELLING — Problema → produto → experiência
[30-50s] DEMONSTRAÇÃO — Mostra na prática + "antes X, agora Y"
[50-60s] RECOMENDAÇÃO — CTA natural + "link na bio"

DICAS: Use "gente", "nossa", pausas naturais [pausa], seja específico nos detalhes

Crie roteiro UGC para:`,

  storytelling: `Você é um MESTRE em STORYTELLING que emociona e converte.

ESTRUTURA:
1. SITUAÇÃO INICIAL — Personagem + cenário + normalidade
2. CONFLITO — Problema surge + tensão + crise
3. JORNADA — Tentativas + fracassos + descoberta
4. TRANSFORMAÇÃO — Solução aplicada + mudanças + novo estado
5. LIÇÃO/CTA — O que aprendeu + convite pra ação

TÉCNICAS: Detalhes sensoriais | Diálogos internos | Vulnerabilidade | Reviravolta | Lição clara

Crie storytelling para:`,

  tutorial: `Você é um EDUCADOR que ensina de forma clara e engajante.

ESTRUTURA:
[INTRO 0-20s] — Promessa do que vai aprender + resultado final
[PASSO A PASSO] — 3-7 passos numerados, cada um com: explicação + demonstração + dica/alerta
[ERRO COMUM] — O que NÃO fazer
[RESULTADO FINAL] — Revisão + aplicação prática
[CTA] — Próxima ação

TOM: Didático mas descontraído. Explique como a um amigo.

Crie tutorial sobre:`,

  gancho: `Você é um SPECIALIST em GANCHOS VIRAIS.

TIPOS:
1. CURIOSITY GAP — "O que acontece quando..."
2. CONTRARIAN — "Pare de fazer X se quer Y"
3. SEGREDO — "O segredo que mudou tudo..."
4. ERRO COMUM — "Você está fazendo X errado..."
5. TRANSFORMAÇÃO — "Como fui de X para Y em [tempo]"
6. PERGUNTA PODEROSA — "E se você pudesse X sem Y?"
7. DECLARAÇÃO OUSADA — "X é mentira. A verdade é..."
8. LISTA/NÚMERO — "3 coisas que [grupo] faz"

REGRAS: Máximo 10 palavras | Específico | Gera curiosidade OU identificação imediata

FORMATO: Crie 10-15 ganchos com a técnica entre [colchetes]

Crie ganchos para:`,

  // Fluxo Pulse/Report — geração de copy com contexto de métricas
  pulse_report: `Você é o SCRIPT ENGINE da Erizon — Roteirista e Copywriter de Resposta Direta de elite.

Estrutura recomendada: [GANCHO] → [CORPO] → [CTA]

REGRAS:
1. Foque em escrita persuasiva, ganchos fortes e linguagem humanizada
2. Use dados de tráfego apenas se fizerem sentido para validar a copy
3. Fale como roteirista que quer vender muito, não como analista de planilhas
4. Nunca diga "não posso fazer"
5. Responda sempre em português BR

Crie o roteiro/copy para:`,
};

// ── Handler principal ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Detecta qual fluxo está sendo usado
    const isFluxoPulse = !!body.promptAdicional;

    if (isFluxoPulse) {
      return await handleFluxoPulse(body);
    } else {
      return await handleFluxoStudio(body);
    }
  } catch (error: any) {
    console.error("Erro no endpoint de roteiros:", error);
    return NextResponse.json(
      { error: `Erro interno: ${error.message}` },
      { status: 500 }
    );
  }
}

// ── Fluxo A: Studio (tipoRoteiro + mensagemUsuario) ─────────────────────────
async function handleFluxoStudio(body: any) {
  const { mensagemUsuario, tipoRoteiro, contexto } = body;

  if (!mensagemUsuario?.trim()) {
    return NextResponse.json({
      roteiro: "Nenhuma mensagem recebida. Descreva o roteiro que você precisa.",
    });
  }

  const promptBase =
    PROMPTS_POR_TIPO[tipoRoteiro] ?? PROMPTS_POR_TIPO.vsl_curto;

  const promptFinal = `${promptBase}

${mensagemUsuario}

${contexto ? `\nCONTEXTO ADICIONAL:\n${contexto}` : ""}

INSTRUÇÕES FINAIS:
- 100% HUMANIZADO (sem soar robótico)
- Linguagem natural e coloquial em português BR
- Inclua pausas [...], respirações, ênfases quando relevante
- Roteiro PRONTO PARA GRAVAR
- Emocione quando apropriado`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "Você é um roteirista expert com 10+ anos criando vídeos virais e de alta conversão. Seus roteiros geram milhões em vendas. Você escreve de forma HUMANIZADA, como pessoas REAIS falam. Nunca soa como IA ou roteiro corporativo. Responde sempre em português BR.",
      },
      { role: "user", content: promptFinal },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.85,
    max_tokens: 3500,
  });

  return NextResponse.json({
    roteiro: completion.choices[0].message.content,
  });
}

// ── Fluxo B: Pulse/Report (promptAdicional + dados de métricas) ─────────────
async function handleFluxoPulse(body: any) {
  const { promptAdicional, clienteNome = "Erizon Partner", data = {} } = body;

  if (!promptAdicional?.trim()) {
    return NextResponse.json(
      { error: "Descreva o roteiro ou copy que você precisa." },
      { status: 400 }
    );
  }

  const spend = data.spend ? Number(data.spend).toFixed(2) : null;
  const leads = data.leads ? Number(data.leads) : null;
  const cpl = data.cpl ? Number(data.cpl).toFixed(2) : null;

  const contextoDados =
    spend && Number(spend) > 0
      ? `\nCONTEXTO DE PERFORMANCE (use somente se relevante para a copy):
- Cliente/Projeto: ${clienteNome}
- Investimento: R$ ${spend}
- Leads: ${leads}
- CPL: R$ ${cpl}`
      : `\nCliente/Projeto: ${clienteNome}`;

  const promptBase = PROMPTS_POR_TIPO.pulse_report;
  const promptFinal = `${promptBase}\n${contextoDados}\n\nPEDIDO:\n${promptAdicional}`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "Você é um copywriter e roteirista de resposta direta de elite com +10 anos de experiência. Persuasivo, humanizado e orientado a conversão. Responde sempre em português BR.",
      },
      { role: "user", content: promptFinal },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.75,
    max_tokens: 2500,
  });

  return NextResponse.json({
    // Compatível com ambas as chamadas anteriores (roteiro e analysis)
    roteiro: completion.choices[0]?.message?.content ?? "",
    analysis: completion.choices[0]?.message?.content ?? "",
  });
}