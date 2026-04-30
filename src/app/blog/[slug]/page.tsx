import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, ExternalLink, ShieldCheck } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { getAllPosts, getPostBySlug } from "@/lib/blog";

export const revalidate = 1800;

type BlogPost = {
  slug: string;
  title: string;
  excerpt?: string | null;
  description?: string | null;
  content: string;
  category: string;
  content_type?: string | null;
  author_name?: string | null;
  author?: string | null;
  reading_time?: string | null;
  read_time?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  tags?: string[] | null;
  source_name?: string | null;
  source_url?: string | null;
  source_published_at?: string | null;
  source_checked_at?: string | null;
  freshness_level?: string | null;
  anonymized?: boolean | null;
  published_at?: string | null;
  publicado_em?: string | null;
  updated_at?: string | null;
  atualizado_em?: string | null;
};

const typeLabels: Record<string, string> = {
  seo_educational: "Conteúdo educativo",
  anonymous_case_study: "Estudo anônimo",
  market_news: "Atualização do mercado",
  weekly_report: "Relatório semanal",
  monthly_report: "Relatório mensal",
  performance_insight: "Insight de performance",
};

function isCurrentBlogYear(value?: string | null) {
  if (!value) return false;
  return new Date(value).getFullYear() >= 2026;
}

function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

function getDate(post: BlogPost) {
  return post.published_at || post.publicado_em;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function isSafeImageUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

function imageHtml(src: string, alt = "") {
  if (!isSafeImageUrl(src)) return "";
  return `<figure class="my-8 overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.03]"><img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" class="h-auto w-full object-cover" /><figcaption class="border-t border-white/10 px-4 py-3 text-[12px] text-white/38">${escapeHtml(alt || "Imagem do artigo")}</figcaption></figure>`;
}

function restoreSafeHtmlImages(value: string) {
  return value.replace(/&lt;img\s+([\s\S]*?)&gt;/gi, (_match, attrs: string) => {
    const decodedAttrs = attrs
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
    const src = decodedAttrs.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
    const alt = decodedAttrs.match(/\balt=["']([^"']*)["']/i)?.[1] ?? "";
    return imageHtml(src, alt);
  });
}

function markdownToHtml(markdown: string) {
  const escaped = restoreSafeHtmlImages(escapeHtml(markdown));

  return escaped
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, (_match, alt: string, src: string) => imageHtml(src, alt))
    .replace(/^### (.+)$/gm, '<h3 class="mt-8 text-[18px] font-black text-white">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-11 text-[24px] font-black text-white">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="mt-8 text-[30px] font-black text-white">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc text-white/62">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-5 text-[16px] leading-8 text-white/64">')
    .replace(/^(?!<h|<li|<figure|<\/p>)(.+)$/gm, '<p class="mb-5 text-[16px] leading-8 text-white/64">$1</p>');
}

async function getPost(slug: string): Promise<BlogPost | null> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .or("published.eq.true,status.eq.published")
        .gte("publicado_em", "2026-01-01T00:00:00.000Z")
        .maybeSingle();
      if (data) return data as BlogPost;
    } catch {
      return null;
    }
  }

  const local = getPostBySlug(slug);
  if (!local) return null;
  if (!isCurrentBlogYear(local.date)) return null;
  return {
    slug: local.slug,
    title: local.title,
    excerpt: local.description,
    description: local.description,
    content: local.content,
    category: local.category,
    content_type: "seo_educational",
    author_name: local.author,
    reading_time: local.readTime,
    published_at: local.date,
    seo_keywords: [],
  };
}

