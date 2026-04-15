"use client";

import { useEffect, useState } from "react";
import { Brain, Network, ShieldCheck, Wallet } from "lucide-react";

type StrategicSnapshot = {
  moat: {
    dependencyScore: number;
    lockInLine: string;
    reasons: string[];
  };
  learning: {
    accuracyPct: number;
    measuredCount: number;
    memoryLine: string;
  };
  business: {
    closedRevenue30d: number;
    weightedPipelineValue: number;
    roiMultiple: number | null;
    projectedRevenue30d: number;
    projectedMarginPct: number | null;
  };
  collective: {
    niche: string | null;
    position: string;
    insight: string;
  };
  dna: {
    goldenAudience: string | null;
    keyLearnings: string[];
  } | null;
};

const fmtBRL = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function StrategicMoatPanel() {
  const [data, setData] = useState<StrategicSnapshot | null>(null);

  useEffect(() => {
    fetch("/api/strategic-snapshot")
      .then(async (response) => {
        if (!response.ok) throw new Error("snapshot_error");
        return response.json();
      })
      .then((payload) => setData(payload as StrategicSnapshot))
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  return (
    <section className="mb-6 rounded-[24px] border border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_25%),rgba(255,255,255,0.02)] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">Camada Proprietaria</p>
          <h2 className="mt-2 text-[24px] font-black text-white">Score de dependencia {data.moat.dependencyScore}/100</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60">{data.moat.lockInLine}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:min-w-[280px]">
          <div className="rounded-[18px] border border-cyan-500/15 bg-cyan-500/[0.06] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">aprendizado</p>
            <p className="mt-2 text-[22px] font-black text-white">{data.learning.accuracyPct}%</p>
            <p className="mt-1 text-[11px] text-white/50">{data.learning.measuredCount} outcomes medidos</p>
          </div>
          <div className="rounded-[18px] border border-emerald-500/15 bg-emerald-500/[0.06] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-100/70">valor real</p>
            <p className="mt-2 text-[22px] font-black text-white">R$ {fmtBRL(data.business.closedRevenue30d)}</p>
            <p className="mt-1 text-[11px] text-white/50">fechado em 30 dias</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center gap-2 text-white/35">
            <Brain size={14} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Memoria</p>
          </div>
          <p className="text-[12px] leading-relaxed text-white/62">{data.learning.memoryLine}</p>
        </div>

        <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center gap-2 text-white/35">
            <Wallet size={14} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Negocio</p>
          </div>
          <p className="text-[18px] font-black text-white">
            R$ {fmtBRL(data.business.weightedPipelineValue)}
          </p>
          <p className="mt-1 text-[11px] text-white/50">
            pipeline ponderado
            {data.business.roiMultiple ? ` · ${data.business.roiMultiple.toFixed(2)}x ROI` : ""}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-white/45">
            faturamento previsto: R$ {fmtBRL(data.business.projectedRevenue30d)}
            {typeof data.business.projectedMarginPct === "number"
              ? ` · margem projetada ${data.business.projectedMarginPct}%`
              : ""}
          </p>
        </div>

        <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center gap-2 text-white/35">
            <Network size={14} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Rede</p>
          </div>
          <p className="text-[14px] font-bold text-white">
            {data.collective.niche ? `${data.collective.niche} · ${data.collective.position}` : data.collective.position}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/50">{data.collective.insight}</p>
        </div>

        <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center gap-2 text-white/35">
            <ShieldCheck size={14} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Moat</p>
          </div>
          <p className="text-[12px] leading-relaxed text-white/62">
            {data.dna?.goldenAudience || "A plataforma ja esta acumulando sinais que ficam melhores a cada ciclo."}
          </p>
          {data.moat.reasons.length > 0 && (
            <p className="mt-2 text-[11px] leading-relaxed text-amber-100/75">{data.moat.reasons[0]}</p>
          )}
        </div>
      </div>
    </section>
  );
}
