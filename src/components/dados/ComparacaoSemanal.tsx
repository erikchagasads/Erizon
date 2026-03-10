"use client";

import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fmtBRL0 } from "@/app/analytics/engine";

export interface ComparacaoSemanal {
  roas:   { atual: number; delta: number; pct: number };
  cpl:    { atual: number; delta: number; pct: number };
  margem: { atual: number; delta: number; pct: number };
  lucro:  { atual: number; delta: number; pct: number };
  confianca: number;
}

type HistoricoItem = { data: string; roas?: number | null; cpl?: number | null; margem?: number | null; lucro?: number | null };

function normalizarHistorico(raw: unknown): HistoricoItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as HistoricoItem[];
  const obj = raw as Record<string, unknown>;
  for (const key of ["dados", "metricas", "itens", "historico", "items", "rows"]) {
    if (Array.isArray(obj[key])) return obj[key] as HistoricoItem[];
  }
  return [];
}

export function calcularComparacaoSemanal(historicoRaw: unknown): ComparacaoSemanal | null {
  const historico = normalizarHistorico(historicoRaw);
  if (!historico || historico.length < 2) return null;
  const sorted = [...historico].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  const hoje = new Date();
  const d7   = new Date(hoje.getTime() - 7  * 86400000);
  const d14  = new Date(hoje.getTime() - 14 * 86400000);
  const recentes   = sorted.filter(h => new Date(h.data) >= d7);
  const anteriores = sorted.filter(h => new Date(h.data) >= d14 && new Date(h.data) < d7);
  if (recentes.length === 0 || anteriores.length === 0) return null;

  function med(arr: HistoricoItem[], k: keyof HistoricoItem): number {
    const vals = arr.map(h => Number(h[k])).filter(v => isFinite(v) && v > 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  function dlt(atual: number, ant: number) {
    return { atual, delta: atual - ant, pct: ant > 0 ? ((atual - ant) / ant) * 100 : 0 };
  }
  return {
    roas:   dlt(med(recentes, "roas"),   med(anteriores, "roas")),
    cpl:    dlt(med(recentes, "cpl"),    med(anteriores, "cpl")),
    margem: dlt(med(recentes, "margem"), med(anteriores, "margem")),
    lucro:  dlt(med(recentes, "lucro"),  med(anteriores, "lucro")),
    confianca: Math.min(Math.round((Math.min(recentes.length, anteriores.length) / 7) * 100), 90),
  };
}

function ChipTendencia({ label, valor, pct, formato, inverso = false }: {
  label: string; valor: number; delta: number; pct: number;
  formato: "brl" | "x" | "pct"; inverso?: boolean;
}) {
  const melhora = inverso ? pct < -1 : pct > 1;
  const piora   = inverso ? pct > 1  : pct < -1;
  const neutro  = !melhora && !piora;
  const cor     = neutro ? "text-white/40"       : melhora ? "text-emerald-400"      : "text-red-400";
  const bg      = neutro ? "bg-white/[0.03]"     : melhora ? "bg-emerald-500/[0.05]" : "bg-red-500/[0.04]";
  const border  = neutro ? "border-white/[0.05]" : melhora ? "border-emerald-500/15" : "border-red-500/15";
  const Icone   = neutro ? Minus : melhora ? TrendingUp : TrendingDown;
  const fmt = formato === "brl" ? `R$${fmtBRL0(valor)}`
            : formato === "x"   ? `${valor.toFixed(2)}×`
            : `${(valor * 100).toFixed(1)}%`;
  return (
    <div className={`px-3 py-2.5 rounded-2xl border ${border} ${bg} flex flex-col gap-1`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-white/20">{label}</span>
        <Icone size={10} className={cor} />
      </div>
      <p className={`text-[16px] font-black font-mono leading-none ${cor}`}>{fmt}</p>
      <p className={`text-[9px] font-semibold ${cor}`}>
        {pct > 0 ? "+" : ""}{pct.toFixed(1)}% vs semana anterior
      </p>
    </div>
  );
}

export default function ComparacaoSemanalCard({ comp }: { comp: ComparacaoSemanal }) {
  const melhorias = [comp.roas.pct > 2, comp.cpl.pct < -2, comp.margem.pct > 2, comp.lucro.pct > 2].filter(Boolean).length;
  const tag = melhorias >= 3
    ? { txt: "↑ Melhorando", cor: "text-emerald-400", dot: "bg-emerald-400" }
    : melhorias <= 1
    ? { txt: "↓ Piorando",   cor: "text-red-400",     dot: "bg-red-400"     }
    : { txt: "→ Estável",    cor: "text-white/40",    dot: "bg-white/30"    };
  return (
    <div className="mb-5 rounded-[20px] border border-white/[0.06] bg-white/[0.01] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${tag.dot} animate-pulse`} />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">Tendência semanal</p>
          <span className={`text-[11px] font-black ${tag.cor}`}>{tag.txt}</span>
        </div>
        <span className="text-[9px] text-white/15 flex items-center gap-1">
          <Activity size={9} /> {comp.confianca}% confiança
        </span>
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <ChipTendencia label="ROAS"   valor={comp.roas.atual}            delta={comp.roas.delta}   pct={comp.roas.pct}   formato="x"   />
        <ChipTendencia label="CPL"    valor={comp.cpl.atual}             delta={comp.cpl.delta}    pct={comp.cpl.pct}    formato="brl" inverso />
        <ChipTendencia label="Margem" valor={comp.margem.atual}          delta={comp.margem.delta} pct={comp.margem.pct} formato="pct" />
        <ChipTendencia label="Lucro"  valor={Math.abs(comp.lucro.atual)} delta={comp.lucro.delta}  pct={comp.lucro.pct}  formato="brl" />
      </div>
      {comp.confianca < 40 && (
        <p className="px-5 pb-3.5 text-[10px] text-white/15 flex items-center gap-1.5">
          ⚠️ Histórico curto — acumule mais dados para comparação precisa.
        </p>
      )}
    </div>
  );
}