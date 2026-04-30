"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Check, Eye, FileText, Loader2, Newspaper, Pencil, Send, ShieldAlert, Sparkles, X } from "lucide-react";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  description?: string;
  content: string;
  category: string;
  content_type: string;
  status: string;
  created_at?: string;
  published_at?: string;
  identification_risk_level: string;
  identification_risk_notes?: string;
  source_name?: string;
  source_url?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  campaign_data_summary?: string;
  freshness_level?: string;
};

const statuses = ["Todos", "draft", "waiting_review", "approved", "rejected", "scheduled", "published"];
const categories = ["Todos", "Automação com IA", "Gestão de tráfego", "Meta Ads", "Google Ads", "Criativos", "Performance", "Growth", "Estudos anônimos", "Notícias do mercado", "Relatórios semanais", "Relatórios mensais"];
const types = ["Todos", "seo_educational", "anonymous_case_study", "market_news", "weekly_report", "monthly_report", "performance_insight"];
const risks = ["Todos", "Baixo", "Médio", "Alto"];

const typeLabels: Record<string, string> = {
  seo_educational: "Educativo SEO",
  anonymous_case_study: "Estudo anônimo",
  market_news: "Notícia do mercado",
  weekly_report: "Relatório semanal",
  monthly_report: "Relatório mensal",
  performance_insight: "Insight de performance",
};

function formatDate(value?: string) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function SelectFilter({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: string[]; label: string }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/28">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-[8px] border border-white/10 bg-[#071014] px-3 text-[12px] normal-case tracking-normal text-white/72 outline-none">
        {options.map((option) => <option key={option} value={option}>{typeLabels[option] || option}</option>)}
      </select>
    </label>
  );
}

