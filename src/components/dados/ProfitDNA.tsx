"use client";
import { useEffect, useState } from "react";
import { Dna, Loader2, TrendingUp, TrendingDown, Clock, Star, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import type { DNAProfile } from "@/core/profit-dna-engine";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : pct >= 40 ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-white/30 bg-white/[0.04] border-white/[0.06]";
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {pct}% confiança
    </span>
  );
}

function MetricPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 flex-1 min-w-[110px]">
      <p className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[17px] font-bold text-white">{value}</p>
      {sub && <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

export function ProfitDNA({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const [dna, setDna]     = useState<DNAProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function load(force = false) {
    if (force) setRecomputing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/clientes/${clientId}/dna${force ? "" : ""}`, {
        method: force ? "POST" : "GET",
      });
      const data = await res.json();
      if (data.ok) setDna(data.dna);
    } finally {
      setLoading(false);
      setRecomputing(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [clientId]);

  const fmtBRL = (v: number | null) =>
    v == null ? "—" : `R$${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-purple-400" />
        <p className="text-[12px] text-white/40">Analisando padrões históricos...</p>
      </div>
    );
  }

  if (!dna || dna.nSnapshotsAnalyzed < 10) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
        <Dna size={22} className="text-white/20 mx-auto mb-2" />
        <p className="text-[13px] font-semibold text-white/40">DNA em construção</p>
        <p className="text-[11px] text-white/25 mt-1">
          São necessários pelo menos 10 dias de dados para identificar padrões.
          {dna && ` (${dna.nSnapshotsAnalyzed} dias coletados)`}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.03] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna size={15} className="text-purple-400" />
          <span className="text-[14px] font-bold text-white/90">
            Profit DNA {clientName ? `— ${clientName}` : ""}
          </span>
          <ConfidenceBadge score={dna.confidenceScore} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={recomputing}
            className="text-white/25 hover:text-white/50 transition-colors"
            title="Recomputar DNA"
          >
            <RefreshCw size={12} className={recomputing ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setExpanded(v => !v)} className="text-white/25 hover:text-white/50">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="px-5 pb-4 flex gap-3 flex-wrap">
        <MetricPill label="CPL Mediano" value={fmtBRL(dna.cplMedian)} sub="seu benchmark interno" />
        <MetricPill label="ROAS Mediano" value={dna.roasMedian ? `${dna.roasMedian.toFixed(1)}x` : "—"} sub="seu benchmark interno" />
        <MetricPill label="Freq. ideal" value={dna.frequencySweetSpot ? `${dna.frequencySweetSpot.toFixed(1)}x` : "—"} sub="antes de fadiga" />
        <MetricPill
          label="Budget vencedor"
          value={dna.avgBudgetWinner ? fmtBRL(dna.avgBudgetWinner) : "—"}
          sub="média das campanhas top"
        />
      </div>

      {/* Aprendizados-chave (sempre visíveis) */}
      {dna.keyLearnings.length > 0 && (
        <div className="px-5 pb-4 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/25 mb-2">
            Aprendizados-chave
          </p>
          {dna.keyLearnings.slice(0, expanded ? undefined : 3).map((l, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Star size={11} className="text-purple-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-white/60 leading-relaxed">{l.learning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-5 py-4 space-y-5">

          {/* Melhores dias */}
          {dna.bestDaysOfWeek.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/25 mb-3">
                Performance por dia da semana
              </p>
              <div className="flex gap-2 flex-wrap">
                {DAY_LABELS.map((label, d) => {
                  const pattern = [...dna.bestDaysOfWeek, ...dna.worstDaysOfWeek].find(p => p.day === d);
                  const isBest = dna.bestDaysOfWeek.some(p => p.day === d);
                  const isWorst = dna.worstDaysOfWeek.some(p => p.day === d);
                  return (
                    <div key={d} className={`flex-1 min-w-[48px] rounded-xl p-2 text-center border transition-all ${
                      isBest ? "bg-emerald-500/10 border-emerald-500/20"
                      : isWorst ? "bg-red-500/[0.08] border-red-500/15"
                      : "bg-white/[0.02] border-white/[0.05]"
                    }`}>
                      <p className="text-[9px] font-bold text-white/40">{label}</p>
                      {pattern ? (
                        <>
                          <p className={`text-[12px] font-bold mt-1 ${
                            isBest ? "text-emerald-400" : isWorst ? "text-red-400" : "text-white/50"
                          }`}>
                            {pattern.avgRoas.toFixed(1)}x
                          </p>
                          {isBest && <TrendingUp size={10} className="text-emerald-400 mx-auto mt-0.5" />}
                          {isWorst && <TrendingDown size={10} className="text-red-400 mx-auto mt-0.5" />}
                        </>
                      ) : (
                        <p className="text-[11px] text-white/20 mt-1">—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formatos */}
          {dna.bestFormats.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/25 mb-3">
                Formatos por ROAS médio
              </p>
              <div className="space-y-2">
                {dna.bestFormats.map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-[12px] text-white/60">{f.format}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500"
                          style={{ width: `${Math.min(100, (f.avgRoas / 5) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-semibold text-purple-400 w-12 text-right">
                        {f.avgRoas > 0 ? `${f.avgRoas.toFixed(1)}x` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sazonalidade */}
          {dna.seasonalityPatterns.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/25 mb-3">
                Sazonalidade histórica
              </p>
              <div className="flex gap-2 flex-wrap">
                {dna.seasonalityPatterns.map((s) => (
                  <div key={s.month} className={`rounded-xl px-3 py-2 border text-center ${
                    s.cplDeltaPct < -10 ? "bg-emerald-500/[0.08] border-emerald-500/20"
                    : s.cplDeltaPct > 10 ? "bg-red-500/[0.06] border-red-500/15"
                    : "bg-white/[0.02] border-white/[0.05]"
                  }`}>
                    <p className="text-[9px] font-bold text-white/40">{s.monthLabel}</p>
                    <p className={`text-[12px] font-bold mt-0.5 ${
                      s.cplDeltaPct < -10 ? "text-emerald-400"
                      : s.cplDeltaPct > 10 ? "text-red-400"
                      : "text-white/40"
                    }`}>
                      {s.cplDeltaPct > 0 ? "+" : ""}{s.cplDeltaPct}%
                    </p>
                    <p className="text-[8px] text-white/20">CPL</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 text-[10px] text-white/20">
            <Clock size={10} />
            {dna.nCampaignsAnalyzed} campanhas · {dna.nSnapshotsAnalyzed} dias analisados
            {dna.periodStart && ` · ${dna.periodStart} → ${dna.periodEnd}`}
          </div>
        </div>
      )}
    </div>
  );
}
