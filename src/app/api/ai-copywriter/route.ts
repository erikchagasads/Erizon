import { NextResponse, NextRequest } from "next/server";
import { Groq } from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    const { mensagemUsuario, tipoCopy, contexto } = await req.json();
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    if (!mensagemUsuario) {
      return NextResponse.json({ 
        copy: "❌ Nenhuma mensagem recebida. Por favor, descreva a copy que você precisa." 
      });
    }

    // PROMPTS ESPECIALIZADOS POR TIPO DE COPY
    const promptsPorTipo: Record<string, string> = {
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

FORMATO DE RESPOSTA:
Crie 8-10 headlines diferentes usando técnicas variadas.
Para cada headline, indique a técnica usada entre parênteses.

Exemplo:
1. "Como Ganhar R$ 10k/mês Sem Sair de Casa (Mesmo Começando do Zero)" [Benefit + Number + Negative Angle]
2. "O Erro Que 97% dos Empreendedores Cometem (E Como Evitar)" [Curiosity + Number + Negative]

Agora crie headlines para:`,

      cta: `Você é um MESTRE em CTAs (Call-to-Action) que geram cliques e conversões.

MISSÃO: Criar CTAs que OBRIGAM a pessoa a agir AGORA.

ELEMENTOS DE UM CTA PODEROSO:
• Ação clara (verbo imperativo forte)
• Benefício imediato
• Urgência ou escassez (quando apropriado)
• Remoção de fricção ("gratuito", "sem compromisso", etc)
• Palavras de poder (garantido, comprovado, exclusivo)

TIPOS DE CTA:
1. CTA de baixo compromisso (teste grátis, amostra)
2. CTA de alto compromisso (comprar agora)
3. CTA de curiosidade (descobrir mais)
4. CTA de urgência (últimas vagas)

FORMATO DE RESPOSTA:
Crie 6-8 CTAs diferentes para diferentes contextos.
Varie entre baixo e alto compromisso.

Exemplo:
1. "Começar Meu Teste Grátis de 7 Dias" [Baixo compromisso + Benefício]
2. "Garantir Minha Vaga com 50% OFF (Últimas 3 Vagas!)" [Urgência + Desconto]

Agora crie CTAs para:`,

      body_ad: `Você é um COPYWRITER EXPERT em anúncios pagos (Meta Ads, Google Ads).

MISSÃO: Criar body copy que PRENDE atenção, gera DESEJO e leva à AÇÃO.

ESTRUTURA RECOMENDADA:
1. GANCHO - Primeira frase que captura atenção (dor, curiosidade, benefício chocante)
2. AGITAÇÃO - Amplificar o problema/desejo
3. SOLUÇÃO - Apresentar a oferta como resposta perfeita
4. PROVA - Credibilidade (números, depoimentos, garantia)
5. CTA - Ação clara

TÉCNICAS:
• PAS (Problem, Agitate, Solution)
• AIDA (Attention, Interest, Desire, Action)
• Storytelling em primeira pessoa
• Quebra de objeções antecipada

FORMATO:
Crie 2-3 versões de body copy completo (cada um com 50-100 palavras).
Uma versão focada em DOR, outra em DESEJO, outra em CURIOSIDADE.

Agora crie body copy para:`,

      vsl: `Você é um ROTEIRISTA EXPERT em VSLs (Video Sales Letters) que vendem milhões.

MISSÃO: Criar roteiro de VSL persuasivo e humanizado.

ESTRUTURA CLÁSSICA DE VSL:
1. GANCHO (0-15s) - Padrão interrompido, promessa grande, curiosidade
2. IDENTIFICAÇÃO (15-60s) - "Eu era como você..."
3. DESCOBERTA (1-3min) - O momento de virada, o segredo
4. SOLUÇÃO (3-5min) - Apresentar o método/produto
5. PROVA (5-8min) - Resultados, cases, números
6. OFERTA (8-10min) - Preço, bônus, garantia
7. CTA FINAL (10-12min) - Urgência, ação clara

TOM:
• Conversacional (como se estivesse falando com um amigo)
• Storytelling forte
• Emocional mas crível
• Quebras de objeção ao longo do caminho

FORMATO:
Crie estrutura completa do VSL com minutagem aproximada.
Use [VISUAL] para indicar o que aparece na tela.

Agora crie VSL para:`,

      email: `Você é um EXPERT em EMAIL MARKETING de alta conversão.

MISSÃO: Criar emails que são ABERTOS, LIDOS e geram AÇÃO.

TIPOS DE EMAIL:
1. Welcome Email (boas-vindas)
2. Nurture Email (educação/relacionamento)
3. Sales Email (venda direta)
4. Cart Abandonment (carrinho abandonado)
5. Re-engagement (reativar)

ESTRUTURA:
• ASSUNTO - Irresistível, curioso, pessoal (max 50 caracteres)
• PREVIEW TEXT - Complementa o assunto
• ABERTURA - Gancho forte primeira linha
• CORPO - História, benefício, prova
• CTA - Único e claro
• P.S. - Reforço final poderoso

REGRAS DE OURO:
• Escrever como se fosse para UM amigo
• Parágrafos curtos (2-3 linhas max)
• Bullet points quando listar benefícios
• CTA aparecer 2x (meio e fim)

FORMATO:
Crie email completo com:
━━━━━━━━━━━
ASSUNTO: [assunto aqui]
PREVIEW: [preview aqui]
━━━━━━━━━━━
[corpo do email]
━━━━━━━━━━━

Agora crie email para:`,

      landing_page: `Você é um EXPERT em LANDING PAGES de alta conversão.

MISSÃO: Criar copy completa de landing page que converte visitantes em leads/clientes.

ESTRUTURA COMPLETA:
1. HERO SECTION
   - Headline principal (benefício único)
   - Sub-headline (amplificação)
   - CTA primário

2. PROBLEMA/AGITAÇÃO
   - 3-5 dores específicas do avatar
   - "Você já sentiu que..."

3. SOLUÇÃO
   - Apresentar oferta como resposta perfeita
   - Como funciona (3-5 passos)

4. BENEFÍCIOS
   - 5-8 benefícios (não features)
   - Cada um com ícone/emoji sugerido

5. PROVA SOCIAL
   - Depoimentos (sugerir 3-5)
   - Números de resultado
   - Logos de parceiros/mídia

6. GARANTIA
   - Reverter risco totalmente

7. FAQ
   - 5-7 objeções comuns respondidas

8. CTA FINAL
   - Urgência/escassez
   - Ação clara

FORMATO:
Criar seções completas com copy pronta.
Usar formatação clara (títulos, bullets, destaques).

Agora crie landing page para:`
    };

    // Selecionar prompt baseado no tipo
    const promptBase = promptsPorTipo[tipoCopy] || promptsPorTipo.headline;

    // Montar prompt final
    const promptFinal = `${promptBase}

${mensagemUsuario}

${contexto ? `\nCONTEXTO ADICIONAL:\n${contexto}` : ''}

INSTRUÇÕES FINAIS:
- Seja criativo e surpreendente
- Use copywriting de ALTO NÍVEL
- Entregue conteúdo PRONTO PARA USAR
- Seja específico e acionável
- Use emojis quando melhorar a copy
- NUNCA seja genérico ou clichê

Responda AGORA com excelência:`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um copywriter de classe mundial, especialista em direct response, storytelling persuasivo e copy que converte. Seu trabalho já gerou milhões em vendas. Você escreve com personalidade, criatividade e sempre foca em resultados. Cada palavra importa."
        },
        {
          role: "user",
          content: promptFinal
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.9, // Mais criativo para copywriting
      max_tokens: 3000,
    });

    return NextResponse.json({ 
      copy: completion.choices[0].message.content 
    });

  } catch (error: any) {
    console.error("Erro na API Copywriter:", error);
    return NextResponse.json({ 
      error: `❌ Erro ao gerar copy: ${error.message}\n\nVerifique se a GROQ_API_KEY está configurada.` 
    }, { status: 500 });
  }
}