export default function IntelligentBlogAdminPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("Todos");
  const [category, setCategory] = useState("Todos");
  const [contentType, setContentType] = useState("Todos");
  const [risk, setRisk] = useState("Todos");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== "Todos") params.set("status", status);
    if (category !== "Todos") params.set("category", category);
    if (contentType !== "Todos") params.set("content_type", contentType);
    if (risk !== "Todos") params.set("risk", risk);
    return params.toString();
  }, [status, category, contentType, risk]);

  async function loadPosts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/blog?${query}`);
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao carregar posts.");
      const data = await res.json();
      setPosts(data.posts || []);
      if (selected) {
        const freshSelected = (data.posts || []).find((post: BlogPost) => post.id === selected.id);
        if (freshSelected) setSelected(freshSelected);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function generate(endpoint: string, label: string) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar conteúdo.");
      if (data.skipped) {
        setNotice(`Conteúdo não gerado: ${data.reason || "não havia dados reais suficientes para gerar com segurança."}`);
      } else {
        setNotice("Conteúdo gerado e enviado para revisão.");
      }
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setBusy("");
    }
  }

  async function action(endpoint: string, id: string) {
    setBusy(endpoint);
    setError("");
    setNotice("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao executar ação.");
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setBusy("");
    }
  }

  async function saveDraft() {
    if (!selected) return;
    setBusy("salvar");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/blog/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
      setSelected(data.post);
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <main className="min-h-screen bg-[#03070a] px-5 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-[13px] text-white/42 hover:text-cyan-100">
              <ArrowLeft size={14} /> Voltar ao admin
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-cyan-200/20 bg-cyan-200/10">
                <Sparkles size={20} className="text-cyan-100" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-cyan-100/50">Admin</p>
                <h1 className="text-[28px] font-black">Blog Inteligente</h1>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => generate("/api/blog/generate-daily", "hoje")} className="inline-flex items-center gap-2 rounded-[8px] bg-cyan-200 px-4 py-2.5 text-[12px] font-black text-[#041016] disabled:opacity-50" disabled={!!busy}>
              {busy === "hoje" ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Gerar post de hoje
            </button>
            <button onClick={() => generate("/api/blog/generate-anonymous-study", "estudo")} className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-bold text-white/72 disabled:opacity-50" disabled={!!busy}>
              <ShieldAlert size={14} /> Gerar estudo anônimo
            </button>
            <button onClick={() => generate("/api/blog/generate-weekly-report", "semanal")} className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-bold text-white/72 disabled:opacity-50" disabled={!!busy}>
              <CalendarClock size={14} /> Gerar relatório semanal
            </button>
            <button onClick={() => generate("/api/blog/generate-monthly-report", "mensal")} className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-bold text-white/72 disabled:opacity-50" disabled={!!busy}>
              <Newspaper size={14} /> Gerar relatório mensal
            </button>
          </div>
        </div>

        {error && <div className="mb-5 rounded-[8px] border border-red-400/25 bg-red-400/10 p-4 text-[13px] text-red-100">{error}</div>}
        {notice && <div className="mb-5 rounded-[8px] border border-cyan-300/25 bg-cyan-300/10 p-4 text-[13px] text-cyan-50">{notice}</div>}

        <section className="mb-6 grid gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] p-4 md:grid-cols-4">
          <SelectFilter label="Status" value={status} onChange={setStatus} options={statuses} />
          <SelectFilter label="Categoria" value={category} onChange={setCategory} options={categories} />
          <SelectFilter label="Tipo" value={contentType} onChange={setContentType} options={types} />
          <SelectFilter label="Risco" value={risk} onChange={setRisk} options={risks} />
        </section>

        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.03] py-20 text-white/42">
                <Loader2 className="mr-2 animate-spin" size={16} /> Carregando posts
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-8 text-center text-white/42">Nenhum post encontrado.</div>
            ) : posts.map((post) => (
              <article key={post.id} className={`rounded-[8px] border p-4 transition ${selected?.id === post.id ? "border-cyan-200/45 bg-cyan-200/[0.055]" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => setSelected(post)} className="text-left">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/60">{typeLabels[post.content_type] || post.content_type}</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/60">{post.status}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${post.identification_risk_level === "Alto" ? "border-red-300/25 bg-red-300/10 text-red-100" : post.identification_risk_level === "Médio" ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"}`}>
                        Risco {post.identification_risk_level}
                      </span>
                    </div>
                    <h2 className="text-[16px] font-black leading-tight">{post.title}</h2>
                    <p className="mt-2 text-[12px] text-white/42">{post.category} · criado em {formatDate(post.created_at)} · publicado em {formatDate(post.published_at)}</p>
                    {post.source_name && <p className="mt-2 text-[12px] text-cyan-100/72">Fonte: {post.source_name}</p>}
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <Link href={`/blog/${post.slug}`} className="rounded-[8px] border border-white/10 p-2 text-white/50 hover:text-white"><Eye size={14} /></Link>
                    <button onClick={() => setSelected(post)} className="rounded-[8px] border border-white/10 p-2 text-white/50 hover:text-white"><Pencil size={14} /></button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => action("/api/blog/approve", post.id)} className="inline-flex items-center gap-1 rounded-[8px] border border-emerald-300/20 px-3 py-1.5 text-[11px] text-emerald-100 hover:bg-emerald-300/10"><Check size={12} /> Aprovar</button>
                  <button onClick={() => action("/api/blog/reject", post.id)} className="inline-flex items-center gap-1 rounded-[8px] border border-red-300/20 px-3 py-1.5 text-[11px] text-red-100 hover:bg-red-300/10"><X size={12} /> Reprovar</button>
                  <button onClick={() => action("/api/blog/publish", post.id)} className="inline-flex items-center gap-1 rounded-[8px] border border-cyan-300/20 px-3 py-1.5 text-[11px] text-cyan-100 hover:bg-cyan-300/10"><Send size={12} /> Publicar</button>
                  <button onClick={() => action("/api/blog/schedule", post.id)} className="inline-flex items-center gap-1 rounded-[8px] border border-white/10 px-3 py-1.5 text-[11px] text-white/58 hover:bg-white/[0.05]"><CalendarClock size={12} /> Agendar</button>
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-[8px] border border-white/10 bg-white/[0.03] p-5">
            {!selected ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center text-white/42">
                <FileText size={32} className="mb-3" />
                <p className="text-[14px]">Selecione um post para revisar, editar e publicar.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-white/28">Tela de revisão</p>
                    <h2 className="mt-1 text-[22px] font-black">Editor do artigo</h2>
                  </div>
                  <button onClick={saveDraft} disabled={busy === "salvar"} className="inline-flex items-center gap-2 rounded-[8px] bg-cyan-200 px-4 py-2.5 text-[12px] font-black text-[#041016] disabled:opacity-50">
                    {busy === "salvar" ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Salvar rascunho
                  </button>
                </div>

                <input value={selected.title || ""} onChange={(event) => setSelected({ ...selected, title: event.target.value })} className="w-full rounded-[8px] border border-white/10 bg-[#071014] px-4 py-3 text-[16px] font-bold outline-none" />
                <input value={selected.slug || ""} onChange={(event) => setSelected({ ...selected, slug: event.target.value })} className="w-full rounded-[8px] border border-white/10 bg-[#071014] px-4 py-3 text-[13px] text-white/72 outline-none" />
                <textarea value={selected.excerpt || selected.description || ""} onChange={(event) => setSelected({ ...selected, excerpt: event.target.value, description: event.target.value })} rows={3} className="w-full rounded-[8px] border border-white/10 bg-[#071014] px-4 py-3 text-[13px] leading-relaxed text-white/72 outline-none" />

                <div className="grid gap-3 md:grid-cols-2">
                  <SelectFilter label="Categoria" value={selected.category} onChange={(value) => setSelected({ ...selected, category: value })} options={categories.filter((item) => item !== "Todos")} />
                  <SelectFilter label="Tipo de conteúdo" value={selected.content_type} onChange={(value) => setSelected({ ...selected, content_type: value })} options={types.filter((item) => item !== "Todos")} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input value={selected.seo_title || ""} onChange={(event) => setSelected({ ...selected, seo_title: event.target.value })} placeholder="SEO title" className="rounded-[8px] border border-white/10 bg-[#071014] px-4 py-3 text-[13px] outline-none" />
                  <input value={selected.seo_description || ""} onChange={(event) => setSelected({ ...selected, seo_description: event.target.value })} placeholder="Meta description" className="rounded-[8px] border border-white/10 bg-[#071014] px-4 py-3 text-[13px] outline-none" />
                </div>

                <div className="rounded-[8px] border border-white/10 bg-[#071014] p-4">
                  <p className="text-[12px] font-bold text-white">Risco de identificação: {selected.identification_risk_level}</p>
                  <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-white/48">{selected.identification_risk_notes || "Sem notas registradas."}</p>
                </div>

                <div className="rounded-[8px] border border-white/10 bg-[#071014] p-4">
                  <p className="text-[12px] font-bold text-white">Dados anonimizados usados</p>
                  <p className="mt-2 text-[12px] leading-relaxed text-white/48">{selected.campaign_data_summary || "Sem dados internos vinculados."}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input value={selected.source_name || ""} onChange={(event) => setSelected({ ...selected, source_name: event.target.value })} placeholder="Fonte usada" className="rounded-[8px] border border-white/10 bg-[#071014] px-4 py-3 text-[13px] outline-none" />
                  <input value={selected.source_url || ""} onChange={(event) => setSelected({ ...selected, source_url: event.target.value })} placeholder="Link da fonte" className="rounded-[8px] border border-white/10 bg-[#071014] px-4 py-3 text-[13px] outline-none" />
                </div>

                <textarea value={selected.content || ""} onChange={(event) => setSelected({ ...selected, content: event.target.value })} rows={18} className="w-full rounded-[8px] border border-white/10 bg-[#071014] px-4 py-3 font-mono text-[12px] leading-relaxed text-white/74 outline-none" />

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => action("/api/blog/approve", selected.id)} className="inline-flex items-center gap-2 rounded-[8px] border border-emerald-300/20 px-4 py-2 text-[12px] text-emerald-100"><Check size={14} /> Aprovar</button>
                  <button onClick={() => action("/api/blog/reject", selected.id)} className="inline-flex items-center gap-2 rounded-[8px] border border-red-300/20 px-4 py-2 text-[12px] text-red-100"><X size={14} /> Reprovar</button>
                  <button onClick={() => action("/api/blog/publish", selected.id)} className="inline-flex items-center gap-2 rounded-[8px] border border-cyan-300/20 px-4 py-2 text-[12px] text-cyan-100"><Send size={14} /> Publicar</button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
