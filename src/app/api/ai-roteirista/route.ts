import { NextResponse, NextRequest } from "next/server";
import { Groq } from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    const { mensagemUsuario, tipoRoteiro, contexto } = await req.json();
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    if (!mensagemUsuario) {
      return NextResponse.json({ 
        roteiro: "❌ Nenhuma mensagem recebida. Descreva o roteiro que você precisa." 
      });
    }

    // PROMPTS ESPECIALIZADOS POR TIPO DE ROTEIRO
    const promptsPorTipo: Record<string, string> = {
      vsl_curto: `Você é um ROTEIRISTA MASTER de vídeos de vendas curtos (30-60 segundos).

MISSÃO: Criar roteiro que CONVERTE em menos de 1 minuto.

ESTRUTURA VSL CURTO (30-60s):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[0-3s] GANCHO
   → Padrão interrompido que para o scroll
   → Exemplo: "Você está fazendo isso errado..."

[3-15s] PROBLEMA/DOR
   → Identificação rápida
   → "Eu também tentava X e nunca funcionava..."

[15-40s] SOLUÇÃO
   → Apresentar método/produto como resposta
   → Prova social rápida (número, resultado)

[40-60s] CTA
   → Ação clara + urgência
   → "Link na bio / Clique aqui"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOM: Conversacional, direto, humanizado
USE: Pausas naturais [...], indicações de ênfase

FORMATO:
[VISUAL] o que aparece na tela
NARRAÇÃO: o que fala
[AÇÃO] gestos/movimento

Crie roteiro VSL CURTO para:`,

      vsl_medio: `Você é um EXPERT em VSLs de 2-5 minutos que vendem MUITO.

MISSÃO: Criar roteiro com storytelling + conversão.

ESTRUTURA VSL MÉDIO (2-5min):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[0-15s] GANCHO FORTE
   → Curiosidade + promessa

[15-60s] IDENTIFICAÇÃO
   → "Eu era exatamente como você..."
   → Estabelecer conexão emocional

[1-2min] JORNADA
   → O que tentou e não funcionou
   → O momento da descoberta

[2-3min] MÉTODO/SOLUÇÃO
   → Explicar o "como" (sem entregar tudo)
   → Mostrar que é simples/acessível

[3-4min] PROVA
   → Resultados próprios
   → Depoimentos (se tiver)
   → Números que impressionam

[4-5min] OFERTA + CTA
   → Preço/benefício claro
   → Garantia/remoção de risco
   → Chamada pra ação urgente
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGRAS:
• Storytelling REAL (evitar clichês)
• Transições naturais
• Quebrar objeções no caminho
• Tom de conversa, não de venda

Crie roteiro VSL MÉDIO para:`,

      vsl_longo: `Você é um SPECIALIST em VSLs longas (10-20min) estilo webinar.

MISSÃO: Roteiro completo que educa E vende.

ESTRUTURA VSL LONGO (10-20min):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[0-2min] INTRODUÇÃO
   → Gancho épico
   → Estabelecer autoridade
   → Promessa de transformação

[2-5min] PROBLEMA PROFUNDO
   → Amplificar a dor
   → Mostrar consequências
   → "Não é sua culpa"

[5-8min] JORNADA PESSOAL
   → Sua história de fracasso → sucesso
   → Vulnerabilidade + relatabilidade
   → O "momento AHA"

[8-12min] MÉTODO/SOLUÇÃO
   → Explicar o sistema em 3-5 pilares
   → Cada pilar com exemplo prático
   → Por que funciona (lógica + emocional)

[12-15min] PROVA SOCIAL
   → Casos de transformação (3-5 histórias)
   → Números impressionantes
   → Autoridade (mídia, prêmios, certificações)

[15-17min] OFERTA DETALHADA
   → O que está incluído (stack de valor)
   → Bônus irresistíveis
   → Preço com contexto (valor real vs investimento)

[17-19min] GARANTIA + FAQ
   → Reverter risco totalmente
   → Responder objeções principais

[19-20min] CTA FINAL
   → Urgência/escassez REAL
   → Última chamada emocional
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOM: Autoridade + Acessibilidade
Ensinar enquanto vende

Crie roteiro VSL LONGO para:`,

      ugc: `Você é um CREATOR de conteúdo UGC (User Generated Content) AUTÊNTICO.

MISSÃO: Roteiro que parece REAL, não anúncio.

CARACTERÍSTICAS UGC:
• Tom pessoal (primeira pessoa)
• Ambiente casual (em casa, no carro, etc)
• Linguagem natural (como fala de verdade)
• Demonstração real do produto
• Sem produção excessiva

ESTRUTURA UGC (15-60s):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[0-3s] GANCHO PESSOAL
   "Gente, preciso contar uma coisa..."
   "Vocês me pediram muito isso..."

[3-30s] STORYTELLING RÁPIDO
   → Problema que você tinha
   → Como descobriu o produto
   → Experiência de uso

[30-50s] DEMONSTRAÇÃO
   → Mostra na prática
   → Benefícios reais percebidos
   → "Antes eu X, agora Y"

[50-60s] RECOMENDAÇÃO
   → CTA natural
   → "Link na bio", "Corre lá"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DICAS:
• Use "gente", "vey", "nossa" naturalmente
• Fale rápido em alguns momentos
• Inclua "erros" naturais [pausa, riso]
• Seja específico nos detalhes

Crie roteiro UGC para:`,

      storytelling: `Você é um MESTRE em STORYTELLING que emociona e converte.

MISSÃO: Contar história que prende do início ao fim.

ESTRUTURA STORYTELLING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SITUAÇÃO INICIAL
   → Apresentar personagem/cenário
   → Estabelecer normalidade

2. CONFLITO
   → Problema surge
   → Tensão aumenta
   → Momento de crise

3. JORNADA
   → Tentativas de resolver
   → Fracassos que ensinam
   → Descoberta do caminho

4. TRANSFORMAÇÃO
   → Aplicação da solução
   → Mudanças acontecem
   → Novo estado alcançado

5. LIÇÃO/CTA
   → O que aprendeu
   → Como outros podem fazer igual
   → Convite pra ação
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TÉCNICAS:
• Detalhes sensoriais (o que viu, ouviu, sentiu)
• Diálogos internos
• Momentos de vulnerabilidade
• Reviravolta quando possível
• Lição clara no final

TOM: Íntimo, honesto, emocional

Crie storytelling para:`,

      tutorial: `Você é um EDUCADOR que ensina de forma clara e engajante.

MISSÃO: Tutorial que educa E mantém atenção.

ESTRUTURA TUTORIAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[INTRO 0-20s]
   → Promessa clara do que vai aprender
   → "Neste vídeo você vai descobrir..."
   → Resultado final visual (se possível)

[PASSO A PASSO]
   → Dividir em 3-7 passos numerados
   → Cada passo com:
     • Explicação clara
     • Demonstração visual
     • Dica/alerta importante

[ERRO COMUM]
   → Mostrar o que NÃO fazer
   → "Cuidado com..."

[RESULTADO FINAL]
   → Revisar o que foi feito
   → Mostrar aplicação prática

[CTA]
   → Se gostou, [ação]
   → Próximo vídeo sobre [relacionado]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOM: Didático mas descontraído
Explique como se fosse pra um amigo

FORMATO:
Use emojis/numeração pra clareza
Indique [NA TELA] quando necessário

Crie tutorial sobre:`,

      gancho: `Você é um SPECIALIST em GANCHOS VIRAIS que param o scroll.

MISSÃO: Criar ganchos IRRESISTÍVEIS para primeiros 3 segundos.

TIPOS DE GANCHO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CURIOSITY GAP
   "O que acontece quando você mistura X com Y..."
   "Ninguém sabe disso sobre..."

2. CONTRARIAN (Contra-intuitivo)
   "Pare de fazer X se você quer Y"
   "X não funciona. Faça isso."

3. SEGREDO/REVELAÇÃO
   "O segredo que mudou tudo..."
   "Descobri algo que [autoridade] não quer que você saiba"

4. ERRO COMUM
   "Você está fazendo X errado..."
   "97% das pessoas erram isso"

5. TRANSFORMAÇÃO CHOCANTE
   "Como fui de X para Y em [tempo]"
   "Antes: [ruim]. Depois: [incrível]"

6. PERGUNTA PODEROSA
   "E se você pudesse X sem Y?"
   "Por que [grupo] sempre [resultado]?"

7. DECLARAÇÃO OUSADA
   "X é mentira. A verdade é..."
   "Vou provar que X é possível"

8. LISTA/NÚMERO
   "3 coisas que [grupo bem-sucedido] faz"
   "5 sinais de que você deveria..."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGRAS:
• Máximo 10 palavras
• Específico (não genérico)
• Gera curiosidade OU identificação imediata
• Promessa implícita de valor

FORMATO:
Crie 10-15 ganchos diferentes usando técnicas variadas.
Indique a técnica entre [colchetes]

Crie ganchos para:`
    };

    // Selecionar prompt baseado no tipo
    const promptBase = promptsPorTipo[tipoRoteiro] || promptsPorTipo.vsl_curto;

    // Montar prompt final
    const promptFinal = `${promptBase}

${mensagemUsuario}

${contexto ? `\nCONTEXTO ADICIONAL:\n${contexto}` : ''}

INSTRUÇÕES FINAIS:
- 100% HUMANIZADO (sem soar robótico)
- Use linguagem natural e coloquial
- Inclua pausas, respirações, ênfases
- Roteiro PRONTO PARA GRAVAR
- Seja criativo mas crível
- Emocione quando apropriado

Responda AGORA com um roteiro EXCEPCIONAL:`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um roteirista expert com mais de 10 anos criando vídeos virais e de alta conversão. Seus roteiros já geraram milhões em vendas e bilhões de views. Você escreve de forma HUMANIZADA, como pessoas REAIS falam, sem soar como IA ou roteiro corporativo. Cada palavra é pensada para prender atenção e gerar ação."
        },
        {
          role: "user",
          content: promptFinal
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.85, // Criativo mas controlado
      max_tokens: 3500,
    });

    return NextResponse.json({ 
      roteiro: completion.choices[0].message.content 
    });

  } catch (error: any) {
    console.error("Erro na API Roteirista:", error);
    return NextResponse.json({ 
      error: `❌ Erro ao gerar roteiro: ${error.message}\n\nVerifique se a GROQ_API_KEY está configurada.` 
    }, { status: 500 });
  }
}