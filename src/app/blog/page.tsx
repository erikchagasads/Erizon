import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, DatabaseZap, Search, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { getAllPosts } from "@/lib/blog";
import NewsletterSignup from "@/components/blog/NewsletterSignup";

export const revalidate = 1800;

export const metadata = {
  title: "Blog Erizon AI | Inteligência de marketing, IA e performance",
  description: "Central editorial da Erizon AI com estudos anonimizados, relatórios, SEO e análises sobre campanhas, IA e performance.",
  alternates: { canonical: "https://erizonai.com.br/blog" },
};

type BlogPost = {
  slug: string;
  title: string;
  excerpt?: string | null;
  description?: string | null;
  category: string;
  content_type?: string | null;
  featured?: boolean | null;
  reading_time?: string | null;
  read_time?: string | null;
  published_at?: string | null;
  publicado_em?: string | null;
  freshness_level?: string | null;
  anonymized?: boolean | null;
  source_name?: string | null;
};

const categories = [
  "Todos",
  "Automação com IA",
  "Gestão de tráfego",
  "Meta Ads",
  "Google Ads",
  "Criativos",
  "Performance",
  "Growth",
  "Estudos anônimos",
  "Notícias do mercado",
  "Relatórios semanais",
  "Relatórios mensais",
];

const contentTypes = [
  "Todos",
  "seo_educational",
  "anonymous_case_study",
  "market_news",
  "weekly_report",
  "monthly_report",
  "performance_insight",
];

const freshnessOptions = ["Todos", "Hoje", "Esta semana", "Este mês", "Atemporal", "Dados internos"];

const typeLabels: Record<string, string> = {
  seo_educational: "Educativo SEO",
  anonymous_case_study: "Estudo anônimo",
  market_news: "Atualização do mercado",
  weekly_report: "Relatório semanal",
  monthly_report: "Relatório mensal",
  performance_insight: "Insight de performance",
};

function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function isCurrentBlogYear(value?: string | null) {
  if (!value) return false;
  return new Date(value).getFullYear() >= 2026;
}

function getExcerpt(post: BlogPost) {
  return post.excerpt || post.description || "Conteúdo estratégico da Erizon AI para decisões de marketing mais claras e baseadas em dados.";
}

function getDate(post: BlogPost) {
  return post.published_at || post.publicado_em;
}

function normalize(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function filterPosts(posts: BlogPost[], filters: { busca: string; categoria: string; tipo: string; data: string }) {
  return posts.filter((post) => {
    const matchesSearch = !filters.busca || normalize(`${post.title} ${getExcerpt(post)} ${post.category}`).includes(normalize(filters.busca));
    const matchesCategory = filters.categoria === "Todos" || post.category === filters.categoria;
    const matchesType = filters.tipo === "Todos" || post.content_type === filters.tipo;
    const matchesFreshness = filters.data === "Todos" || post.freshness_level === filters.data;
    return matchesSearch && matchesCategory && matchesType && matchesFreshness;
  });
}

async function getPosts(): Promise<BlogPost[]> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const { data } = await supabase
        .from("blog_posts")
        .select("slug,title,excerpt,description,category,content_type,featured,reading_time,read_time,published_at,publicado_em,freshness_level,anonymized,source_name")
        .or("published.eq.true,status.eq.published")
        .gte("publicado_em", "2026-01-01T00:00:00.000Z")
        .order("published_at", { ascending: false })
        .limit(40);
      if (data?.length) return data as BlogPost[];
    } catch {
      return [];
    }
  }

  return getAllPosts()
    .filter((post) => isCurrentBlogYear(post.date))
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.description,
      category: post.category,
      content_type: "seo_educational",
      reading_time: post.readTime,
      published_at: post.date,
      freshness_level: "Atemporal",
    }));
}

