"use client";

import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import type { ScorePreditivo7d, AcaoRankeada } from "@/app/analytics/engine";
import { fmtBRL0 } from "@/app/analytics/engine";

export function PreditivoScore({ preditivo }: { preditivo: ScorePreditivo7d }) {
  const { scoreAtual, scoreProjetado, delta, direcao, drivers, confianca } = preditivo;
  const cor    = direcao === "subindo" ? "text-emerald-400" : direcao === "caindo" ? "text-red-400" : "text-white/40";
  const bg     = direcao === "subindo" ? "bg-emerald-500/[0.04]" : direcao === "caindo" ? "bg-red-500/[0.04]" : "bg-white/[0.02]";
  const border = direcao === "subindo" ? "border-emerald-500/15" : direcao === "caindo" ? "border-red-500/15" : "border-white/[0.06]";
  const Icone  = direcao === "subindo" ? TrendingUp : direcao === "caindo" ? TrendingDown : Minus;
  const seta   = direcao === "subindo" ? "↑" : direcao === "caindo" ? "↓" : "→";
  return (
    <div className={`p-5 rounded-[20px] border ${border} ${bg}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/20 mb-1">Score projetado 7d</p>
          <p className="text-[10px] text-white/20">Projeção derivada da engine se nada mudar nos próximos 7 dias</p>
        </div>
        <span className="text-[9px] text-white/20">{confianca}% confiança</span>
      </div>
      <div className="flex items-end gap-4 mb-4">
        <div><p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Agora</p><p className="text-[28px] font-black font-mono text-white/50">{scoreAtual}</p></div>
        <div className="pb-2"><Icone size={20} className={`${cor} opacity-60`} /></div>
        <div><p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Em 7 dias</p><p className={`text-[28px] font-black font-mono ${cor}`}>{scoreProjetado}</p></div>
        <div className="pb-2 ml-auto"><span className={`text-[13px] font-black font-mono ${cor}`}>{seta}{Math.abs(delta)} pts</span></div>
      </div>
      <div className="h-[3px] rounded-full bg-white/[0.05] mb-4 relative overflow-hidden">
        <div className="h-full rounded-full bg-white/20" style={{ width: `${scoreAtual}%` }} />
        <div className={`absolute top-0 h-full rounded-full opacity-50 transition-all duration-700 ${direcao === "subindo" ? "bg-emerald-500" : direcao === "caindo" ? "bg-red-500" : "bg-white/30"}`} style={{ width: `${scoreProjetado}%` }} />
      </div>
      {drivers.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/15 mb-2">Fatores da projeção derivada</p>
          {drivers.map((d, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
              <p className="text-[11px] text-white/30 leading-snug">{d}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RankingAcoes({ acoes }: { acoes: AcaoRankeada[] }) {
  if (acoes.length === 0) return null;
  const urgCor: Record<string, string> = {
    imediata:      "bg-red-500/10 text-red-400 border-red-500/20",
    esta_semana:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
    proximo_ciclo: "bg-white/[0.04] text-white/30 border-white/[0.06]",
  };
  const tipoLabel: Record<string, string> = { pausar: "Pausar", escalar: "Escalar", ajustar_segmentacao: "Ajustar", revisar_criativo: "Revisar" };
  return (
    <div className="p-5 rounded-[20px] bg-[#111113] border border-white/[0.06] mb-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><Target size={13} className="text-amber-400" /></div>
        <div><p className="text-[12px] font-bold text-white">Ranking Estratégico</p><p className="text-[10px] text-white/25">Top {acoes.length} ações derivadas por impacto financeiro estimado</p></div>
      </div>
      <div className="space-y-3">
        {acoes.map((acao) => (
          <div key={acao.campanhaId + acao.tipo} className="p-4 rounded-xl border border-white/[0.05] hover:border-white/[0.08] transition-all">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-black text-white/30">#{acao.rank}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${urgCor[acao.urgencia]}`}>{tipoLabel[acao.tipo]}</span>
                  <p className="text-[12px] font-semibold text-white truncate">{acao.campanhaNome}</p>
                </div>
                <p className="text-[11px] text-white/30 leading-snug mb-2">{acao.justificativa}</p>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-emerald-400/70">+{acao.impactoScoreEstimado} pts score</span>
                  <span className="text-[10px] text-emerald-400/70">+R${fmtBRL0(acao.impactoLucroEstimado)}/mês</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
