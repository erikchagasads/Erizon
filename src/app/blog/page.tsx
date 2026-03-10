// src/app/blog/page.tsx

import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { Zap, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Blog ErizonAI — Estratégias de Meta Ads e Tráfego Pago",
  description: "Artigos sobre otimização de campanhas, Meta Ads, ROAS, CPL e inteligência artificial para gestores de tráfego pago brasileiros.",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Comparativos":  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Estratégia":    "bg-blue-500/10   text-blue-400   border-blue-500/20",
  "Métricas":      "bg-amber-500/10  text-amber-400  border-amber-500/20",
  "Automação":     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Geral":         "bg-white/[0.06]  text-white/40   border-white/[0.08]",
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060608] via-[#0b0b0d] to-[#060608] text-white">

      {/* Navbar */}
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
            <span className="text-[13px] text-white/40 font-medium">Blog</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[12px] text-white/30 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[12px] font-bold transition-all"
            >
              Teste grátis <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-14">

        {/* Header */}
        <header className="mb-12 pb-10 border-b border-white/[0.04]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400/60 mb-3">
            Conteúdo
          </p>
          <h1 className="text-[2.2rem] font-black italic uppercase tracking-tight mb-3">
            Estratégias de<br />
            <span className="text-purple-500">Tráfego Pago</span>
          </h1>
          <p className="text-[14px] text-white/30 leading-relaxed max-w-xl">
            Artigos sobre Meta Ads, otimização de campanhas, métricas e inteligência artificial para gestores brasileiros.
          </p>
        </header>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-white/20 text-[14px]">Nenhum artigo publicado ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, i) => {
              const catStyle = CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS["Geral"];
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex items-start gap-5 p-6 rounded-[20px] bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.10] hover:bg-white/[0.04] transition-all"
                >
                  {/* Thumbnail — tamanho fixo forçado via style */}
                  {post.coverImage ? (
                    <div style={{ width: 80, height: 80, minWidth: 80, minHeight: 80, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[11px] font-black text-white/20">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${catStyle}`}>
                        {post.category}
                      </span>
                      <span className="text-[11px] text-white/20">{formatDate(post.date)}</span>
                      <span className="text-[11px] text-white/15">·</span>
                      <span className="text-[11px] text-white/20">{post.readTime} de leitura</span>
                    </div>

                    <h2 className="text-[16px] font-bold text-white group-hover:text-white/90 leading-snug mb-2 transition-colors">
                      {post.title}
                    </h2>

                    <p className="text-[13px] text-white/35 leading-relaxed line-clamp-2">
                      {post.description}
                    </p>

                    <p className="text-[11px] text-white/20 mt-2">Por {post.author}</p>
                  </div>

                  <div className="shrink-0 w-8 h-8 rounded-lg border border-white/[0.06] flex items-center justify-center text-white/20 group-hover:text-white/50 group-hover:border-white/15 transition-all mt-0.5">
                    →
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-14 p-8 rounded-[24px] bg-purple-500/[0.04] border border-purple-500/15 text-center">
          <p className="text-[15px] font-bold text-white mb-2">
            Quer ver seus dados reais analisados pela IA?
          </p>
          <p className="text-[13px] text-white/30 mb-5">
            O ErizonAI identifica campanhas críticas e recomenda o que fazer — em português.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[13px] font-bold transition-all shadow-[0_0_25px_rgba(147,51,234,0.25)]"
          >
            Teste grátis por 7 dias <ArrowRight size={13} />
          </Link>
        </div>

        {/* Footer mini */}
        <div className="mt-10 pt-8 border-t border-white/[0.04] flex items-center justify-between flex-wrap gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-purple-600 flex items-center justify-center">
              <Zap size={10} className="text-white" />
            </div>
            <span className="text-[12px] font-black italic uppercase text-white/40">Erizon</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/privacidade" className="text-[11px] text-white/20 hover:text-white/40 transition-colors">Privacidade</Link>
            <Link href="/termos" className="text-[11px] text-white/20 hover:text-white/40 transition-colors">Termos</Link>
            <Link href="/login" className="text-[11px] text-white/20 hover:text-white/40 transition-colors">Entrar</Link>
          </div>
        </div>

      </main>
    </div>
  );
}