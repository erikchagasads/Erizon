// src/app/api/cron/blog/route.ts
// Cron job diário — gera 1 artigo novo usando Groq + publica no Supabase
// Configurar no vercel.json:
// { "crons": [{ "path": "/api/cron/blog", "schedule": "0 8 * * *" }] }
// Roda todo dia às 8h (UTC) = 5h BRT

import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const CURRENT_BLOG_YEAR = 2026;

// ── Banco de pautas rotativas ─────────────────────────────────────────────────

const PAUTAS_EDUCACIONAIS = [
  { titulo: "Como calcular o CPL ideal para o seu nicho no Meta Ads", categoria: "Métricas" },
  { titulo: "ROAS vs ROI: qual métricas importa mais para gestores de tráfego", categoria: "Métricas" },
  { titulo: "Como identificar campanhas zumbi antes que drenem seu budget", categoria: "Estratégia" },
  { titulo: "Frequência no Meta Ads: o número que a maioria dos gestores ignora", categoria: "Estratégia" },
  { titulo: "Quando pausar e quando escalar: o guia definitivo para decisões de campanha", categoria: "Estratégia" },
  { titulo: "CTR baixo ou CPL alto? Como diagnosticar o problema certo na campanha", categoria: "Métricas" },
  { titulo: "Público frio vs. quente: quando usar cada um no Meta Ads", categoria: "Estratégia" },
  { titulo: "Como estruturar campanhas por cliente sem misturar dados", categoria: "Gestão" },
  { titulo: "Automação de campanhas no Meta Ads: o que funciona e o que queima dinheiro", categoria: "Automação" },
  { titulo: "Health Score de conta: como avaliar a saúde das suas campanhas", categoria: "Métricas" },
  { titulo: "Saturação de criativo: sinais de alerta e como agir antes do colapso", categoria: "Criativos" },
  { titulo: "Como criar relatórios de performance que impressionam clientes", categoria: "Gestão" },
  { titulo: `Budget diário vs. vitalício: qual funciona melhor no Meta Ads ${CURRENT_BLOG_YEAR}`, categoria: "Estratégia" },
  { titulo: "Por que seu ROAS está caindo mesmo com o mesmo criativo", categoria: "Métricas" },
  { titulo: `Lookalike audiences em ${CURRENT_BLOG_YEAR}: ainda vale a pena no Brasil?`, categoria: "Estratégia" },
];

