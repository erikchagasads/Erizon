"use client";

import { useState, useMemo } from "react";
import { Activity } from "lucide-react";
import type { AnaliseCompleta } from "@/app/analytics/engine";
import { fmtBRL0 } from "@/app/analytics/engine";

interface Insight {
  emoji: string;
  texto: string;
  tipo: "risco" | "oportunidade" | "neutro";
  confidence: number;
  acao?: string;
}

function ConfidencePill({ valor }: { valor: number }) {
  const cor = valor >= 80
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : valor >= 60
    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-white/30 bg-white/[0.04] border-white/[0.08]";
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-lg border ${cor}`}>
      <Activity size={9} />{valor}% confiança
    </span>
  );
}

function gerarInsights(analise: AnaliseCompleta, cplMedio: number, totalInvest: number, baseConfidence: number): Insight[] {
  const insights: Insight[] = [];
  const perdaMensal = analise.concentracao.pctBudgetEmCriticas > 0
    ? Math.round((totalInvest * analise.concentracao.pctBudgetEmCriticas / 100) * 0.3) : 0;
  if (perdaMensal > 100)
    insights.push({ emoji: "⚠️", texto: `${analise.concentracao.pctBudgetEmCriticas.toFixed(0)}% do budget está em campanhas críticas. Risco de perda de R$${fmtBRL0(perdaMensal)} este mês.`, tipo: "risco", confidence: Math.min(baseConfidence + 8, 97), acao: "Pausar campanhas críticas" });
  const melhorAcao = analise.ranking.find(a => a.tipo === "escalar");
  if (melhorAcao)
    insights.push({ emoji: "🚀", texto: `Escalar "${melhorAcao.campanhaNome}" pode gerar +R$${fmtBRL0(melhorAcao.impactoLucroEstimado)}/mês com base no ROAS atual.`, tipo: "oportunidade", confidence: Math.min(baseConfidence + 5, 97), acao: "Simular escala" });
  if (analise.tendencia.direcao === "piorando")
    insights.push({ emoji: "📉", texto: `Tendência negativa: ROAS caiu ${Math.abs(analise.tendencia.roasDeltaPct).toFixed(1)}% nos últimos 7 dias.`, tipo: "risco", confidence: Math.min(baseConfidence + 3, 97), acao: "Ver tendência" });
  if (analise.tendencia.direcao === "melhorando" && analise.preditivo.direcao === "subindo")
    insights.push({ emoji: "✅", texto: `Conta em melhora: ROAS subiu ${analise.tendencia.roasDeltaPct.toFixed(1)}% e score projetado para ${analise.preditivo.scoreProjetado}/100 em 7 dias.`, tipo: "oportunidade", confidence: baseConfidence });
  if (cplMedio > 60)
    insights.push({ emoji: "📌", texto: `CPL médio de R$${fmtBRL0(cplMedio)} está acima do ideal. Revisar criativos pode reduzir até 30%.`, tipo: "risco", confidence: Math.max(baseConfidence - 8, 42), acao: "Revisar criativos" });
  if (analise.concentracao.dependenciaVencedora >= 60 && analise.concentracao.campanhaVencedora)
    insights.push({ emoji: "⚡", texto: `${analise.concentracao.dependenciaVencedora.toFixed(0)}% do lucro vem de "${analise.concentracao.campanhaVencedora}". Diversifique para reduzir risco.`, tipo: "risco", confidence: Math.min(baseConfidence + 2, 97) });
  return insights.slice(0, 4);
}

function InsightCard({ insight }: { insight: Insight }) {
  const s = {
    risco:        { border: "border-red-500/[0.12]",     bg: "bg-red-500/[0.03]",     text: "text-red-400/80"     },
    oportunidade: { border: "border-emerald-500/[0.12]", bg: "bg-emerald-500/[0.03]", text: "text-emerald-400/80" },
    neutro:       { border: "border-white/[0.05]",       bg: "bg-white/[0.02]",       text: "text-white/50"       },
  }[insight.tipo];
  return (
    <div className={`px-5 py-4 rounded-2xl border ${s.border} ${s.bg} flex flex-col gap-2.5`}>
      <div className="flex items-start gap-3">
        <span className="text-[18px] shrink-0 mt-0.5">{insight.emoji}</span>
        <p className={`text-[13px] leading-relaxed font-medium ${s.text} flex-1`}>{insight.texto}</p>
      </div>
      <div className="flex items-center justify-between pl-8">
        <ConfidencePill valor={insight.confidence} />
        {insight.acao && <span className="text-[10px] text-white/20">{insight.acao} →</span>}
      </div>
    </div>
  );
}

export default function PainelInsights({ analise, cplMedio, totalInvest, baseConfidence }: {
  analise: AnaliseCompleta; cplMedio: number; totalInvest: number; baseConfidence: number;
}) {
  const [aba, setAba] = useState<"riscos" | "oportunidades">("riscos");
  const insights = useMemo(
    () => gerarInsights(analise, cplMedio, totalInvest, baseConfidence),
    [analise, cplMedio, totalInvest, baseConfidence]
  );
  const riscos        = insights.filter(i => i.tipo === "risco");
  const oportunidades = insights.filter(i => i.tipo === "oportunidade" || i.tipo === "neutro");
  if (insights.length === 0) return null;
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">Erizon AI · análise em tempo real</p>
          <ConfidencePill valor={baseConfidence} />
        </div>
        <div className="flex items-center gap-1 bg-[#0f0f11] border border-white/[0.05] p-1 rounded-xl">
          <button onClick={() => setAba("riscos")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${aba === "riscos" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "text-white/25 hover:text-white/50"}`}>
            🔴 Riscos
            {riscos.length > 0 && <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 text-[9px] flex items-center justify-center">{riscos.length}</span>}
          </button>
          <button onClick={() => setAba("oportunidades")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${aba === "oportunidades" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-white/25 hover:text-white/50"}`}>
            🚀 Oportunidades
            {oportunidades.length > 0 && <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] flex items-center justify-center">{oportunidades.length}</span>}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(aba === "riscos" ? riscos : oportunidades).map((ins, i) => <InsightCard key={i} insight={ins} />)}
        {(aba === "riscos" ? riscos : oportunidades).length === 0 && (
          <div className="col-span-2 text-center py-8 text-white/20 text-[13px]">
            {aba === "riscos" ? "✅ Nenhum risco detectado no momento." : "📊 Nenhuma oportunidade identificada agora."}
          </div>
        )}
      </div>
    </section>
  );
}