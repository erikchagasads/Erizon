// src/app/blog/[slug]/page.tsx

import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { Zap, ArrowRight } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function renderMarkdown(content: string): string {
  return content
    // Remove QUALQUER imagem markdown (![...](url)) — a capa já aparece no header
    .replace(/^!\[.*?\]\(.*?\)\n?/gm, "")
    // Tabelas
    .replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_, header, body) => {
      const headers = header.split("|").map((h: string) => h.trim()).filter(Boolean);
      const rows = body.trim().split("\n").map((row: string) =>
        row.split("|").map((c: string) => c.trim()).filter(Boolean)
      );
      const ths = headers.map((h: string) =>
        `<th class="px-4 py-2 text-left text-[11px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/[0.06]">${h}</th>`
      ).join("");
      const trs = rows.map((r: string[]) =>
        `<tr class="border-b border-white/[0.03]">${r.map((c: string) =>
          `<td class="px-4 py-3 text-[13px] text-white/60">${c}</td>`
        ).join("")}</tr>`
      ).join("");
      return `<div class="overflow-x-auto my-6 rounded-xl border border-white/[0.06]"><table class="w-full"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
    })
    // H2
    .replace(/^## (.+)$/gm, '<h2 class="text-[20px] font-bold text-white mt-10 mb-4">$1</h2>')
    // H3
    .replace(/^### (.+)$/gm, '<h3 class="text-[16px] font-semibold text-white/80 mt-6 mb-3">$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    // Blockquote
    .replace(/^> \*(.+)\*$/gm, '<blockquote class="border-l-2 border-purple-500/50 pl-4 py-1 my-4 text-[14px] text-white/50 italic">$1</blockquote>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-purple-500/50 pl-4 py-1 my-4 text-[14px] text-white/50 italic">$1</blockquote>')
    // Code block
    .replace(/```[\w]*\n([\s\S]+?)```/g, '<pre class="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 my-4 overflow-x-auto text-[12px] text-white/60 font-mono whitespace-pre-wrap">$1</pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-white/[0.06] px-1.5 py-0.5 rounded text-[12px] text-purple-300 font-mono">$1</code>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="text-white/60 italic">$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-purple-400 underline underline-offset-2 hover:text-purple-300 transition-colors">$1</a>')
    // Bullet list
    .replace(/^- (.+)$/gm, '<li class="flex items-start gap-2 text-[14px] text-white/50 leading-relaxed my-1"><span class="text-purple-400 mt-1 shrink-0">·</span><span>$1</span></li>')
    .replace(/(<li[\s\S]+?<\/li>\n?)+/g, m => `<ul class="space-y-1 my-4 list-none">${m}</ul>`)
    // Separador
    .replace(/^---$/gm, '<hr class="border-white/[0.06] my-8" />')
    // Parágrafos (só linhas que não começam com tag HTML)
    .replace(/^(?!<[a-z\/]).+$/gm, m => m.trim() ? `<p class="text-[14px] text-white/50 leading-relaxed my-3">${m}</p>` : "")
    .replace(/\n{3,}/g, "\n\n");
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | ErizonAI Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      images: post.coverImage ? [{ url: post.coverImage }] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const allPosts = getAllPosts();
  const related = allPosts.filter(p => p.slug !== post.slug).slice(0, 3);
  const html = renderMarkdown(post.content);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060608] via-[#0b0b0d] to-[#060608] text-white">

      {/* Navbar pública */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#060608]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center">
                <Zap size={12} className="text-white" />
              </div>
              <span className="text-[14px] font-black italic uppercase tracking-tight text-white">Erizon</span>
            </Link>
            <span className="text-white/20 mx-1">·</span>
            <Link href="/blog" className="text-[13px] text-white/40 hover:text-white/70 font-medium transition-colors">
              Blog
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[12px] text-white/30 hover:text-white transition-colors">Entrar</Link>
            <Link href="/signup" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[12px] font-bold transition-all">
              Teste grátis <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-[800px] mx-auto px-6 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] text-white/20 mb-8">
          <Link href="/blog" className="hover:text-white/50 transition-colors">← Blog</Link>
          <span className="text-white/15">·</span>
          <span className="text-white/30">{post.category}</span>
        </div>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border bg-purple-500/10 text-purple-400 border-purple-500/20">
              {post.category}
            </span>
            <span className="text-[11px] text-white/20">{formatDate(post.date)}</span>
            <span className="text-[11px] text-white/15">·</span>
            <span className="text-[11px] text-white/20">{post.readTime} de leitura</span>
          </div>

          <h1 className="text-[1.75rem] font-bold text-white leading-tight mb-4">
            {post.title}
          </h1>

          <p className="text-[15px] text-white/35 leading-relaxed mb-6">
            {post.description}
          </p>

          {/* Autor */}
          <div className="flex items-center gap-3 pb-6 border-b border-white/[0.04]">
            <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <span className="text-[13px] font-bold text-purple-400">
                {post.author.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">{post.author}</p>
              <p className="text-[11px] text-white/30">{post.authorRole}</p>
            </div>
          </div>
        </header>

        {/* Imagem de capa — altura fixa, não vaza nunca */}
        {post.coverImage && (
          <div className="w-full h-[200px] md:h-[260px] rounded-[20px] overflow-hidden mb-10 border border-white/[0.05] relative">
            <img
              src={post.coverImage}
              alt={post.coverAlt || post.title}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}

        {/* Conteúdo — [&_img]:hidden bloqueia qualquer img que escapar */}
        <article
          className="mb-12 [&_img]:hidden"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* CTA */}
        <div className="my-10 p-6 rounded-[20px] bg-purple-500/[0.04] border border-purple-500/15">
          <p className="text-[13px] font-semibold text-white mb-1">
            Quer analisar suas campanhas com IA?
          </p>
          <p className="text-[12px] text-white/35 mb-4">
            O ErizonAI identifica campanhas críticas, calcula o impacto e recomenda o que fazer — em português.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 text-[13px] font-semibold hover:bg-purple-500/15 transition-all"
          >
            Analisar minha conta gratuitamente →
          </Link>
        </div>

        {/* Relacionados */}
        {related.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/20 mb-4">
              Leia também
            </p>
            <div className="space-y-3">
              {related.map(p => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-white/[0.05] hover:border-white/[0.10] transition-all"
                >
                  {p.coverImage && (
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-white/[0.06]">
                      <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover opacity-70" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white group-hover:text-white/80 transition-colors line-clamp-1">
                      {p.title}
                    </p>
                    <p className="text-[11px] text-white/25 mt-0.5">{p.author} · {p.readTime} de leitura</p>
                  </div>
                  <span className="text-white/20 group-hover:text-white/50 transition-colors shrink-0">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}