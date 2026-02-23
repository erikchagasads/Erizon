"use client";

// src/components/dados/PainelDecisoes.tsx
// Histórico de decisões tomadas — comparação score antes/depois.

import { ChevronRight, Clock, History, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { DecisaoHistorico, CampanhaEnriquecida } from "@/app/dados/types";
import { fmtBRL0 } from "@/app/dados/engine";

interface Props {
  decisoes: DecisaoHistorico[];
  campanhas: CampanhaEnriquecida[];
}

export default function PainelDecisoes({ decisoes, campanhas }: Props) {
  if (decisoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
          <History size={16} className="text-white/15" />
        </div>
        <p className="text-[14px] font-medium text-white/25 mb-1">Nenhuma decisão registrada ainda.</p>
        <p className="text-[12px] text-white/15">
          Use os CTAs nos cards para registrar ações e ver o impacto ao longo do tempo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {decisoes.map((d, i) => {
        const campanhaAtual = campanhas.find(c => c.id === d.campanha);
        const scoreDelta = campanhaAtual && d.score_snapshot != null
          ? campanhaAtual.m.score - d.score_snapshot : null;
        const lucroDelta = campanhaAtual && d.lucro_snapshot != null
          ? campanhaAtual.m.lucro - d.lucro_snapshot : null;

        const badge = (() => {
          if (d.acao.includes("Pausar") || d.acao.includes("pausar"))
            return { cor: "bg-red-500/15 text-red-400", icon: "🛑" };
          if (d.acao.includes("Escalar") || d.acao.includes("escalar"))
            return { cor: "bg-emerald-500/15 text-emerald-400", icon: "🚀" };
          if (d.acao.includes("criativo"))
            return { cor: "bg-amber-500/15 text-amber-400", icon: "⚡" };
          return { cor: "bg-white/10 text-white/40", icon: "📋" };
        })();

        return (
          <div key={i} className="p-5 rounded-[20px] bg-[#111113] border border-white/[0.05]">
            <div className="flex items-start gap-4">

              {/* Score antes */}
              {d.score_snapshot != null && (
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <span className="text-[14px] font-black font-mono text-white/60">{d.score_snapshot}</span>
                  </div>
                  <span className="text-[9px] text-white/20">antes</span>
                </div>
              )}

              {d.score_snapshot != null && <ChevronRight size={14} className="text-white/15 mt-3 shrink-0" />}

              {/* Score depois */}
              {campanhaAtual && d.score_snapshot != null && (
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                    campanhaAtual.m.score >= d.score_snapshot
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : "bg-red-500/10 border-red-500/20"
                  }`}>
                    <span className={`text-[14px] font-black font-mono ${
                      campanhaAtual.m.score >= d.score_snapshot ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {campanhaAtual.m.score}
                    </span>
                  </div>
                  <span className="text-[9px] text-white/20">atual</span>
                </div>
              )}

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badge.cor}`}>
                    {badge.icon} {d.acao}
                  </span>
                  <div className="flex items-center gap-1 text-white/20 text-[11px]">
                    <Clock size={10} />
                    <span>{d.data}</span>
                  </div>
                </div>
                <p className="text-[12px] text-white/30 truncate">{d.campanha_nome || d.campanha}</p>
                <p className="text-[11px] text-white/20 mt-0.5">{d.impacto}</p>

                {lucroDelta != null && Math.abs(lucroDelta) > 10 && (
                  <div className={`flex items-center gap-1.5 mt-2 text-[11px] font-semibold ${lucroDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {lucroDelta >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    Lucro {lucroDelta >= 0 ? "+" : ""}R${fmtBRL0(Math.abs(lucroDelta))} desde a decisão
                  </div>
                )}

                {scoreDelta != null && Math.abs(scoreDelta) >= 5 && (
                  <div className={`flex items-center gap-1.5 mt-1 text-[11px] font-semibold ${scoreDelta >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                    Score {scoreDelta >= 0 ? "+" : ""}{scoreDelta} pts
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}