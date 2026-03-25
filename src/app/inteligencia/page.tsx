"use client";

// app/inteligencia/page.tsx — Network Intelligence
// Benchmarks e insights estratégicos gerados das campanhas reais.

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";

import { getSupabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown, Minus, Globe } from "lucide-react";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";

interface Campanha {
  id: string; nome_campanha: string;
  gasto_total: number; contatos: number; receita_estimada: number;
  ctr: number; cpm: number; impressoes: number; dias_ativo: number;
}

interface Benchmark { label: string; valor: string; descricao: string; tendencia: "up" | "down" | "neutral" }
interface Insight    { id: string; titulo: string; descricao: string; ganho: string; tipo: "criativo" | "audiencia" | "budget" | "timing" }

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function gerarBenchmarks(campanhas: Campanha[]): Benchmark[] {
  if (campanhas.length === 0) return [];
  const comLeads  = campanhas.filter(c => c.contatos > 0 && c.gasto_total > 0);
  const comCTR    = campanhas.filter(c => c.ctr > 0);
  const comCPM    = campanhas.filter(c => c.cpm > 0);
  const ctrMedio  = comCTR.length  > 0 ? comCTR.reduce((s, c) => s + c.ctr, 0) / comCTR.length : 0;
  const cplMedio  = comLeads.length > 0 ? comLeads.reduce((s, c) => s + c.gasto_total / c.contatos, 0) / comLeads.length : 0;
  const cpmMedio  = comCPM.length  > 0 ? comCPM.reduce((s, c) => s + c.cpm, 0) / comCPM.length : 0;
  const comGasto  = campanhas.filter(c => c.gasto_total > 0);
  const roasMedio = comGasto.length > 0 ? comGasto.reduce((s, c) => s + c.receita_estimada / c.gasto_total, 0) / comGasto.length : 0;
  return [
    { label: "CTR médio", valor: ctrMedio > 0 ? `${ctrMedio.toFixed(2)}%` : "—",
      descricao: ctrMedio >= 2 ? "Acima da média de mercado (1.5%)" : ctrMedio >= 1 ? "Dentro da média de mercado" : "Abaixo da média — revisar criativos",
      tendencia: ctrMedio >= 1.5 ? "up" : ctrMedio >= 0.8 ? "neutral" : "down" },
    { label: "CPL médio", valor: cplMedio > 0 ? fmtBRL(cplMedio) : "—",
      descricao: cplMedio < 60 ? "Eficiente — abaixo de R$60" : cplMedio < 120 ? "Dentro da faixa aceitável" : "Elevado — acima de R$120",
      tendencia: cplMedio < 60 ? "up" : cplMedio < 120 ? "neutral" : "down" },
    { label: "CPM médio", valor: cpmMedio > 0 ? fmtBRL(cpmMedio) : "—",
      descricao: cpmMedio < 25 ? "Baixo custo de alcance" : cpmMedio < 50 ? "CPM dentro do esperado" : "Audiência saturada ou concorrência alta",
      tendencia: cpmMedio < 25 ? "up" : cpmMedio < 50 ? "neutral" : "down" },
    { label: "ROAS médio", valor: roasMedio > 0 ? `${roasMedio.toFixed(2)}×` : "—",
      descricao: roasMedio >= 3 ? "Excelente retorno sobre investimento" : roasMedio >= 2 ? "Retorno positivo e sustentável" : roasMedio >= 1 ? "Margem apertada — otimizar" : "Prejuízo — ação urgente",
      tendencia: roasMedio >= 2 ? "up" : roasMedio >= 1 ? "neutral" : "down" },
  ];
}

