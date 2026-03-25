"use client";

// app/benchmarks/page.tsx — Benchmarks de Mercado
// Compara CPM, CPC e CPL das campanhas do usuário com médias do mercado brasileiro por nicho.

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import { Loader2, TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react";
import { RedeInteligencia } from "@/components/dados/RedeInteligencia";

// ─── Benchmarks Meta Ads Brasil 2024-2025 por nicho ──────────────────────────
const BENCHMARKS = {
  imobiliario: {
    label: "Imobiliário", emoji: "🏠",
    cpm_min: 18, cpm_max: 45,
    cpc_min: 1.5, cpc_max: 4.5,
    cpl_min: 25, cpl_max: 90,
    ctr_min: 0.8, ctr_max: 2.2,
  },
  ecommerce: {
    label: "E-commerce", emoji: "🛒",
    cpm_min: 12, cpm_max: 35,
    cpc_min: 0.8, cpc_max: 2.5,
    cpl_min: 8,  cpl_max: 35,
    ctr_min: 1.0, ctr_max: 3.0,
  },
  saude: {
    label: "Saúde & Estética", emoji: "💊",
    cpm_min: 15, cpm_max: 40,
    cpc_min: 1.2, cpc_max: 3.8,
    cpl_min: 20, cpl_max: 75,
    ctr_min: 0.9, ctr_max: 2.5,
  },
  educacao: {
    label: "Educação & Cursos", emoji: "🎓",
    cpm_min: 10, cpm_max: 30,
    cpc_min: 0.7, cpc_max: 2.2,
    cpl_min: 12, cpl_max: 50,
    ctr_min: 1.2, ctr_max: 3.5,
  },
  financeiro: {
    label: "Financeiro & Seguros", emoji: "💰",
    cpm_min: 22, cpm_max: 60,
    cpc_min: 2.0, cpc_max: 6.0,
    cpl_min: 30, cpl_max: 120,
    ctr_min: 0.6, ctr_max: 1.8,
  },
  alimentacao: {
    label: "Alimentação & Delivery", emoji: "🍔",
    cpm_min: 8,  cpm_max: 25,
    cpc_min: 0.5, cpc_max: 1.8,
    cpl_min: 5,  cpl_max: 25,
    ctr_min: 1.5, ctr_max: 4.0,
  },
  automotivo: {
    label: "Automotivo", emoji: "🚗",
    cpm_min: 16, cpm_max: 42,
    cpc_min: 1.4, cpc_max: 4.2,
    cpl_min: 22, cpl_max: 85,
    ctr_min: 0.7, ctr_max: 2.0,
  },
  tecnologia: {
    label: "Tecnologia & SaaS", emoji: "💻",
    cpm_min: 14, cpm_max: 38,
    cpc_min: 1.0, cpc_max: 3.5,
    cpl_min: 18, cpl_max: 70,
    ctr_min: 0.9, ctr_max: 2.8,
  },
  varejo: {
    label: "Varejo & Moda", emoji: "👗",
    cpm_min: 10, cpm_max: 28,
    cpc_min: 0.6, cpc_max: 2.0,
    cpl_min: 7,  cpl_max: 30,
    ctr_min: 1.3, ctr_max: 3.8,
  },
  turismo: {
    label: "Turismo & Viagens", emoji: "✈️",
    cpm_min: 13, cpm_max: 35,
    cpc_min: 0.9, cpc_max: 3.0,
    cpl_min: 15, cpl_max: 60,
    ctr_min: 1.0, ctr_max: 3.2,
  },
  servicos: {
    label: "Serviços Locais", emoji: "🔧",
    cpm_min: 11, cpm_max: 32,
    cpc_min: 0.8, cpc_max: 2.8,
    cpl_min: 15, cpl_max: 65,
    ctr_min: 0.8, ctr_max: 2.4,
  },
} as const;

type NichoKey = keyof typeof BENCHMARKS;
type Status = "abaixo" | "dentro" | "acima";

interface Campanha {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  cpm: number;
  cpc: number;
  ctr: number;
  impressoes: number;
}

function avaliarCusto(valor: number, min: number, max: number): Status {
  if (valor < min) return "abaixo";
  if (valor > max) return "acima";
  return "dentro";
}

function avaliarCTR(valor: number, min: number, max: number): Status {
  if (valor < min) return "abaixo";
  if (valor > max) return "acima";
  return "dentro";
}

const STATUS_CONFIG: Record<Status, { label: string; cor: string; bg: string }> = {
  abaixo: { label: "abaixo da média", cor: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  dentro: { label: "dentro da média", cor: "text-white/50",    bg: "bg-white/[0.03] border-white/[0.07]"     },
  acima:  { label: "acima da média",  cor: "text-red-400",     bg: "bg-red-500/10 border-red-500/20"         },
};

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

export default function BenchmarksPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading]     = useState(true);
  const [nicho, setNicho]         = useState<NichoKey>("imobiliario");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("metricas_ads").select("*")
        .eq("user_id", user.id)
        .in("status", ["ATIVO", "ACTIVE", "ATIVA"]);
      setCampanhas((data ?? []) as Campanha[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const bench = BENCHMARKS[nicho];

  const minhas = useMemo(() => {
    const ativas = campanhas.filter(c => c.gasto_total > 0 && c.impressoes > 0);
    if (!ativas.length) return null;
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const comLead = ativas.filter(c => c.contatos > 0);
    return {
      cpm: avg(ativas.map(c => c.cpm ?? 0)),
      cpc: avg(ativas.map(c => c.cpc ?? 0)),
      cpl: comLead.length ? avg(comLead.map(c => c.gasto_total / c.contatos)) : 0,
      ctr: avg(ativas.map(c => c.ctr ?? 0)),
      total: ativas.length,
    };
  }, [campanhas]);

  const analises = useMemo(() => campanhas
    .filter(c => c.gasto_total > 0 && c.impressoes > 0)
    .map(c => {
      const cpl = c.contatos > 0 ? c.gasto_total / c.contatos : null;
      return {
        ...c, cpl,
        st_cpm: avaliarCusto(c.cpm, bench.cpm_min, bench.cpm_max),
        st_cpc: avaliarCusto(c.cpc, bench.cpc_min, bench.cpc_max),
        st_cpl: cpl !== null ? avaliarCusto(cpl, bench.cpl_min, bench.cpl_max) : null,
        st_ctr: avaliarCTR(c.ctr, bench.ctr_min, bench.ctr_max),
      };
    }), [campanhas, bench]);

  return (
    <>
      <Sidebar />
      <div className="ml-[60px] min-h-screen bg-[#040406] text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] text-fuchsia-400 font-semibold uppercase tracking-wider mb-1">Inteligência de Mercado</p>
            <h1 className="text-2xl font-bold text-white">Benchmarks de Mercado</h1>
            <p className="text-sm text-white/40 mt-1">
              Compare CPM, CPC, CPL e CTR das suas campanhas com as médias reais do mercado brasileiro.
            </p>
          </div>

          {/* Rede de Inteligência — posição real do workspace */}
          <div className="mb-6">
            <RedeInteligencia />
          </div>

          {/* Seletor de nicho */}
          <div className="mb-6">
            <p className="text-[11px] text-white/30 uppercase tracking-wider mb-3">Selecione o nicho</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(BENCHMARKS) as NichoKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => setNicho(key)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                    nicho === key
                      ? "bg-fuchsia-600/20 border-fuchsia-500/40 text-fuchsia-300"
                      : "bg-white/[0.03] border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/70"
                  }`}
                >
                  {BENCHMARKS[key].emoji} {BENCHMARKS[key].label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin text-fuchsia-400" />
            </div>
          ) : (
            <div className="space-y-6">

              {/* Referências do nicho */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={16} className="text-fuchsia-400" />
                  <p className="text-sm font-semibold text-white">
                    Médias de mercado — {bench.emoji} {bench.label}
                  </p>
                  <span className="text-[10px] text-white/20 ml-auto">Meta Ads Brasil 2024-2025</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "CPM",  range: `${fmtBRL(bench.cpm_min)} – ${fmtBRL(bench.cpm_max)}`, dica: "Custo por mil impressões" },
                    { label: "CPC",  range: `${fmtBRL(bench.cpc_min)} – ${fmtBRL(bench.cpc_max)}`, dica: "Custo por clique" },
                    { label: "CPL",  range: `${fmtBRL(bench.cpl_min)} – ${fmtBRL(bench.cpl_max)}`, dica: "Custo por lead" },
                    { label: "CTR",  range: `${fmtPct(bench.ctr_min)} – ${fmtPct(bench.ctr_max)}`, dica: "Taxa de clique esperada" },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{m.label}</p>
                      <p className="text-sm font-bold text-white">{m.range}</p>
                      <p className="text-[10px] text-white/25 mt-1">{m.dica}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suas médias vs mercado */}
              {minhas ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-sm font-semibold text-white mb-4">
                    Suas médias vs mercado
                    <span className="text-[11px] text-white/30 font-normal ml-2">
                      ({minhas.total} campanha{minhas.total !== 1 ? "s" : ""})
                    </span>
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "CPM", valor: minhas.cpm, st: avaliarCusto(minhas.cpm, bench.cpm_min, bench.cpm_max), fmt: fmtBRL, inverso: true },
                      { label: "CPC", valor: minhas.cpc, st: avaliarCusto(minhas.cpc, bench.cpc_min, bench.cpc_max), fmt: fmtBRL, inverso: true },
                      { label: "CPL", valor: minhas.cpl, st: minhas.cpl > 0 ? avaliarCusto(minhas.cpl, bench.cpl_min, bench.cpl_max) : "dentro" as Status, fmt: fmtBRL, inverso: true },
                      { label: "CTR", valor: minhas.ctr, st: avaliarCTR(minhas.ctr, bench.ctr_min, bench.ctr_max), fmt: fmtPct, inverso: false },
                    ].map(m => {
                      const cfg = STATUS_CONFIG[m.st];
                      const isGood = m.inverso ? m.st === "abaixo" : m.st === "acima";
                      const isBad  = m.inverso ? m.st === "acima"  : m.st === "abaixo";
                      const Icon   = isGood ? TrendingDown : isBad ? TrendingUp : Minus;
                      return (
                        <div key={m.label} className={`rounded-xl border p-4 ${cfg.bg}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">{m.label}</p>
                            <Icon size={12} className={isGood ? "text-emerald-400" : isBad ? "text-red-400" : "text-white/25"} />
                          </div>
                          <p className={`text-base font-bold ${isGood ? "text-emerald-400" : isBad ? "text-red-400" : "text-white"}`}>
                            {m.valor > 0 ? m.fmt(m.valor) : "—"}
                          </p>
                          <p className={`text-[10px] mt-1 ${cfg.cor}`}>{cfg.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                  <p className="text-white/30 text-sm">
                    Nenhuma campanha ativa. Sincronize em Analytics para ver sua posição no mercado.
                  </p>
                </div>
              )}

              {/* Campanha a campanha */}
              {analises.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-white mb-3">Análise por campanha</p>
                  <div className="space-y-3">
                    {analises.map(c => (
                      <div key={c.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="text-sm font-medium text-white mb-3 truncate">{c.nome_campanha}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { label: "CPM", valor: c.cpm,  fmt: fmtBRL, st: c.st_cpm, inverso: true },
                            { label: "CPC", valor: c.cpc,  fmt: fmtBRL, st: c.st_cpc, inverso: true },
                            { label: "CPL", valor: c.cpl,  fmt: fmtBRL, st: c.st_cpl, inverso: true },
                            { label: "CTR", valor: c.ctr,  fmt: fmtPct, st: c.st_ctr, inverso: false },
                          ].map(m => {
                            if (!m.st || !m.valor) {
                              return (
                                <div key={m.label} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                                  <p className="text-[9px] text-white/20 uppercase mb-1">{m.label}</p>
                                  <p className="text-sm text-white/15">—</p>
                                </div>
                              );
                            }
                            const st = m.st as Status;
                            const cfg = STATUS_CONFIG[st];
                            const isGood = m.inverso ? st === "abaixo" : st === "acima";
                            const isBad  = m.inverso ? st === "acima"  : st === "abaixo";
                            return (
                              <div key={m.label} className={`rounded-lg border p-3 ${cfg.bg}`}>
                                <p className="text-[9px] text-white/25 uppercase mb-1">{m.label}</p>
                                <p className={`text-sm font-bold ${isGood ? "text-emerald-400" : isBad ? "text-red-400" : "text-white/60"}`}>
                                  {m.fmt(m.valor as number)}
                                </p>
                                <p className={`text-[9px] mt-0.5 ${cfg.cor}`}>
                                  {isGood ? "✓ eficiente" : isBad ? "↑ alto" : "ok"}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legenda */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4">
                <p className="text-[10px] text-white/20 uppercase tracking-wider mb-2">Como interpretar</p>
                <div className="space-y-1 text-[11px] text-white/30">
                  <p><span className="text-emerald-400">CPM/CPC/CPL abaixo da média</span> → você paga menos que o mercado — boa eficiência</p>
                  <p><span className="text-red-400">CPM/CPC/CPL acima da média</span> → custo elevado — revisar segmentação ou criativo</p>
                  <p><span className="text-emerald-400">CTR acima da média</span> → anúncio relevante — público respondendo bem</p>
                  <p className="text-white/15 pt-1">Benchmarks baseados em dados Meta Ads Brasil 2024-2025. Variam por sazonalidade, orçamento e qualidade criativa.</p>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
