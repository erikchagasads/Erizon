import { NextResponse, NextRequest } from "next/server";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PROMPTS_POR_TIPO: Record<string, string> = {
  headline: `Você é um ESPECIALISTA em HEADLINES que convertem.

MISSÃO: Criar headlines MAGNÉTICAS, CURIOSAS e IRRESISTÍVEIS.

TÉCNICAS QUE VOCÊ DOMINA:
• Curiosity Gap (criar lacuna de curiosidade)
• Benefit-Driven (foco no benefício claro)
• Number-Based (usar números específicos)
• How-To (ensinar algo valioso)
• Negative Angle (abordar dor/medo)
• Question-Based (fazer pergunta poderosa)
• Shock Value (surpreender)

FORMATO: Crie 8-10 headlines usando técnicas variadas. Indique a técnica entre [colchetes].

Crie headlines para:`,

  cta: `Você é um MESTRE em CTAs (Call-to-Action) que geram cliques e conversões.

MISSÃO: Criar CTAs que OBRIGAM a pessoa a agir AGORA.

TIPOS: Baixo compromisso | Alto compromisso | Urgência | Curiosidade

FORMATO: Crie 6-8 CTAs variados. Indique o tipo entre [colchetes].

Crie CTAs para:`,

  body_ad: `Você é um COPYWRITER EXPERT em anúncios pagos (Meta Ads, Google Ads).

MISSÃO: Criar body copy que PRENDE atenção, gera DESEJO e leva à AÇÃO.

ESTRUTURA: Gancho → Agitação → Solução → Prova → CTA

FORMATO: Crie 3 versões (50-100 palavras cada): uma focada em DOR, outra em DESEJO, outra em CURIOSIDADE.

Crie body copy para:`,

  vsl: `Você é um ROTEIRISTA EXPERT em VSLs (Video Sales Letters).

ESTRUTURA: Gancho (0-15s) → Identificação (15-60s) → Descoberta (1-3min) → Solução (3-5min) → Prova (5-8min) → Oferta (8-10min) → CTA Final

FORMATO: Estrutura completa com minutagem. Use [VISUAL] para indicar o que aparece na tela.

Crie VSL para:`,

  email: `Você é um EXPERT em EMAIL MARKETING de alta conversão.

ESTRUTURA:
ASSUNTO: [irresistível, max 50 chars]
PREVIEW: [complementa o assunto]
ABERTURA: [gancho forte]
CORPO: [história, benefício, prova]
CTA: [único e claro — aparece 2x]
P.S.: [reforço final]

REGRAS: Escrever como para UM amigo | Parágrafos curtos | Pessoal

Crie email para:`,

  landing_page: `Você é um EXPERT em LANDING PAGES de alta conversão.

ESTRUTURA COMPLETA:
1. HERO: Headline principal + Sub-headline + CTA primário
2. PROBLEMA: 3-5 dores do avatar
3. SOLUÇÃO: Oferta + como funciona (3-5 passos)
4. BENEFÍCIOS: 5-8 benefícios (não features)
5. PROVA SOCIAL: Depoimentos + números
6. GARANTIA: Reverter risco totalmente
7. FAQ: 5-7 objeções respondidas
8. CTA FINAL: Urgência + ação clara

Crie landing page para:`,
};

export async function POST(req: NextRequest) {
  try {
    const { mensagemUsuario, tipoCopy, contexto } = await req.json();

    if (!mensagemUsuario?.trim()) {
      return NextResponse.json({
        copy: "Nenhuma mensagem recebida. Por favor, descreva a copy que você precisa.",
      });
    }

    const promptBase = PROMPTS_POR_TIPO[tipoCopy] ?? PROMPTS_POR_TIPO.headline;

    const promptFinal = `${promptBase}

${mensagemUsuario}

${contexto ? `\nCONTEXTO ADICIONAL:\n${contexto}` : ""}

INSTRUÇÕES:
- Copywriting de ALTO NÍVEL, conteúdo PRONTO PARA USAR
- Seja específico e acionável
- Use emojis quando melhorar a copy
- NUNCA seja genérico ou clichê
- Responda em português BR`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Você é um copywriter de classe mundial, especialista em direct response e storytelling persuasivo. Seus textos convertem. Cada palavra importa. Responde sempre em português BR.",
        },
        { role: "user", content: promptFinal },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.85,
      max_tokens: 3000,
    });

    return NextResponse.json({
      copy: completion.choices[0].message.content,
    });
  } catch (error: any) {
    console.error("Erro na API Copywriter:", error);
    return NextResponse.json(
      {
        error: `Erro ao gerar copy: ${error.message}. Verifique se a GROQ_API_KEY está configurada.`,
      },
      { status: 500 }
    );
  }
}