async function getRelated(post: BlogPost) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const { data } = await supabase
        .from("blog_posts")
        .select("slug,title,excerpt,description,category,content_type")
        .or("published.eq.true,status.eq.published")
        .gte("publicado_em", "2026-01-01T00:00:00.000Z")
        .neq("slug", post.slug)
        .eq("category", post.category)
        .limit(3);
      if (data?.length) return data as BlogPost[];
    } catch {
      return [];
    }
  }
  return getAllPosts()
    .filter((item) => item.slug !== post.slug && isCurrentBlogYear(item.date))
    .slice(0, 3)
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      excerpt: item.description,
      category: item.category,
      content: "",
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Artigo não encontrado | Erizon AI" };

  return {
    title: post.seo_title || `${post.title} | Blog Erizon AI`,
    description: post.seo_description || post.excerpt || post.description || undefined,
    keywords: post.seo_keywords || post.tags || undefined,
    alternates: { canonical: `https://erizonai.com.br/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt || post.description || undefined,
      type: "article",
      publishedTime: getDate(post) || undefined,
      authors: [post.author_name || post.author || "Equipe Erizon"],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const related = await getRelated(post);
  const html = markdownToHtml(post.content || "");
  const keywords = post.seo_keywords || post.tags || [];
  const typeLabel = typeLabels[post.content_type || ""] || post.category;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.description,
    author: { "@type": "Organization", name: post.author_name || post.author || "Equipe Erizon" },
    publisher: { "@type": "Organization", name: "Erizon AI", url: "https://erizonai.com.br" },
    datePublished: getDate(post),
    dateModified: post.updated_at || post.atualizado_em || getDate(post),
    url: `https://erizonai.com.br/blog/${post.slug}`,
    keywords,
  };

  return (
    <main className="min-h-screen bg-[#03070a] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="border-b border-white/10 bg-[#03070a]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link href="/blog" className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/55 hover:text-cyan-100">
            <ArrowLeft size={15} /> Blog
          </Link>
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-[8px] bg-cyan-200 px-4 py-2 text-[12px] font-black text-[#041016]">
            Conhecer a Erizon <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      <article className="mx-auto max-w-4xl px-5 py-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-[12px] font-semibold text-cyan-100">{post.category}</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] text-white/58">{typeLabel}</span>
          {post.freshness_level && <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] text-white/58">{post.freshness_level}</span>}
        </div>

        <h1 className="mt-6 max-w-4xl text-[36px] font-black leading-[1.06] md:text-[58px]">{post.title}</h1>
        <p className="mt-5 max-w-3xl text-[18px] leading-relaxed text-white/62">{post.excerpt || post.description}</p>

        <div className="mt-7 flex flex-wrap gap-4 border-y border-white/10 py-4 text-[13px] text-white/45">
          <span>Autor: {post.author_name || post.author || "Equipe Erizon"}</span>
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> Publicado em {formatDate(getDate(post))}</span>
          <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {post.reading_time || post.read_time || "5 min"}</span>
          {(post.updated_at || post.atualizado_em) && <span>Atualizado em {formatDate(post.updated_at || post.atualizado_em)}</span>}
        </div>

        {post.anonymized && (
          <div className="mt-8 flex gap-3 rounded-[8px] border border-emerald-200/25 bg-emerald-200/[0.06] p-4 text-[14px] leading-relaxed text-emerald-50/82">
            <ShieldCheck className="mt-0.5 shrink-0" size={18} />
            <p>Este conteúdo foi criado a partir de padrões e dados anonimizados de campanhas. Nenhum cliente, marca ou informação sensível é exposto.</p>
          </div>
        )}

        {post.source_name && (
          <div className="mt-5 rounded-[8px] border border-cyan-200/20 bg-cyan-200/[0.055] p-4 text-[14px] text-white/66">
            <p className="font-bold text-white">Fonte verificada</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span>{post.source_name}</span>
              {post.source_url && (
                <a href={post.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-100 hover:text-white">
                  Abrir referência <ExternalLink size={13} />
                </a>
              )}
              {post.source_checked_at && <span>Checada em {formatDate(post.source_checked_at)}</span>}
            </div>
          </div>
        )}

        <div className="my-10 border border-cyan-200/18 bg-cyan-200/[0.045] p-6">
          <p className="text-[15px] font-bold text-white">Aplique essa leitura nas suas campanhas</p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/58">A Erizon AI conecta dados, sinais e revisão estratégica para ajudar sua operação a decidir com mais contexto.</p>
          <Link href="/signup" className="mt-4 inline-flex items-center gap-2 rounded-[8px] bg-cyan-200 px-5 py-3 text-[13px] font-black text-[#041016]">
            Ver a Erizon em ação <ArrowRight size={15} />
          </Link>
        </div>

        <div className="prose-erizon" dangerouslySetInnerHTML={{ __html: html }} />

        {keywords.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-white/10 pt-6">
            {keywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] text-white/52">
                {keyword}
              </span>
            ))}
          </div>
        )}

        <div className="mt-12 border border-emerald-200/20 bg-emerald-200/[0.055] p-7">
          <h2 className="text-[24px] font-black">Transforme sinais em decisões com mais segurança</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/62">Use a Erizon para identificar gargalos, reduzir desperdício de verba e organizar próximos movimentos com base em dados.</p>
          <Link href="/signup" className="mt-5 inline-flex items-center gap-2 rounded-[8px] bg-emerald-200 px-5 py-3 text-[13px] font-black text-[#041016]">
            Conhecer a Erizon <ArrowRight size={15} />
          </Link>
        </div>
      </article>

      {related.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 pb-14">
          <h2 className="mb-5 text-[22px] font-black">Artigos relacionados</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <Link key={item.slug} href={`/blog/${item.slug}`} className="border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-200/35 hover:bg-cyan-200/[0.04]">
                <span className="text-[12px] font-semibold text-cyan-100">{item.category}</span>
                <h3 className="mt-3 text-[17px] font-black leading-tight">{item.title}</h3>
                <p className="mt-3 text-[13px] leading-relaxed text-white/52">{item.excerpt || item.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
