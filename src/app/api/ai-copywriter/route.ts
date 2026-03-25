import { NextResponse, NextRequest } from "next/server";
import { Groq } from "groq-sdk";
import { requireAuth } from "@/lib/auth-guard";
import { getContextoCliente } from "@/lib/agente-memoria";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit, rateLimitHeaders, RATE_LIMIT_PRESETS } from "@/lib/rate-limiter";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Skills de Copy ────────────────────────────────────────────────────────────

const SKILLS: Record<string, (ctx: string) => string> = {

  headline: (ctx) => `Você é especialista em headlines de alta conversão para o mercado brasileiro.

TÉCNICAS QUE VOCÊ DOMINA:
• Curiosity Gap — cria lacuna de curiosidade irresistível
• Benefit-Driven — benefício claro e direto ao ponto
• Number-Based — números específicos que geram credibilidade
• How-To — ensinamento valioso que promete resultado
• Negative Angle — dor/medo que força identificação
• Question-Based — pergunta poderosa que exige resposta
• Shock Value — surpreende e para o scroll
• Social Proof — prova social que gera confiança

CONTEXTO:
${ctx}

TAREFA: Crie 10 headlines usando técnicas variadas. Indique a técnica entre [colchetes].
Responda SOMENTE as headlines, sem introdução ou explicação extra.`,

  cta: (ctx) => `Você é especialista em CTAs que geram cliques e conversões no Brasil.

TIPOS DE CTA:
• Baixo compromisso — fácil de dizer sim
• Alto compromisso — para quem já está convencido
• Urgência — escassez real ou deadline
• Curiosidade — desperta vontade de descobrir
• Prova social — "junte-se a X pessoas"
• Benefício direto — o que ganho ao clicar

CONTEXTO:
${ctx}

TAREFA: Crie 8 CTAs variados. Indique o tipo entre [colchetes].
Responda SOMENTE os CTAs.`,

  body_ad: (ctx) => `Você é copywriter expert em anúncios pagos para Meta Ads Brasil.

ESTRUTURA OBRIGATÓRIA: Gancho → Agitação → Solução → Prova → CTA

FÓRMULAS QUE VOCÊ USA:
• PAS — Problema, Agitação, Solução
• AIDA — Atenção, Interesse, Desejo, Ação
• Before/After/Bridge — antes, depois, como chegar lá
• 4Ps — Picture, Promise, Prove, Push

CONTEXTO:
${ctx}

TAREFA: Crie 3 versões de body copy (80-120 palavras cada):
- Versão 1: focada em DOR (o que a pessoa perde sem agir)
- Versão 2: focada em DESEJO (o que a pessoa ganha)
- Versão 3: focada em CURIOSIDADE (cria lacuna de informação)`,

  email: (ctx) => `Você é expert em email marketing de alta conversão para o Brasil.

ESTRUTURA COMPLETA:
ASSUNTO: [irresistível, máx 50 chars, abre o email]
PREVIEW: [complementa o assunto, máx 90 chars]
ABERTURA: [gancho forte — 1 frase que prende]
CORPO: [história → identificação → solução → prova]
CTA: [único e claro — aparece 2x no email]
P.S.: [reforça o benefício principal ou cria urgência]

REGRAS:
- Escreva como para UM amigo específico
- Parágrafos de 1-3 linhas máximo
- Linguagem pessoal, coloquial, sem corporativo
- Emojis apenas se o nicho permitir

CONTEXTO:
${ctx}

Crie o email completo seguindo a estrutura acima.`,

  landing_page: (ctx) => `Você é expert em landing pages de alta conversão.

ESTRUTURA COMPLETA:
1. HERO: Headline + Sub-headline + CTA primário + prova visual
2. PROBLEMA: 3-5 dores do avatar (linguagem emocional)
3. SOLUÇÃO: Como funciona em 3-5 passos simples
4. BENEFÍCIOS: 6-8 benefícios reais (não features técnicas)
5. PROVA SOCIAL: Depoimentos com números + foto/nome
6. AUTORIDADE: Quem é você + por que confiar
7. GARANTIA: Reverte 100% do risco da compra
8. FAQ: 5-7 objeções respondidas com honestidade
9. CTA FINAL: Urgência + escassez + ação clara

CONTEXTO:
${ctx}

Crie a copy completa da landing page seguindo essa estrutura.`,

  copy_carrossel: (ctx) => `Você é copywriter de carrosseis do Instagram/Facebook que param o scroll e geram engajamento e cliques.

REGRAS DO CARROSSEL:
- Slide 1: Hook impossível de ignorar — para o scroll
- Slides 2-5: Conteúdo que entrega valor E gera desejo
- Penúltimo slide: Prova social ou resultado
- Último slide: CTA forte com instrução clara

TÉCNICAS:
• Listicle — "5 erros que..."
• Before/After — transformação visual
• Tutorial — passo a passo
• Segredo revelado — "o que ninguém te contou"
• Comparativo — "você vs quem faz certo"

CONTEXTO:
${ctx}

FORMATO por slide:
SLIDE [N]: [Título/headline]
[Texto do slide — máx 2-3 linhas]
[CTA se for o último]`,

  copy_imagem: (ctx) => `Você é copywriter de anúncios de imagem estática para Meta Ads Brasil.

ELEMENTOS DA COPY DE IMAGEM:
• Headline da imagem: máx 5-7 palavras, fonte grande
• Texto principal do feed: máx 125 chars para não cortar
• Descrição abaixo do link: reforça a headline
• CTA do botão: ação específica

GATILHOS QUE FUNCIONAM EM IMAGEM:
• Número específico ("R$47 apenas hoje")
• Pergunta direta ("Você ainda faz isso?")
• Declaração ousada ("Isso dobrou meu faturamento")
• Benefício imediato ("Resultado em 7 dias")

CONTEXTO:
${ctx}

TAREFA: Crie 4 variações completas de copy para imagem estática.
FORMATO:
VERSÃO [N]:
HEADLINE DA IMAGEM: 
TEXTO PRINCIPAL:
DESCRIÇÃO:
BOTÃO CTA:`,
};

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.user) return auth.response;

    const rl = checkRateLimit(`ai-copywriter:${auth.user.id}`, RATE_LIMIT_PRESETS.ai);
    const rlHeaders = rateLimitHeaders(rl, RATE_LIMIT_PRESETS.ai.limit);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit atingido. Aguarde antes de gerar nova copy." },
        { status: 429, headers: rlHeaders }
      );
    }

    const { mensagemUsuario, tipoCopy, contexto, cliente_id } = await req.json();

    if (!mensagemUsuario?.trim()) {
      return NextResponse.json({
        copy: "Nenhuma mensagem recebida. Por favor, descreva a copy que você precisa.",
      });
    }

    // Buscar memória do cliente se informado
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const memoriaCliente = await getContextoCliente(supabase, auth.user.id, cliente_id, "copywriter");

    const ctxFinal = [mensagemUsuario, contexto, memoriaCliente].filter(Boolean).join("\n\nCONTEXTO ADICIONAL:\n");
    const skillFn = SKILLS[tipoCopy] ?? SKILLS.headline;
    const prompt = skillFn(ctxFinal);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Você é o Copiloto Criativo da Erizon — copywriter de classe mundial especializado em direct response para o mercado brasileiro de tráfego pago.

IDENTIDADE:
- 15+ anos de experiência em copy de alta conversão
- Especialista em Meta Ads, funis de venda e email marketing
- Conhece profundamente o mercado digital brasileiro
- Cada palavra tem propósito: persuadir, converter, vender

PRINCÍPIOS:
- Nunca seja genérico — cada copy é única para o contexto dado
- Use dados reais da campanha quando disponíveis
- Priorize clareza sobre criatividade — copy clara converte mais
- Escreva como humano, não como IA corporativa
- Português BR fluente, coloquial quando apropriado
- Nunca diga "não posso" — adapte e entregue sempre`,
        },
        { role: "user", content: prompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.85,
      max_tokens: 3000,
    });

    return NextResponse.json({
      copy: completion.choices[0].message.content,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro inesperado";
    console.error("Erro na API Copywriter:", msg);
    return NextResponse.json(
      { error: `Erro ao gerar copy: ${msg}` },
      { status: 500 }
    );
  }
}