function PostCard({ post, large = false }: { post: BlogPost; large?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex h-full flex-col border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.045] ${large ? "rounded-[8px] md:p-7" : "rounded-[8px]"}`}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold text-cyan-100">
          {typeLabels[post.content_type || ""] || post.category}
        </span>
        {post.anonymized && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">
            <ShieldCheck size={12} /> anonimizado
          </span>
        )}
      </div>
      <h2 className={`${large ? "text-[28px]" : "text-[18px]"} leading-tight font-black text-white transition group-hover:text-cyan-100`}>
        {post.title}
      </h2>
      <p className="mt-4 flex-1 text-[14px] leading-relaxed text-white/58">{getExcerpt(post)}</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[12px] text-white/38">
        <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> {formatDate(getDate(post))}</span>
        <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {post.reading_time || post.read_time || "5 min"}</span>
        <ArrowRight size={15} className="text-cyan-200/45 transition group-hover:translate-x-1 group-hover:text-cyan-200" />
      </div>
    </Link>
  );
}

function Section({ title, posts }: { title: string; posts: BlogPost[] }) {
  if (!posts.length) return null;
  return (
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="text-[22px] font-black text-white">{title}</h2>
        <Link href="/signup" className="hidden items-center gap-2 text-[13px] font-semibold text-cyan-200/70 hover:text-cyan-100 sm:inline-flex">
          Conhecer a Erizon <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {posts.slice(0, 3).map((post) => <PostCard key={post.slug} post={post} />)}
      </div>
    </section>
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters = {
    busca: String(params.busca ?? ""),
    categoria: String(params.categoria ?? "Todos"),
    tipo: String(params.tipo ?? "Todos"),
    data: String(params.data ?? "Todos"),
  };
  const posts = await getPosts();
  const filteredPosts = filterPosts(posts, filters);
  const featured = filteredPosts.find((post) => post.featured) || filteredPosts[0];
  const todayPosts = filteredPosts.slice(0, 4);
  const anonymousPosts = filteredPosts.filter((post) => post.content_type === "anonymous_case_study" || post.category === "Estudos anônimos");
  const marketPosts = filteredPosts.filter((post) => post.content_type === "market_news" || post.category === "Notícias do mercado");
  const weeklyPosts = filteredPosts.filter((post) => post.content_type === "weekly_report" || post.category === "Relatórios semanais");

  return (
    <main className="min-h-screen bg-[#03070a] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_78%_8%,rgba(16,185,129,0.13),transparent_28%),linear-gradient(180deg,#061116_0%,#03070a_100%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-16">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[12px] font-semibold text-cyan-100">
              <Sparkles size={14} /> Central editorial inteligente
            </div>
            <h1 className="max-w-3xl text-[40px] font-black leading-[1.02] tracking-normal text-white md:text-[64px]">
              Blog da Erizon AI
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-white/66">
              Estudos anonimizados, análises de performance, SEO e tendências verificadas para quem quer decidir campanhas com mais clareza, menos desperdício de verba e mais controle.
            </p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="border border-white/10 bg-white/[0.04] p-4">
                <DatabaseZap className="mb-3 text-cyan-200" size={20} />
                <p className="text-[13px] font-bold">Dados anonimizados</p>
                <p className="mt-1 text-[12px] text-white/45">Sem exposição de clientes.</p>
              </div>
              <div className="border border-white/10 bg-white/[0.04] p-4">
                <ShieldCheck className="mb-3 text-emerald-200" size={20} />
                <p className="text-[13px] font-bold">Revisão humana</p>
                <p className="mt-1 text-[12px] text-white/45">Publicação segura por padrão.</p>
              </div>
              <div className="border border-white/10 bg-white/[0.04] p-4">
                <TrendingUp className="mb-3 text-blue-200" size={20} />
                <p className="text-[13px] font-bold">Performance</p>
                <p className="mt-1 text-[12px] text-white/45">Leitura prática dos sinais.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <form action="/blog" className="rounded-[8px] border border-cyan-200/18 bg-[#06141a]/85 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
              <label htmlFor="busca-blog" className="flex items-center gap-2 border-b border-white/10 pb-3 text-[12px] text-white/45">
                <Search size={15} /> Busque por tema, categoria ou tipo de conteúdo
              </label>
              <input
                id="busca-blog"
                name="busca"
                defaultValue={filters.busca}
                placeholder="Ex.: criativo saturado, CPA alto, IA"
                className="mt-4 h-11 w-full rounded-[8px] border border-white/10 bg-white/[0.04] px-4 text-[14px] text-white outline-none placeholder:text-white/28 focus:border-cyan-200/45"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-white/34">
                  Categoria
                  <select name="categoria" defaultValue={filters.categoria} className="mt-1 h-10 w-full rounded-[8px] border border-white/10 bg-[#071014] px-3 text-[12px] normal-case tracking-normal text-white/72 outline-none">
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-white/34">
                  Tipo de conteúdo
                  <select name="tipo" defaultValue={filters.tipo} className="mt-1 h-10 w-full rounded-[8px] border border-white/10 bg-[#071014] px-3 text-[12px] normal-case tracking-normal text-white/72 outline-none">
                    {contentTypes.map((type) => <option key={type} value={type}>{typeLabels[type] || type}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-white/34">
                Data ou atualização
                <select name="data" defaultValue={filters.data} className="mt-1 h-10 w-full rounded-[8px] border border-white/10 bg-[#071014] px-3 text-[12px] normal-case tracking-normal text-white/72 outline-none">
                  {freshnessOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="submit" className="rounded-[8px] bg-cyan-200 px-4 py-2.5 text-[12px] font-black text-[#041016]">
                  Filtrar artigos
                </button>
                <Link href="/blog" className="rounded-[8px] border border-white/10 px-4 py-2.5 text-[12px] font-semibold text-white/58 hover:text-white">
                  Limpar filtros
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-[13px] text-white/45">
          <span>{filteredPosts.length} artigo{filteredPosts.length === 1 ? "" : "s"} encontrado{filteredPosts.length === 1 ? "" : "s"}</span>
          {(filters.busca || filters.categoria !== "Todos" || filters.tipo !== "Todos" || filters.data !== "Todos") && (
            <span>Filtros ativos: {[
              filters.busca && `busca "${filters.busca}"`,
              filters.categoria !== "Todos" && filters.categoria,
              filters.tipo !== "Todos" && (typeLabels[filters.tipo] || filters.tipo),
              filters.data !== "Todos" && filters.data,
            ].filter(Boolean).join(" · ")}</span>
          )}
        </div>

        {featured ? (
          <section className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]">
            <PostCard post={featured} large />
            <div className="grid gap-4">
              {todayPosts.filter((post) => post.slug !== featured.slug).slice(0, 3).map((post) => <PostCard key={post.slug} post={post} />)}
            </div>
          </section>
        ) : (
          <div className="border border-white/10 bg-white/[0.035] p-8 text-center text-white/45">
            Nenhum artigo encontrado para os filtros selecionados.
          </div>
        )}

        <Section title="Estudos anônimos" posts={anonymousPosts} />
        <Section title="Atualizações do mercado" posts={marketPosts} />
        <Section title="Relatórios semanais" posts={weeklyPosts} />

        <section className="mt-14">
          <h2 className="mb-5 text-[22px] font-black text-white">Artigos recentes</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {filteredPosts.slice(0, 9).map((post) => <PostCard key={post.slug} post={post} />)}
          </div>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-2">
          <NewsletterSignup />
          <div className="border border-emerald-200/20 bg-emerald-200/[0.05] p-7">
            <ShieldCheck className="mb-4 text-emerald-100" size={22} />
            <h2 className="text-[21px] font-black">Conheça a Erizon AI</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/58">Transforme dados de campanhas em alertas, diagnósticos e próximos movimentos com revisão, contexto e segurança.</p>
            <Link href="/signup" className="mt-6 inline-flex items-center gap-2 rounded-[8px] bg-emerald-200 px-5 py-3 text-[13px] font-black text-[#041016]">
              Começar agora <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