const PAUTAS_NOTICIAS = [
  { titulo: `O que mudou no algoritmo do Meta Ads em ${CURRENT_BLOG_YEAR} e como se adaptar`, categoria: "Notícias" },
  { titulo: "Advantage+ do Meta: o que os gestores precisam saber agora", categoria: "Notícias" },
  { titulo: "IA no tráfego pago: como as ferramentas estão mudando a gestão de campanhas", categoria: "Tendências" },
  { titulo: `Mercado de tráfego pago no Brasil: números e tendências para ${CURRENT_BLOG_YEAR}`, categoria: "Tendências" },
  { titulo: "O crescimento das agências de performance no Brasil e o que está por trás", categoria: "Tendências" },
  { titulo: "Privacidade de dados e o futuro do targeting no Meta Ads", categoria: "Tendências" },
  { titulo: "Como a IA generativa está transformando a criação de criativos para anúncios", categoria: "Tendências" },
  { titulo: `Campanhas de performance no Instagram vs. Facebook: onde está o resultado em ${CURRENT_BLOG_YEAR}`, categoria: "Estratégia" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function calcReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min`;
}

function hasStaleYearMentions(value: string) {
  return /\b2024\b|\b2025\b/.test(value);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Verificar secret do cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    // Escolher pauta aleatória (alternando educacional e notícia por dia da semana)
    const hoje = new Date();
    const diaDoAno = Math.floor((hoje.getTime() - new Date(hoje.getFullYear(), 0, 0).getTime()) / 86400000);
    const pautas = diaDoAno % 3 === 0 ? PAUTAS_NOTICIAS : PAUTAS_EDUCACIONAIS;
    const pauta = pautas[diaDoAno % pautas.length];

    // Verificar se já existe post com esse título hoje
    const hoje_str = hoje.toISOString().slice(0, 10);
    const { data: existente } = await supabase
      .from("blog_posts")
      .select("id")
      .gte("publicado_em", `${hoje_str}T00:00:00Z`)
      .limit(1)
      .maybeSingle();

    if (existente) {
      return NextResponse.json({ ok: true, msg: "Já existe artigo publicado hoje.", skip: true });
    }

    // Gerar artigo com Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 3000,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `Você é redator especialista em marketing digital e tráfego pago para o mercado brasileiro.
Escreva artigos de blog que rankam no Google e são úteis para gestores de tráfego e media buyers.

REGRAS:
- Escreva em português BR fluente e profissional
- Tom direto, educativo, com exemplos práticos do mercado brasileiro
- Contextualize tudo no ano atual: ${CURRENT_BLOG_YEAR}
- Não use 2024 nem 2025 como se fossem dados atuais
- Só cite anos anteriores se for comparação histórica explícita e rotulada como histórica
- Use H2 (##) e H3 (###) para estruturar o conteúdo
- Inclua dados, números e benchmarks reais quando possível
- Entre 800-1200 palavras de conteúdo real
- Mencione a Erizon naturalmente 1-2 vezes como ferramenta que resolve o problema (não force)
- Termine com uma conclusão e chamada para ação sutil

FORMATO DE RESPOSTA — retorne APENAS JSON válido:
{
  "title": "título do artigo",
  "description": "meta description com 150-160 caracteres para SEO",
  "content": "conteúdo completo em Markdown",
  "tags": ["tag1", "tag2", "tag3"]
}`,
        },
        {
          role: "user",
          content: `Escreva um artigo completo sobre: "${pauta.titulo}"\nCategoria: ${pauta.categoria}\nAno de referência obrigatório: ${CURRENT_BLOG_YEAR}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Parse JSON — tenta múltiplas estratégias antes de fazer fallback
    let artigo: { title: string; description: string; content: string; tags: string[] };
    let parsed = false;

    // 1ª tentativa: limpar marcadores de code block e parsear
    try {
      const clean = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      artigo = JSON.parse(clean);
      parsed = true;
    } catch { /* segue para próxima tentativa */ }

    // 2ª tentativa: extrair apenas o bloco JSON com regex
    if (!parsed) {
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          artigo = JSON.parse(match[0]);
          parsed = true;
        }
      } catch { /* segue para fallback */ }
    }

    // Fallback: usa o texto bruto como conteúdo (sem o wrapper JSON)
    if (!parsed) {
      const contentClean = raw
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .replace(/^\s*\{[\s\S]*?"content"\s*:\s*"/m, "")  // tenta strip do JSON wrapper
        .replace(/"\s*,?\s*"tags"[\s\S]*$/m, "")           // remove o final do JSON
        .trim();

      artigo = {
        title: pauta.titulo,
        description: `Artigo completo sobre ${pauta.titulo.toLowerCase()} para gestores de tráfego pago no Brasil.`,
        content: contentClean || raw,
        tags: [pauta.categoria.toLowerCase(), "meta ads", "tráfego pago"],
      };
    }

    const slug = `${slugify(artigo.title)}-${hoje_str}`;

    if (
      hasStaleYearMentions(artigo.title ?? "") ||
      hasStaleYearMentions(artigo.description ?? "") ||
      hasStaleYearMentions(artigo.content ?? "")
    ) {
      return NextResponse.json(
        { error: `Artigo rejeitado por conter referência desatualizada a 2024/2025. Gere novamente com contexto ${CURRENT_BLOG_YEAR}.` },
        { status: 422 }
      );
    }

    // Salvar no Supabase
    const { error } = await supabase.from("blog_posts").insert({
      slug,
      title:        artigo.title,
      description:  artigo.description,
      content:      artigo.content,
      category:     pauta.categoria,
      tags:         artigo.tags ?? [],
      read_time:    calcReadTime(artigo.content),
      published:    true,
      gerado_por_ia: true,
      publicado_em: new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      slug,
      title: artigo.title,
      category: pauta.categoria,
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    console.error("[cron/blog] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
