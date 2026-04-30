"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Database, Loader2, RefreshCw, XCircle } from "lucide-react";

type HealthResponse = {
  status: "OK" | "Atenção" | "Erro";
  generated_at: string;
  expected_tables: string[];
  found_tables: string[];
  missing_tables: string[];
  tables_used_without_create_migration: string[];
  counts: Record<string, number | null>;
  intelligent_blog: {
    reads_primary_table: string;
    reads_fallback_table: string;
    primary_count: number;
    fallback_count: number;
    status: "OK" | "Atenção" | "Erro";
    alert: string;
  };
  recommendations: string[];
};

function StatusBadge({ status }: { status: string }) {
  const config = status === "OK"
    ? { icon: CheckCircle2, cls: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" }
    : status === "Erro"
      ? { icon: XCircle, cls: "border-red-300/25 bg-red-300/10 text-red-100" }
      : { icon: AlertTriangle, cls: "border-amber-300/25 bg-amber-300/10 text-amber-100" };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-bold ${config.cls}`}>
      <Icon size={14} /> {status}
    </span>
  );
}

function CountCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[11px] uppercase tracking-widest text-white/28">{label}</p>
      <p className="mt-2 font-mono text-[24px] font-black text-white">{value ?? "Faltando"}</p>
    </div>
  );
}

export default function DatabaseHealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/database-health");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao carregar diagnóstico.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const missingPreview = useMemo(() => data?.missing_tables.slice(0, 40) ?? [], [data]);

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
                <Database size={20} className="text-cyan-100" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-cyan-100/50">Admin</p>
                <h1 className="text-[28px] font-black">Saúde do banco de dados</h1>
              </div>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-bold text-white/72 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            Atualizar diagnóstico
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.03] py-24 text-white/42">
            <Loader2 className="mr-2 animate-spin" size={16} /> Verificando Supabase
          </div>
        )}

        {error && <div className="rounded-[8px] border border-red-300/25 bg-red-300/10 p-4 text-[13px] text-red-100">{error}</div>}

        {data && !loading && (
          <div className="space-y-6">
            <section className="rounded-[8px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-white/28">Status geral</p>
                  <h2 className="mt-1 text-[22px] font-black">Diagnóstico do Supabase</h2>
                </div>
                <StatusBadge status={data.status} />
              </div>
              <p className="mt-4 text-[13px] text-white/48">
                Gerado em {new Date(data.generated_at).toLocaleString("pt-BR")}. Tabelas esperadas: {data.expected_tables.length}. Encontradas: {data.found_tables.length}. Ausentes: {data.missing_tables.length}.
              </p>
            </section>

            <section className="grid gap-3 md:grid-cols-4">
              <CountCard label="blog_posts" value={data.counts.blog_posts} />
              <CountCard label="campaign_snapshots_daily" value={data.counts.campaign_snapshots_daily} />
              <CountCard label="campaign_perf_snapshots" value={data.counts.campaign_perf_snapshots} />
              <CountCard label="metricas_ads" value={data.counts.metricas_ads} />
            </section>

            <section className="rounded-[8px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[18px] font-black">Blog Inteligente</h2>
                <StatusBadge status={data.intelligent_blog.status} />
              </div>
              <p className="text-[13px] leading-relaxed text-white/58">{data.intelligent_blog.alert}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <CountCard label={`Tabela oficial: ${data.intelligent_blog.reads_primary_table}`} value={data.intelligent_blog.primary_count} />
                <CountCard label={`Fallback real: ${data.intelligent_blog.reads_fallback_table}`} value={data.intelligent_blog.fallback_count} />
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-5">
                <h2 className="text-[18px] font-black">Tabelas ausentes</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {missingPreview.length === 0 ? (
                    <span className="text-[13px] text-emerald-100">Nenhuma tabela esperada ausente.</span>
                  ) : missingPreview.map((table) => (
                    <span key={table} className="rounded-full border border-red-300/20 bg-red-300/10 px-3 py-1 text-[12px] text-red-100">{table}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-5">
                <h2 className="text-[18px] font-black">Usadas sem migration de criação</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.tables_used_without_create_migration.length === 0 ? (
                    <span className="text-[13px] text-emerald-100">Todas as tabelas usadas têm migration de criação.</span>
                  ) : data.tables_used_without_create_migration.map((table) => (
                    <span key={table} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[12px] text-amber-100">{table}</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[8px] border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-[18px] font-black">Recomendações</h2>
              <ul className="mt-4 space-y-2">
                {data.recommendations.length === 0 ? (
                  <li className="text-[13px] text-emerald-100">Nenhuma correção obrigatória encontrada.</li>
                ) : data.recommendations.map((item) => (
                  <li key={item} className="text-[13px] leading-relaxed text-white/58">- {item}</li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

