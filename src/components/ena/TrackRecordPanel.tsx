"use client";

import { CheckCircle2, XCircle, Minus, TrendingUp } from "lucide-react";

type OutcomeType = "improved" | "degraded" | "neutral" | "pending" | null;

interface RecentDecision {
  id: string;
  title: string;
  suggestionType: string;
  decision: string;
  outcome7d: OutcomeType;
  metricBefore?: { cpl?: number; roas?: number };
  metricAfter7d?: { cpl?: number; roas?: number };
  decidedAt?: string;
}

interface TrackRecordData {
  totalDecided: number;
  improved: number;
  degraded: number;
  neutral: number;
  pending: number;
  effectivenessRate: number | null;
  byType: Record<string, { total: number; improved: number; rate: number }>;
  recentDecisions: RecentDecision[];
}

function OutcomeIcon({ outcome }: { outcome: OutcomeType }) {
  if (outcome === "improved") return <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />;
  if (outcome === "degraded") return <XCircle      size={12} className="text-red-400 shrink-0" />;
  if (outcome === "neutral")  return <Minus        size={12} className="text-white/30 shrink-0" />;
  return <div className="w-3 h-3 rounded-full border border-white/15 shrink-0 animate-pulse" />;
}

function outcomeLabel(o: OutcomeType) {
  if (o === "improved") return { txt: "Melhorou", cls: "text-emerald-400" };
  if (o === "degraded") return { txt: "Piorou",   cls: "text-red-400"     };
  if (o === "neutral")  return { txt: "Neutro",   cls: "text-white/30"    };
  return { txt: "Aguardando 7d", cls: "text-white/20" };
}

function typeLabel(t: string) {
  const map: Record<string, string> = {
    scale_budget:    "Escalar",
    creative_refresh:"Criativo",
    monitor:         "Monitor",
    pause:           "Pausar",
    reduce_budget:   "Reduzir",
  };
  return map[t] ?? t;
}

export function TrackRecordPanel({ data }: { data: TrackRecordData }) {
  const hasHistory = data.totalDecided > 0;
  const rate       = data.effectivenessRate;

  const rateColor = rate == null ? "text-white/20"
    : rate >= 70 ? "text-emerald-400"
    : rate >= 45 ? "text-amber-300"
    : "text-red-400";

  return (
    <section className="mb-5">
      <div className="px-7 py-6 rounded-[24px] border border-white/[0.07] bg-white/[0.02]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={11} className="text-white/20" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/20">
              ENA · Track Record de Decisões
            </span>
          </div>
          {hasHistory && rate != null && (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border border-white/[0.07] bg-white/[0.02] ${rateColor}`}>
              {rate}% de acerto
            </span>
          )}
        </div>

        {!hasHistory ? (
          <p className="text-[13px] text-white/20 text-center py-4">
            Nenhuma decisão registrada ainda. As sugestões do Autopilot aparecerão aqui quando você aplicar ou ignorar uma.
          </p>
        ) : (
          <>
            {/* Resumo numérico */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "Total",      val: data.totalDecided, cls: "text-white/60" },
                { label: "Melhoraram", val: data.improved,     cls: "text-emerald-400" },
                { label: "Pioraram",   val: data.degraded,     cls: "text-red-400"     },
                { label: "Pendentes",  val: data.pending,      cls: "text-white/25"    },
              ].map(item => (
                <div key={item.label} className="text-center p-3 rounded-[16px] border border-white/[0.05] bg-white/[0.02]">
                  <p className={`text-[22px] font-black font-mono leading-none mb-1 ${item.cls}`}>{item.val}</p>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Por tipo */}
            {Object.keys(data.byType).length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] text-white/20 uppercase tracking-widest mb-3">Por tipo de ação</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.byType).map(([type, stats]) => (
                    <div key={type} className="flex items-center gap-2 px-3 py-2 rounded-[12px] border border-white/[0.06] bg-white/[0.02]">
                      <span className="text-[11px] text-white/40">{typeLabel(type)}</span>
                      <span className={`text-[12px] font-black font-mono ${stats.rate >= 70 ? "text-emerald-400" : stats.rate >= 45 ? "text-amber-300" : "text-red-400"}`}>
                        {stats.rate}%
                      </span>
                      <span className="text-[10px] text-white/15">({stats.total})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Últimas decisões */}
            {data.recentDecisions.length > 0 && (
              <div>
                <p className="text-[10px] text-white/20 uppercase tracking-widest mb-3">Últimas decisões</p>
                <div className="space-y-2">
                  {data.recentDecisions.slice(0, 5).map(d => {
                    const lbl = outcomeLabel(d.outcome7d);
                    const deltaRoas = d.metricBefore?.roas && d.metricAfter7d?.roas
                      ? ((d.metricAfter7d.roas - d.metricBefore.roas) / d.metricBefore.roas * 100).toFixed(0)
                      : null;
                    return (
                      <div key={d.id} className="flex items-center gap-3 px-4 py-3 rounded-[14px] border border-white/[0.04] bg-white/[0.01]">
                        <OutcomeIcon outcome={d.outcome7d} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-white/50 truncate">{d.title}</p>
                          <p className="text-[10px] text-white/20">{typeLabel(d.suggestionType)}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {deltaRoas && (
                            <span className={`text-[11px] font-bold font-mono ${Number(deltaRoas) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {Number(deltaRoas) >= 0 ? "+" : ""}{deltaRoas}% ROAS
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold ${lbl.cls}`}>{lbl.txt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
