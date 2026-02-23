"use client";

// src/components/dados/BlocoDecisaoIA.tsx
// Bloco de decisão da IA — recomendação #1 da conta.

import { Pause, TrendingUp, Play, BarChart3, X, Loader2, CheckCircle2 } from "lucide-react";
import type { DecisaoIA } from "@/app/dados/types";
import { fmtBRL0 } from "@/app/dados/engine";

interface Props {
  decisao: DecisaoIA;
  onExecutar: () => void;
  onSimular: () => void;
  onIgnorar: () => void;
  executando: boolean;
  executado: boolean;
}

export default function BlocoDecisaoIA({
  decisao, onExecutar, onSimular, onIgnorar, executando, executado,
}: Props) {
  const isPausar = decisao.tipo === "pausar";

  const accent = isPausar ? {
    border: "border-red-500/20",
    bg: "bg-red-500/[0.04]",
    glow: "shadow-[0_0_40px_rgba(239,68,68,0.06)]",
    badge: "bg-red-500 text-white",
    badgeText: "🔥 DECISÃO RECOMENDADA AGORA",
    iconBg: "bg-red-500/10 border-red-500/20",
    iconColor: "text-red-400",
    btnPrimary: "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20",
    conf: "text-red-400",
    barColor: "bg-red-500",
    sinal: "−",
  } : {
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/[0.04]",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.06)]",
    badge: "bg-emerald-500 text-white",
    badgeText: "🚀 OPORTUNIDADE DETECTADA",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
    btnPrimary: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20",
    conf: "text-emerald-400",
    barColor: "bg-emerald-500",
    sinal: "+",
  };

  if (executado) {
    return (
      <div className={`mb-5 rounded-[24px] border ${accent.border} ${accent.bg} p-5 flex items-center gap-4`}>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <CheckCircle2 size={18} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-white">Ação registrada com sucesso</p>
          <p className="text-[12px] text-white/30 mt-0.5">Decisão logada · Health Score atualizado</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-5 rounded-[24px] border ${accent.border} ${accent.bg} ${accent.glow} overflow-hidden`}>
      <div className="px-6 pt-5 pb-0 flex items-center gap-3 flex-wrap">
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg ${accent.badge}`}>
          {accent.badgeText}
        </span>
        <span className={`text-[11px] font-semibold ${accent.conf}`}>Confiança {decisao.confianca}%</span>
        <span className="text-[10px] text-white/20">Prioridade #1 · gerada em tempo real</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.05] mt-4">
        {/* Frase + barra confiança */}
        <div className="flex-1 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${accent.iconBg}`}>
              {isPausar
                ? <Pause size={16} className={accent.iconColor} />
                : <TrendingUp size={16} className={accent.iconColor} />}
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-white leading-snug">{decisao.frase}</p>
              <p className="text-[11px] text-white/30 mt-2 leading-relaxed">{decisao.riscoIgnorar}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${accent.barColor}`}
                style={{ width: `${decisao.confianca}%` }}
              />
            </div>
            <span className="text-[10px] text-white/25 shrink-0">{decisao.confianca}% confiança</span>
          </div>
        </div>

        {/* Impacto mensal */}
        <div className="flex flex-col justify-center gap-3 px-6 py-5 lg:min-w-[220px] lg:shrink-0">
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Impacto mensal estimado</p>
            <p className={`text-[22px] font-black font-mono ${accent.conf}`}>
              {accent.sinal}R${fmtBRL0(decisao.impactoMensal)}
            </p>
          </div>
          {decisao.gastoDiario > 0 && (
            <div>
              <p className="text-[10px] text-white/20 uppercase tracking-widest mb-0.5">
                {isPausar ? "Queima diária" : "Ganho diário"}
              </p>
              <p className={`text-[13px] font-bold font-mono ${accent.conf} opacity-70`}>
                {accent.sinal}R${fmtBRL0(decisao.gastoDiario)}/dia
              </p>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-col justify-center gap-2 px-6 py-5 lg:min-w-[200px] lg:shrink-0">
          <button
            onClick={onExecutar}
            disabled={executando}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-[13px] font-bold transition-all disabled:opacity-60 ${accent.btnPrimary}`}
          >
            {executando
              ? <><Loader2 size={14} className="animate-spin" /> Executando...</>
              : <><Play size={14} /> Executar agora</>}
          </button>
          <button
            onClick={onSimular}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/[0.07] text-[13px] font-medium text-white/40 hover:text-white hover:border-white/20 transition-all"
          >
            <BarChart3 size={13} /> Simular impacto
          </button>
          <button
            onClick={onIgnorar}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-[12px] text-white/20 hover:text-white/40 transition-colors"
          >
            <X size={11} /> Ignorar
          </button>
        </div>
      </div>
    </div>
  );
}