// src/app/blog/page.tsx — lê do Supabase, geração automática diária

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Eye } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";

export const revalidate = 3600; // ISR — revalida a cada hora

export const metadata = {
  title: "Blog Erizon — Estratégias de Meta Ads e Tráfego Pago",
  description: "Artigos sobre otimização de campanhas, Meta Ads, ROAS, CPL e IA para gestores de tráfego pago brasileiros. Atualizado diariamente.",
  keywords: "meta ads, tráfego pago, gestão de campanhas, CPL, ROAS, gestor de tráfego, marketing digital brasil",
  openGraph: {
    title: "Blog Erizon — Estratégias de Meta Ads e Tráfego Pago",
    description: "Artigos práticos sobre Meta Ads, tráfego pago e IA para gestores brasileiros.",
    url: "https://erizonai.com.br/blog",
    siteName: "Erizon",
    type: "website",
  },
  alternates: { canonical: "https://erizonai.com.br/blog" },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Estratégia":  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Métricas":    "bg-amber-500/10  text-amber-400  border-amber-500/20",
  "Automação":   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Criativos":   "bg-pink-500/10   text-pink-400   border-pink-500/20",
  "Gestão":      "bg-blue-500/10   text-blue-400   border-blue-500/20",
  "Notícias":    "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Tendências":  "bg-cyan-500/10   text-cyan-400   border-cyan-500/20",
  "Geral":       "bg-white/[0.06]  text-white/40   border-white/[0.08]",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

interface BlogPost {
  slug: string; title: string; description: string;
  category: string; read_time: string; views: number; publicado_em: string;
}

async function getPosts(): Promise<BlogPost[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, title, description, category, read_time, views, publicado_em")
      .eq("published", true)
      .order("publicado_em", { ascending: false })
      .limit(30);
    return (data ?? []) as BlogPost[];
  } catch { return []; }
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

export default async function BlogPage() {
  const [posts, user] = await Promise.all([getPosts(), getSession()]);
  const categorias = [...new Set(posts.map(p => p.category))];
  const logado = !!user;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060608] via-[#0b0b0d] to-[#060608] text-white">

      {logado ? (
        <Sidebar />
      ) : (
        <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#060608]/80 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="shrink-0 rounded-xl overflow-hidden ring-1 ring-white/10 shadow-[0_0_14px_rgba(168,85,247,0.2)]" style={{ width: 28, height: 28 }}>
                <Image src="/logo-erizon.png" alt="Erizon" width={28} height={28} className="w-full h-full object-cover" priority />
              </div>
              <span className="text-[14px] font-black italic uppercase tracking-tight text-white">Erizon</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/sobre" className="text-[13px] text-white/40 hover:text-white transition-colors">Sobre</Link>
              <Link href="/login" className="text-[13px] text-white/40 hover:text-white transition-colors">Entrar</Link>
              <Link href="/signup" className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-[13px] font-semibold text-white transition-all">Começar grátis</Link>
            </div>
          </div>
        </nav>
      )}

      <div className={`max-w-5xl mx-auto px-6 py-16 ${logado ? "ml-[60px]" : ""}`}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-400 font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Atualizado diariamente
          </div>
          <h1 className="text-[2.5rem] font-black text-white mb-3 leading-tight">
            Estratégias de tráfego pago<br />
            <span className="text-purple-400">que funcionam no Brasil</span>
          </h1>
          <p className="text-[15px] text-white/40 max-w-xl">
            Artigos práticos sobre Meta Ads, CPL, ROAS e gestão de campanhas para gestores de tráfego e agências brasileiras.
          </p>
        </div>

        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            {categorias.map(cat => (
              <span key={cat} className={`px-3 py-1 rounded-full text-[11px] font-medium border ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Geral}`}>{cat}</span>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-24 text-white/20">
            <p className="text-[14px]">Primeiros artigos chegando em breve.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}
                className="group flex flex-col gap-3 p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:border-purple-500/30 hover:bg-purple-500/[0.03] transition-all">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.Geral}`}>{post.category}</span>
                  <span className="text-[11px] text-white/20">{formatDate(post.publicado_em)}</span>
                </div>
                <h2 className="text-[14px] font-semibold text-white/85 leading-snug group-hover:text-white transition-colors line-clamp-2">{post.title}</h2>
                <p className="text-[12px] text-white/35 leading-relaxed line-clamp-2 flex-1">{post.description}</p>
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                  <div className="flex items-center gap-3 text-[11px] text-white/25">
                    <span className="flex items-center gap-1"><Clock size={10} /> {post.read_time}</span>
                    {post.views > 0 && <span className="flex items-center gap-1"><Eye size={10} /> {post.views}</span>}
                  </div>
                  <ArrowRight size={13} className="text-white/20 group-hover:text-purple-400 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-16 p-8 rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] text-center">
          <h3 className="text-[18px] font-bold text-white mb-2">Gerencie suas campanhas com inteligência</h3>
          <p className="text-[13px] text-white/40 mb-5">Veja como a Erizon monitora CPL, ROAS e alerta quando uma campanha está queimando dinheiro.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-[13px] font-bold text-white transition-all">
            Começar grátis — 7 dias <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
