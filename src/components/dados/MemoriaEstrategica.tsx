"use client";

import { Brain, ChevronRight } from "lucide-react";
import { fmtBRL0 } from "@/app/analytics/engine";
import type { DecisaoHistorico } from "@/app/analytics/types";

interface ResumoDecisao {
  campanhaNome: string;
  acao: string;
  data: string;
  impactoNum: number;
  scoreSnapshot: number | null;
  tipo: "pausar" | "escalar" | "outro";
}

function parsearImpacto(impacto: string): number {
  const match = (impacto ?? "").replace(/\./g, "").replace(",", ".").match(/[\d]+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

function classificarTipo(acao: string): ResumoDecisao["tipo"] {
  const a = (acao ?? "").toLowerCase();
  if (a.includes("paus") || a.includes("parar")) return "pausar";
  if (a.includes("escal") || a.includes("aumentar")) return "escalar";
  return "outro";
}

export default function MemoriaEstrategica({ decisoes }: { decisoes: DecisaoHistorico[] }) {
  if (decisoes.length === 0) return null;

  const ultimas: ResumoDecisao[] = decisoes.slice(0, 3).map(d => ({
    campanhaNome: d.campanha_nome ?? d.campanha ?? "Campanha",
    acao: d.acao ?? "",
    data: d.data ?? "",
    impactoNum: parsearImpacto(d.impacto ?? ""),
    scoreSnapshot: d.score_snapshot ?? null,
    tipo: classificarTipo(d.acao ?? ""),
  }));

  const impactoTotal = ultimas.reduce((s, d) => s + d.impactoNum, 0);

  return (
    <div className="mb-5 rounded-[20px] border border-purple-500/15 bg-purple-500/[0.03] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Brain size={12} className="text-purple-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white">Memória Estratégica</p>
            <p className="text-[9px] text-white/25">Impacto das últimas decisões</p>
          </div>
        </div>
        {impactoTotal > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[9px] text-white/20 uppercase tracking-widest mb-0.5">Lucro recuperado</p>
            <p className="text-[14px] font-black font-mono text-purple-400">+R${fmtBRL0(impactoTotal)}</p>
          </div>
        )}
      </div>
      <div className="divide-y divide-white/[0.03]">
        {ultimas.map((d, i) => {
          const ts = {
            pausar:  { dot: "bg-red-400",    lbl: "text-red-400/60",     label: "Pausou"  },
            escalar: { dot: "bg-emerald-400", lbl: "text-emerald-400/60", label: "Escalou" },
            outro:   { dot: "bg-white/30",    lbl: "text-white/30",       label: "Ajustou" },
          }[d.tipo];
          return (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ts.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold ${ts.lbl}`}>{ts.label}</span>
                  <span className="text-[11px] font-semibold text-white/70 truncate">&quot;{d.campanhaNome}&quot;</span>
                </div>
                <p className="text-[10px] text-white/20 mt-0.5 truncate">{d.acao}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {d.scoreSnapshot !== null && (
                  <div className="text-right">
                    <p className="text-[8px] text-white/15 uppercase tracking-widest">Score</p>
                    <p className="text-[11px] font-black font-mono text-white/35">{d.scoreSnapshot}</p>
                  </div>
                )}
                {d.impactoNum > 0 && (
                  <div className="text-right">
                    <p className="text-[8px] text-white/15 uppercase tracking-widest">Impacto</p>
                    <p className="text-[11px] font-black font-mono text-purple-400">+R${fmtBRL0(d.impactoNum)}</p>
                  </div>
                )}
                <p className="text-[9px] text-white/15 font-mono">{d.data}</p>
              </div>
            </div>
          );
        })}
      </div>
      {decisoes.length > 3 && (
        <div className="px-5 py-2.5 border-t border-white/[0.04]">
          <span className="text-[10px] text-white/20 flex items-center gap-1">
            Ver todas as {decisoes.length} decisões <ChevronRight size={10} />
          </span>
        </div>
      )}
    </div>
  );
}