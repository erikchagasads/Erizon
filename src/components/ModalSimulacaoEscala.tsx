"use client";

/**
 * ModalSimulacaoEscala.tsx
 * Modal de simulação preditiva de escala.
 * Abre ao clicar em "Escalar 20%" no CampanhaCard.
 * Transforma o botão em inteligência preditiva.
 */

import { useState } from "react";
import {
  X, TrendingUp, DollarSign, AlertTriangle,
  CheckCircle2, ChevronRight, Loader2, Gauge
} from "lucide-react";
import type { CampanhaInput, SimulacaoEscala } from "@/app/lib/algoritmoErizon";
import { simularEscala } from "@/app/lib/algoritmoErizon";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtBRL2 = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Barra comparativa ─────────────────────────────────────────────────────────
function ComparativoBar({ label, antes, depois, cor, prefixo = "R$", sufixo = "" }: {
  label: string; antes: string; depois: string;
  cor: "emerald" | "red" | "amber"; prefixo?: string; sufixo?: string;
}) {
  const textColor = { emerald: "text-emerald-400", red: "text-red-400", amber: "text-amber-400" }[cor];
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.05] last:border-0">
      <span className="text-[12px] text-white/40">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-white/25 font-mono">{prefixo}{antes}{sufixo}</span>
        <ChevronRight size={12} className="text-white/15" />
        <span className={`text-[13px] font-bold font-mono ${textColor}`}>{prefixo}{depois}{sufixo}</span>
      </div>
    </div>
  );
}

// ── Aviso ─────────────────────────────────────────────────────────────────────
function Aviso({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-amber-500/[0.06] border border-amber-500/15 rounded-xl">
      <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
      <p className="text-[12px] text-amber-400/80">{texto}</p>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalSimulacaoEscalaProps {
  campanha: CampanhaInput & {
    nome_campanha: string;
    gasto_total: number;
    contatos: number;
    score: number;
  };
  onConfirmar: () => Promise<void>;
  onFechar: () => void;
  ticketMedio?: number;
  taxaConversao?: number;
}

export default function ModalSimulacaoEscala({
  campanha,
  onConfirmar,
  onFechar,
  ticketMedio = 450,
  taxaConversao = 0.04,
}: ModalSimulacaoEscalaProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado]   = useState(false);

  const sim: SimulacaoEscala = simularEscala(campanha, 0.20, ticketMedio, taxaConversao);

  const gastoAtual    = campanha.gasto_total;
  const leadsAtuais   = campanha.contatos;
  const receitaAtual  = leadsAtuais * taxaConversao * ticketMedio;
  const lucroAtual    = receitaAtual - gastoAtual;
  const margemAtual   = receitaAtual > 0 ? (lucroAtual / receitaAtual) * 100 : 0;
  const cplAtual      = leadsAtuais > 0 ? gastoAtual / leadsAtuais : 0;

  const gastoNovo    = gastoAtual + sim.investimentoExtra;
  const receitaNova  = receitaAtual + sim.receitaExtra;
  const lucroNovo    = receitaNova - gastoNovo;
  const margemNova   = (sim.margemProjetada * 100);

  const lucraMais = sim.lucroExtra > 0;

  async function handleConfirmar() {
    setConfirmando(true);
    await onConfirmar();
    setConfirmando(false);
    setConfirmado(true);
    setTimeout(onFechar, 1800);
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onFechar()}
    >
      <div className="w-full max-w-[460px] bg-[#111113] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-white">Simulação de escala</p>
              <p className="text-[11px] text-white/30 mt-0.5 truncate max-w-[240px]">{campanha.nome_campanha}</p>
            </div>
          </div>
          <button onClick={onFechar} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
            <X size={15} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-5">

          {/* Investimento extra */}
          <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
            <div className="flex items-center gap-3">
              <DollarSign size={15} className="text-white/30" />
              <div>
                <p className="text-[11px] text-white/30">Investimento adicional (20%)</p>
                <p className="text-[18px] font-black font-mono text-white">+R${fmtBRL(sim.investimentoExtra)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-white/20">Total</p>
              <p className="text-[13px] font-bold font-mono text-white/60">R${fmtBRL(gastoNovo)}</p>
            </div>
          </div>

          {/* Comparativo antes / depois */}
          <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20 mb-2">
              Projeção antes → depois
            </p>
            <ComparativoBar
              label="Receita estimada"
              antes={fmtBRL(receitaAtual)}
              depois={fmtBRL(receitaNova)}
              cor="emerald"
            />
            <ComparativoBar
              label="Lucro líquido"
              antes={lucroAtual >= 0 ? fmtBRL(lucroAtual) : `-${fmtBRL(Math.abs(lucroAtual))}`}
              depois={lucroNovo >= 0 ? fmtBRL(lucroNovo) : `-${fmtBRL(Math.abs(lucroNovo))}`}
              cor={lucraMais ? "emerald" : "red"}
            />
            <ComparativoBar
              label="Margem"
              antes={margemAtual.toFixed(1)}
              depois={margemNova.toFixed(1)}
              cor={margemNova >= margemAtual ? "emerald" : "amber"}
              sufixo="%"
              prefixo=""
            />
            <ComparativoBar
              label="ROAS mantido"
              antes={`${(gastoAtual > 0 ? receitaAtual / gastoAtual : 0).toFixed(2)}×`}
              depois={`${sim.roasMantem.toFixed(2)}×`}
              cor={sim.roasMantem >= 1.5 ? "emerald" : "red"}
              prefixo=""
            />
          </div>

          {/* Avisos */}
          {sim.avisos.length > 0 && (
            <div className="space-y-2">
              {sim.avisos.map((av: string, i: number) => <Aviso key={i} texto={av} />)}
            </div>
          )}

          {/* Lucro potencial destacado */}
          {sim.lucroExtra > 0 && (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-2xl">
              <TrendingUp size={16} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-[11px] text-emerald-400/70">Lucro adicional projetado</p>
                <p className="text-[18px] font-black font-mono text-emerald-400">+R${fmtBRL(sim.lucroExtra)}</p>
              </div>
            </div>
          )}
          {sim.lucroExtra <= 0 && (
            <div className="flex items-center gap-3 p-4 bg-red-500/[0.06] border border-red-500/15 rounded-2xl">
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <p className="text-[12px] text-red-400/80">Retorno projetado não cobre o investimento extra. Revise a estratégia antes de escalar.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 pb-6 pt-0">
          <button onClick={onFechar}
            className="flex-1 py-2.5 px-4 rounded-xl border border-white/[0.08] text-[13px] font-medium text-white/40 hover:text-white hover:border-white/20 transition-all">
            Cancelar
          </button>
          {confirmado ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-semibold">
              <CheckCircle2 size={14} /> Registrado
            </div>
          ) : (
            <button
              onClick={handleConfirmar}
              disabled={confirmando}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-semibold hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all disabled:opacity-60"
            >
              {confirmando
                ? <><Loader2 size={13} className="animate-spin" /> Registrando...</>
                : <><TrendingUp size={13} /> Confirmar escala</>
              }
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