function gerarInsights(campanhas: Campanha[]): Insight[] {
  const insights: Insight[] = [];
  if (campanhas.length === 0) return insights;
  const comLeads   = campanhas.filter(c => c.contatos > 0 && c.gasto_total > 0);
  const semLeads   = campanhas.filter(c => {
    const nome = (c.nome_campanha ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isAwareness = /alcance|reach|awareness|trafego|traffic/.test(nome);
    return c.contatos === 0 && c.gasto_total > 100 && !isAwareness;
  });
  const melhorCTR  = [...campanhas].filter(c => c.ctr > 0).sort((a, b) => b.ctr - a.ctr)[0];
  const melhorROAS = campanhas.filter(c => c.gasto_total > 0).sort((a, b) => (b.receita_estimada / b.gasto_total) - (a.receita_estimada / a.gasto_total))[0];
  if (semLeads.length > 0) {
    insights.push({ id: "i1", tipo: "budget",
      titulo: `${semLeads.length} campanha${semLeads.length > 1 ? "s" : ""} consumindo budget sem retorno`,
      descricao: `${semLeads.map(c => `"${c.nome_campanha}"`).slice(0, 2).join(", ")}${semLeads.length > 2 ? ` e mais ${semLeads.length - 2}` : ""} somam ${fmtBRL(semLeads.reduce((s, c) => s + c.gasto_total, 0))} sem nenhum lead.`,
      ganho: `Pausar libera ${fmtBRL(semLeads.reduce((s, c) => s + c.gasto_total / Math.max(c.dias_ativo, 1), 0) * 30)}/mês para realocar.` });
  }
  if (melhorCTR && melhorCTR.ctr > 1.5) {
    insights.push({ id: "i2", tipo: "criativo",
      titulo: `"${melhorCTR.nome_campanha}" tem o melhor criativo`,
      descricao: `CTR de ${melhorCTR.ctr.toFixed(2)}% — acima da média. Hook e formato bem calibrados.`,
      ganho: "Replicar estrutura deste criativo para as demais pode elevar o CTR médio da conta." });
  }
  if (melhorROAS && melhorROAS.gasto_total > 0) {
    const roas = melhorROAS.receita_estimada / melhorROAS.gasto_total;
    if (roas >= 2) {
      insights.push({ id: "i3", tipo: "budget",
        titulo: `Oportunidade de escala em "${melhorROAS.nome_campanha}"`,
        descricao: `ROAS de ${roas.toFixed(2)}× com ${melhorROAS.contatos} leads. Headroom para escala segura.`,
        ganho: `+${fmtBRL(melhorROAS.gasto_total * 0.2 * roas)}/mês estimado com 20% a mais no orçamento.` });
    }
  }
  if (comLeads.length >= 3) {
    const cplValues = comLeads.map(c => c.gasto_total / c.contatos);
    const melhorCPL = Math.min(...cplValues);
    const piorCPL   = Math.max(...cplValues);
    if (piorCPL > melhorCPL * 2) {
      insights.push({ id: "i4", tipo: "audiencia",
        titulo: "Grande variação de CPL entre campanhas",
        descricao: `CPL varia de ${fmtBRL(melhorCPL)} a ${fmtBRL(piorCPL)} — diferença de ${Math.round((piorCPL / melhorCPL - 1) * 100)}%.`,
        ganho: "Migrar budget das campanhas com CPL alto para as com CPL baixo melhora eficiência sem aumentar investimento." });
    }
  }
  return insights;
}

const TIPO_ICON: Record<string, string> = { criativo: "🎨", audiencia: "🎯", budget: "💰", timing: "⏱" };

function TendIcon({ t }: { t: "up" | "down" | "neutral" }) {
  if (t === "up")      return <TrendingUp  size={14} className="text-emerald-400" />;
  if (t === "down")    return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-white/30" />;
}

function BenchCard({ b }: { b: Benchmark; key?: string | number }) {
  const cor = b.tendencia === "up" ? "text-emerald-400" : b.tendencia === "down" ? "text-red-400" : "text-white";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-white/30 uppercase tracking-wider">{b.label}</p>
        <TendIcon t={b.tendencia} />
      </div>
      <p className={`text-2xl font-bold ${cor}`}>{b.valor}</p>
      <p className="text-[11px] text-white/40 mt-2 leading-relaxed">{b.descricao}</p>
    </div>
  );
}

export default function InteligenciaPage() {
  const supabase = useMemo(() => getSupabase(), []);
  useSessionGuard();

  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("metricas_ads").select("*")
        .eq("user_id", user.id).order("gasto_total", { ascending: false });
      setCampanhas((data ?? []) as Campanha[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const benchmarks = useMemo(() => gerarBenchmarks(campanhas), [campanhas]);
  const insights   = useMemo(() => gerarInsights(campanhas), [campanhas]);
  const totalInvestido  = campanhas.reduce((s, c) => s + c.gasto_total, 0);
  const totalLeads      = campanhas.reduce((s, c) => s + c.contatos, 0);
  const totalImpressoes = campanhas.reduce((s, c) => s + c.impressoes, 0);

  return (
    <>
      <Sidebar />
      <div className="ml-[60px] min-h-screen bg-[#040406] text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider mb-1">Network Intelligence</p>
            <h1 className="text-2xl font-bold text-white">Inteligência da Conta</h1>
            <p className="text-sm text-white/40 mt-1">
              Benchmarks e padrões estratégicos extraídos das suas campanhas reais.
            </p>
          </div>

          {!loading ? (
            <div className="space-y-6">
              {/* Totais */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total investido",    value: fmtBRL(totalInvestido),                                 sub: `${campanhas.length} campanhas` },
                  { label: "Total de leads",      value: totalLeads.toLocaleString("pt-BR"),                   sub: totalLeads > 0 ? `CPL médio: ${fmtBRL(totalInvestido / totalLeads)}` : "—" },
                  { label: "Total de impressões", value: totalImpressoes > 0 ? totalImpressoes.toLocaleString("pt-BR") : "—", sub: "alcance acumulado" },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">{s.label}</p>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-[11px] text-white/30 mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Benchmarks */}
              <div>
                <h2 className="text-sm font-semibold text-white mb-3">Benchmarks da conta</h2>
                {benchmarks.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                    <Globe size={24} className="text-white/20 mx-auto mb-2" />
                    <p className="text-white/30 text-sm">Sincronize campanhas para ver benchmarks.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {benchmarks.map(b => <BenchCard key={b.label} b={b} />)}
                  </div>
                )}
              </div>

              {/* Insights */}
              <div>
                <h2 className="text-sm font-semibold text-white mb-3">Insights estratégicos</h2>
                {insights.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                    <p className="text-white/30 text-sm">
                      {campanhas.length === 0
                        ? "Nenhuma campanha sincronizada ainda."
                        : "✅ Nenhum padrão crítico detectado. Conta estável."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {insights.map(ins => (
                      <div key={ins.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                        <div className="flex items-start gap-3">
                          <span className="text-xl shrink-0 mt-0.5">{TIPO_ICON[ins.tipo]}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white/90 leading-tight">{ins.titulo}</h3>
                            <p className="mt-2 text-[12px] text-white/50 leading-relaxed">{ins.descricao}</p>
                            <div className="mt-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 px-3 py-2">
                              <p className="text-[11px] text-emerald-400/80 leading-relaxed">{ins.ganho}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
