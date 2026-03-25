// src/app/blog/[slug]/page.tsx — post individual do blog

import Link from "next/link";
import { notFound } from "next/navigation";
import { Zap, ArrowLeft, Clock, Eye, Calendar } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Metadata } from "next";
import Sidebar from "@/components/Sidebar";

export const revalidate = 3600;

interface BlogPost {
  slug: string; title: string; description: string; content: string;
  category: string; tags: string[]; author: string; read_time: string;
  views: number; publicado_em: string;
}

/** Recupera o conteúdo real de posts corrompidos (content = resposta bruta do AI com JSON wrapper).
 *  Não usa JSON.parse porque o conteúdo interno tem newlines literais que tornam o JSON inválido.
 *  Usa extração posicional por string. */
function sanitizeContent(post: BlogPost): BlogPost {
  const raw = post.content ?? "";
  const trimmed = raw.trim();

  // Só processa se parece ser um bloco JSON bruto
  if (!trimmed.startsWith("```") && !trimmed.startsWith("{")) return post;

  // Remove marcadores de code block
  const stripped = trimmed.replace(/^```json\s*/m, "").replace(/^```\s*$/m, "").replace(/```\s*$/m, "").trim();

  // Extrai o campo "content" por posição de string (sem JSON.parse)
  const marker = '"content": "';
  const startIdx = stripped.indexOf(marker);
  if (startIdx === -1) return post;

  const afterMarker = stripped.slice(startIdx + marker.length);

  // O valor do content termina antes de `",\n  "tags"` ou `"\n}`
  let contentValue: string;
  const tagsIdx = afterMarker.search(/"\s*,?\s*\n?\s*"tags"\s*:/);
  if (tagsIdx !== -1) {
    contentValue = afterMarker.slice(0, tagsIdx);
  } else {
    // Fallback: pega tudo até o último `"` antes do `}`
    const lastQuote = afterMarker.lastIndexOf('"\n}');
    contentValue = lastQuote !== -1 ? afterMarker.slice(0, lastQuote) : afterMarker;
  }

  // Extrai title e description com regex simples (valores de uma linha)
  const titleMatch  = stripped.match(/"title"\s*:\s*"([^"]+)"/);
  const descMatch   = stripped.match(/"description"\s*:\s*"([^"]+)"/);

  return {
    ...post,
    title:       titleMatch?.[1]  ?? post.title,
    description: descMatch?.[1]   ?? post.description,
    content:     contentValue     || post.content,
  };
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (!data) return null;
    return sanitizeContent(data as BlogPost);
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post não encontrado — Erizon" };
  return {
    title: `${post.title} — Blog Erizon`,
    description: post.description,
    keywords: post.tags?.join(", "),
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://erizonai.com.br/blog/${post.slug}`,
      siteName: "Erizon",
      type: "article",
      publishedTime: post.publicado_em,
      authors: [post.author],
    },
    alternates: { canonical: `https://erizonai.com.br/blog/${post.slug}` },
  };
}

// Converte Markdown básico para HTML
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-[17px] font-bold text-white mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[20px] font-bold text-white mt-10 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-[24px] font-black text-white mt-10 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-white/70">$1</em>')
    .replace(/^- (.+)$/gm, '<li class="text-white/60 mb-1.5 ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="text-white/60 mb-1.5 ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="text-[15px] text-white/55 leading-relaxed mb-4">')
    .replace(/^(?!<[h|l|p])(.+)$/gm, '<p class="text-[15px] text-white/55 leading-relaxed mb-4">$1</p>');
}

async function getSession() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch { return null; }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, user] = await Promise.all([getPost(slug), getSession()]);
  if (!post) notFound();

  const logado = !!user;
  const html = markdownToHtml(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "author": { "@type": "Person", "name": post.author },
    "publisher": { "@type": "Organization", "name": "Erizon", "url": "https://erizonai.com.br" },
    "datePublished": post.publicado_em,
    "url": `https://erizonai.com.br/blog/${post.slug}`,
    "keywords": post.tags?.join(", "),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060608] via-[#0b0b0d] to-[#060608] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {logado ? (
        <Sidebar />
      ) : (
        <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#060608]/80 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center">
                <Zap size={12} className="text-white" />
              </div>
              <span className="text-[14px] font-black italic uppercase tracking-tight text-white">Erizon</span>
            </Link>
            <Link href="/blog" className="flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors">
              <ArrowLeft size={13} /> Blog
            </Link>
          </div>
        </nav>
      )}

      <article className={`max-w-3xl mx-auto px-6 py-16 ${logado ? "ml-[60px]" : ""}`}
        {/* Meta */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {post.category}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-white/25">
            <Calendar size={11} /> {new Date(post.publicado_em).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-white/25">
            <Clock size={11} /> {post.read_time}
          </span>
          {post.views > 0 && (
            <span className="flex items-center gap-1.5 text-[12px] text-white/25">
              <Eye size={11} /> {post.views} leituras
            </span>
          )}
        </div>

        {/* Título */}
        <h1 className="text-[2rem] font-black text-white leading-tight mb-4">{post.title}</h1>
        <p className="text-[16px] text-white/45 leading-relaxed mb-10 border-b border-white/[0.06] pb-8">{post.description}</p>

        {/* Conteúdo */}
        <div
          className="prose-erizon"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-white/[0.06]">
            {post.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-lg text-[11px] bg-white/[0.04] text-white/30 border border-white/[0.06]">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 p-8 rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] text-center">
          <h3 className="text-[18px] font-bold text-white mb-2">Coloque isso em prática com a Erizon</h3>
          <p className="text-[13px] text-white/40 mb-5">
            Monitore CPL, ROAS e performance de campanhas em tempo real. 7 dias grátis, sem cartão.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-[13px] font-bold text-white transition-all">
            Começar agora <Zap size={13} />
          </Link>
        </div>
      </article>
    </div>
  );
}
