"use client";

// src/app/dados/page.tsx — v9.0
// v9.0: componentes extraídos para /components/dados/ — página principal reduzida

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  RefreshCw, AlertCircle, CheckCircle2, DollarSign, Users,
  TrendingUp, ArrowUpRight, History, ChevronRight, ShieldAlert,
  Sparkles, Loader2, Info, Brain, Minus, TrendingDown,
  Activity, Target, Gauge, AlertTriangle,
} from "lucide-react";
import MemoriaEstrategica from "@/components/dados/MemoriaEstrategica";
import ComparacaoSemanalCard, { calcularComparacaoSemanal } from "@/components/dados/ComparacaoSemanal";
import PainelInsights from "@/components/dados/PainelInsights";
import { PreditivoScore, RankingAcoes } from "@/components/dados/PainelPreditivo";
import { getSupabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import RadarOperacional from "@/components/RadarOperacional";
import InteligenciaResumo from "@/components/InteligenciaResumo";
import ModalSimulacaoEscala from "@/components/ModalSimulacaoEscala";
import {
  calcularHealth,
  type CampanhaInput, type SnapshotHistorico,
} from "@/app/lib/algoritmoErizon";
import CampanhaCard, {
  OverviewCard, ContaHealthBar, EmptyState, PageSkeleton,
} from "@/components/dados/CampanhaCard";
import PainelDecisoes from "@/components/dados/PainelDecisoes";
import FunnelPanel from "@/components/dados/FunnelPanel";
import PainelHistoricoMetricas from "@/components/dados/PainelHistorico";
import { PlataformaSelector, GeralView } from "@/components/dados/PlataformaSelector";
import type { PlataformaId } from "@/app/analytics/types";
import { useHistorico } from "@/app/hooks/useHistorico";
import { useCliente } from "@/app/hooks/useCliente";
import {
  calcMetricas, calcularConfianca,
  analisarConta, calcularRiscoProgressivo, calcularProjecaoDinamica,
  construirLogDecisao,
  type AnaliseCompleta, type LogDecisao, type SnapshotCampanha,
  type CampanhaBase, type TendenciaConta,
  type ConcentracaoRisco,
  fmtBRL0,
} from "@/app/analytics/engine";
import type {
  Campanha, CampanhaEnriquecida, DecisaoHistorico, DecisaoIA,
  Periodo, OrdemMetrica, AbaAtiva,
} from "@/app/analytics/types";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";
import {
  resolverTipo, BENCHMARKS_POR_TIPO, type TipoCampanha,
} from "@/app/analytics/tipoCampanha";

// ─── Constantes ───────────────────────────────────────────────────────────────
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoje", label: "Hoje" }, { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" }, { id: "mes", label: "Mês atual" },
];
const ORDENS: { id: OrdemMetrica; label: string }[] = [
  { id: "score", label: "Score" }, { id: "gasto", label: "Investimento" },
  { id: "leads", label: "Leads" }, { id: "cpl", label: "CPL" }, { id: "ctr", label: "CTR" },
];


function BlocoDecisaoIA({ decisao, onExecutar, onSimular, onIgnorar, executando, executado }: {
  decisao: DecisaoIA; onExecutar: () => void; onSimular: () => void;
  onIgnorar: () => void; executando: boolean; executado: boolean;
}) {
  const isPausar = decisao.tipo === "pausar";
  const border = isPausar ? "border-red-500/20"    : "border-emerald-500/20";
  const bg     = isPausar ? "bg-red-500/[0.03]"    : "bg-emerald-500/[0.03]";
  const cor    = isPausar ? "text-red-400"          : "text-emerald-400";
  const btnCls = isPausar ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20";
  return (
    <div className={`mb-5 rounded-[20px] border ${border} ${bg} overflow-hidden`}>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPausar ? "bg-red-400" : "bg-emerald-400"}`} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">Erizon IA · Decisão {decisao.confianca}% confiança</span>
          {!executado && <button onClick={onIgnorar} className="ml-auto text-[10px] text-white/20 hover:text-white/40 transition-colors">Ignorar</button>}
        </div>
        <p className="text-[15px] font-bold text-white leading-snug mb-1">{decisao.frase}</p>
        <p className={`text-[12px] font-medium ${cor} mb-3`}>{decisao.riscoIgnorar}</p>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {decisao.impactoMensal > 0 && (
            <div className="flex items-center gap-1.5">
              <Target size={11} className={cor} />
              <span className={`text-[12px] font-semibold ${cor}`}>{isPausar ? "−" : "+"}R${decisao.impactoMensal.toLocaleString("pt-BR")} estimado/mês</span>
            </div>
          )}
          {decisao.gastoDiario > 0 && <span className="text-[11px] text-white/25">R${decisao.gastoDiario}/dia {isPausar ? "desperdiçado" : "adicional"}</span>}
        </div>
        {executado ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit">
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span className="text-[13px] font-semibold text-emerald-400">{isPausar ? "Campanha pausada" : "Decisão registrada"}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onExecutar} disabled={executando} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all disabled:opacity-60 ${btnCls}`}>
              {executando ? <><Loader2 size={13} className="animate-spin" /> Executando...</> : <><Sparkles size={13} /> {isPausar ? "Pausar campanha" : "Registrar decisão"}</>}
            </button>
            {!isPausar && (
              <button onClick={onSimular} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] text-[13px] font-medium text-white/40 hover:text-white hover:border-white/20 transition-all">
                Simular escala
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PainelTendencia ──────────────────────────────────────────────────────────
function TendenciaItem({ label, delta, deltaPct, unidade = "", inverso = false }: {
  label: string; delta: number; deltaPct?: number; unidade?: string; inverso?: boolean;
}) {
  const positivo = inverso ? delta < 0 : delta > 0;
  const neutro   = Math.abs(deltaPct ?? delta) < 2;
  const cor   = neutro ? "text-white/40" : positivo ? "text-emerald-400" : "text-red-400";
  const bg    = neutro ? "bg-white/[0.04]" : positivo ? "bg-emerald-500/10" : "bg-red-500/10";
  const bord  = neutro ? "border-white/[0.06]" : positivo ? "border-emerald-500/20" : "border-red-500/20";
  const Icone = neutro ? Minus : positivo ? TrendingUp : TrendingDown;
  const sinal = delta > 0 ? "+" : "";
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${bg} ${bord}`}>
      <Icone size={11} className={cor} />
      <span className="text-[10px] text-white/25 shrink-0">{label}</span>
      <span className={`text-[12px] font-bold font-mono ml-auto ${cor}`}>
        {sinal}{delta.toFixed(2)}{unidade}
        {deltaPct !== undefined && <span className="text-[9px] ml-1 opacity-60">{deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)}%</span>}
      </span>
    </div>
  );
}

function PainelTendencia({ tendencia }: { tendencia: TendenciaConta }) {
  const { direcao, confianca } = tendencia;
  const cfg = {
    melhorando: { cor: "text-emerald-400", bg: "bg-emerald-500/[0.04]", border: "border-emerald-500/15", label: "↑ Melhorando", dot: "bg-emerald-400" },
    piorando:   { cor: "text-red-400",     bg: "bg-red-500/[0.04]",     border: "border-red-500/15",     label: "↓ Piorando",   dot: "bg-red-400"   },
    estavel:    { cor: "text-white/40",    bg: "bg-white/[0.02]",       border: "border-white/[0.06]",   label: "→ Estável",    dot: "bg-white/30"  },
  }[direcao];
  return (
    <div className={`p-5 rounded-[20px] border ${cfg.border} ${cfg.bg} mb-4`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/20 mb-1">Tendência 7d vs 7d anterior</p>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <span className={`text-[15px] font-black ${cfg.cor}`}>{cfg.label}</span>
          </div>
        </div>
        <span className="text-[10px] text-white/20 flex items-center gap-1"><Activity size={10} /> {confianca}% confiança</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TendenciaItem label="ROAS"  delta={tendencia.roasDelta}  deltaPct={tendencia.roasDeltaPct}  unidade="×" />
        <TendenciaItem label="CPL"   delta={tendencia.cplDelta}   deltaPct={tendencia.cplDeltaPct}   inverso />
        <TendenciaItem label="Score" delta={tendencia.scoreDelta} unidade=" pts" />
        <TendenciaItem label="Lucro" delta={tendencia.lucroDelta} deltaPct={tendencia.lucroDeltaPct} />
      </div>
      {confianca < 40 && (
        <p className="mt-3 text-[10px] text-white/20 flex items-center gap-1.5">
          <AlertTriangle size={10} className="text-amber-400/60" />
          Dados insuficientes. Acumule mais 7 dias de histórico para comparação precisa.
        </p>
      )}
    </div>
  );
}

function ConcentracaoRiscoPanel({ concentracao }: { concentracao: ConcentracaoRisco }) {
  if (!concentracao.riscoEstrutural) return null;
  return (
    <div className="p-5 rounded-[20px] bg-orange-500/[0.04] border border-orange-500/15 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center"><ShieldAlert size={13} className="text-orange-400" /></div>
        <div><p className="text-[12px] font-bold text-white">Risco Estrutural Detectado</p><p className="text-[10px] text-white/25">Concentração de risco na conta</p></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {concentracao.pctBudgetEmCriticas > 0 && (
          <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Budget em críticas</p>
            <p className={`text-[18px] font-black font-mono ${concentracao.pctBudgetEmCriticas >= 30 ? "text-red-400" : "text-amber-400"}`}>{concentracao.pctBudgetEmCriticas.toFixed(0)}%</p>
          </div>
        )}
        {concentracao.dependenciaVencedora > 0 && (
          <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Dependência de 1 campanha</p>
            <p className={`text-[18px] font-black font-mono ${concentracao.dependenciaVencedora >= 60 ? "text-red-400" : "text-amber-400"}`}>{concentracao.dependenciaVencedora.toFixed(0)}%</p>
            {concentracao.campanhaVencedora && <p className="text-[9px] text-white/20 mt-0.5 truncate">{concentracao.campanhaVencedora}</p>}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {concentracao.alertas.map((alerta, i) => (
          <div key={i} className="flex items-start gap-2">
            <AlertTriangle size={11} className="text-orange-400/70 shrink-0 mt-0.5" />
            <p className="text-[12px] text-white/40 leading-snug">{alerta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AlertaInacao ─────────────────────────────────────────────────────────────
const POR_PAGINA = 6;
function AlertaInacao({ perdaMensal, roasAtual, roasRisco, campanhasProblema }: {
  perdaMensal: number; roasAtual: number; roasRisco: number;
  campanhasProblema: Array<{ nome: string; score: number; gasto: number }>;
}) {
  useSessionGuard();

  const [pagina, setPagina] = useState(0);
  if (perdaMensal <= 0 || campanhasProblema.length === 0) return null;
  const totalGastoEmRisco = campanhasProblema.reduce((s, c) => s + c.gasto, 0);
  const totalPaginas = Math.ceil(campanhasProblema.length / POR_PAGINA);
  const paginaAtual = campanhasProblema.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  return (
    <div className="mb-5 rounded-[20px] border border-red-500/20 bg-red-500/[0.03] overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5"><ShieldAlert size={14} className="text-red-400" /></div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-red-400">Operação em risco — {campanhasProblema.length} campanha{campanhasProblema.length !== 1 ? "s" : ""} ativas com score crítico</p>
            <p className="text-[11px] text-white/30 mt-0.5">R${totalGastoEmRisco.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} investidos em campanhas ativas com score crítico</p>
          </div>
        </div>
        <div className="mb-3 space-y-2">
          {paginaAtual.map((c, i) => (
            <div key={pagina * POR_PAGINA + i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center justify-center w-10 h-7 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0"><span className="text-[11px] font-black text-red-400">{c.score}</span></div>
              <p className="text-[12px] font-medium text-white/70 flex-1 truncate">{c.nome}</p>
              <span className="text-[11px] text-white/30 shrink-0 font-mono">R${c.gasto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
              <span className="text-[9px] font-bold px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/15 shrink-0">CRÍTICA</span>
            </div>
          ))}
        </div>
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between mb-3 pt-2 border-t border-white/[0.04]">
            <button
              onClick={() => setPagina(p => Math.max(0, p - 1))}
              disabled={pagina === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors border border-white/[0.06] hover:border-white/[0.12]"
            >
              ← Anterior
            </button>
            <span className="text-[10px] text-white/20 font-mono">{pagina + 1} / {totalPaginas}</span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
              disabled={pagina === totalPaginas - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors border border-white/[0.06] hover:border-white/[0.12]"
            >
              Próxima →
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 pt-3 border-t border-white/[0.04]">
          <span className="text-[12px] text-white/40"><span className="text-red-400 font-semibold">−R${perdaMensal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>{" "}potencial perdido este mês se nada for feito</span>
          {roasRisco > 0 && roasRisco < roasAtual && <span className="text-[12px] text-white/40">ROAS médio pode cair para <span className="text-red-400 font-semibold">{roasRisco.toFixed(2)}×</span></span>}
        </div>
      </div>
    </div>
  );
}

// ─── BotaoOtimizarConta ───────────────────────────────────────────────────────
function BotaoOtimizarConta({ scoreAtual, scoreProjetado, onOtimizar, otimizando, otimizado }: {
  scoreAtual: number; scoreProjetado: number; onOtimizar: () => void; otimizando: boolean; otimizado: boolean;
}) {
  return (
    <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-[20px] border border-purple-500/15 bg-purple-500/[0.03]">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0"><Sparkles size={15} className="text-purple-400" /></div>
        <div><p className="text-[13px] font-bold text-white">Otimizar conta automaticamente</p><p className="text-[11px] text-white/25 mt-0.5">Pausa críticas · Sugere escala das vencedoras · Atualiza projeção</p></div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {scoreProjetado > scoreAtual && (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-white/30 font-mono">Score {scoreAtual}</span>
            <ChevronRight size={12} className="text-white/20" />
            <span className="text-purple-400 font-bold font-mono">{scoreProjetado}</span>
          </div>
        )}
        {otimizado ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-semibold"><CheckCircle2 size={13} /> Otimizado</div>
        ) : (
          <button onClick={onOtimizar} disabled={otimizando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 text-[13px] font-semibold hover:bg-purple-500/15 hover:border-purple-500/35 transition-all disabled:opacity-60">
            {otimizando ? <><Loader2 size={13} className="animate-spin" /> Otimizando...</> : <><Sparkles size={13} /> Otimizar conta</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ModoCEODados ─────────────────────────────────────────────────────────────
function ModoCEODados({
  scoreGlobal, scoreProjetado, emRisco,
  gastoEmRisco, totalInvest, decisaoIA, analise, onSair,
}: {
  scoreGlobal: number; scoreProjetado: number; emRisco: number;
  totalCampanhas: number; gastoEmRisco: number; totalInvest: number;
  decisaoIA: DecisaoIA | null; analise: AnaliseCompleta | null;
  onSair: () => void;
}) {
  const pctRisco = totalInvest > 0 ? Math.round((gastoEmRisco / totalInvest) * 100) : 0;
  const riscoNivel = pctRisco >= 40 ? { txt: "Crítico",  cor: "text-red-400",    bg: "bg-red-500/[0.05]",    border: "border-red-500/20"    }
                   : pctRisco >= 20 ? { txt: "Alto",     cor: "text-amber-400",  bg: "bg-amber-500/[0.04]",  border: "border-amber-500/15"  }
                   : emRisco > 0    ? { txt: "Moderado", cor: "text-orange-400", bg: "bg-orange-500/[0.04]", border: "border-orange-500/15" }
                   :                  { txt: "Baixo",    cor: "text-emerald-400",bg: "bg-emerald-500/[0.04]",border: "border-emerald-500/15"};
  const scoreColor = scoreGlobal >= 70 ? "text-emerald-400" : scoreGlobal >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/20">Modo CEO · Visão operacional</span>
        </div>
        <button onClick={onSair} className="text-[10px] text-white/20 hover:text-white/50 transition-colors px-2.5 py-1 rounded-lg border border-white/[0.07] hover:border-white/15">
          Sair
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="p-5 rounded-[20px] border border-white/[0.07] bg-white/[0.02]">
          <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Score Global (ponderado)</p>
          <div className="flex items-baseline gap-2 mb-1">
            <p className={`text-[36px] font-black font-mono leading-none ${scoreColor}`}>{scoreGlobal}</p>
            <span className="text-[14px] text-white/20">/100</span>
          </div>
          {scoreProjetado > scoreGlobal && (
            <p className="text-[10px] text-white/25 flex items-center gap-1">
              <TrendingUp size={10} className="text-emerald-400" />
              Pode chegar a <span className="text-emerald-400 font-bold ml-0.5">{scoreProjetado}</span> pausando críticas
            </p>
          )}
        </div>
        <div className={`p-5 rounded-[20px] border ${riscoNivel.border} ${riscoNivel.bg}`}>
          <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Risco Operacional</p>
          <div className="flex items-baseline gap-2 mb-1">
            <p className={`text-[28px] font-black font-mono leading-none ${riscoNivel.cor}`}>{pctRisco}%</p>
            <span className={`text-[11px] font-bold ${riscoNivel.cor}`}>{riscoNivel.txt}</span>
          </div>
          <p className="text-[10px] text-white/25">
            {emRisco > 0
              ? `${emRisco} campanha${emRisco !== 1 ? "s" : ""} crítica${emRisco !== 1 ? "s" : ""} · R$${fmtBRL0(gastoEmRisco)} em risco`
              : "Nenhuma campanha crítica detectada"}
          </p>
        </div>
        <div className={`p-5 rounded-[20px] border ${decisaoIA
          ? decisaoIA.tipo === "pausar" ? "border-red-500/20 bg-red-500/[0.05]" : "border-emerald-500/20 bg-emerald-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]"
        }`}>
          <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Ação Prioritária</p>
          {decisaoIA ? (
            <>
              <p className={`text-[12px] font-bold leading-snug mb-2 ${decisaoIA.tipo === "pausar" ? "text-red-400" : "text-emerald-400"}`}>
                {decisaoIA.tipo === "pausar" ? "⛔" : "🚀"} {decisaoIA.frase.length > 60 ? decisaoIA.frase.slice(0, 60) + "…" : decisaoIA.frase}
              </p>
              <p className="text-[10px] text-white/25">
                {decisaoIA.tipo === "pausar" ? "−" : "+"}R${fmtBRL0(decisaoIA.impactoMensal)}/mês estimado
              </p>
            </>
          ) : (
            <p className="text-[12px] text-white/30">✅ Nenhuma ação crítica pendente</p>
          )}
        </div>
      </div>
      {analise?.resumoExecutivo?.linhas && analise.resumoExecutivo.linhas.length > 0 && (
        <div className="px-5 py-4 rounded-[20px] border border-white/[0.05] bg-white/[0.01]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/20 mb-2.5">Resumo da operação</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {analise.resumoExecutivo.linhas.slice(0, 4).map((linha, i) => (
              <p key={i} className="text-[11px] text-white/40 leading-snug font-mono">{linha}</p>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <a href="/pulse" className="text-[10px] text-white/20 hover:text-white/40 flex items-center gap-1 transition-colors">
          Ver visão estratégica completa em Pulse <ChevronRight size={10} />
        </a>
      </div>
    </div>
  );
}

// ─── BannerContextoSimulacao ──────────────────────────────────────────────────
function BannerContextoSimulacao({ campanhaNome, contaEmRisco }: { campanhaNome: string; contaEmRisco: boolean }) {
  if (!contaEmRisco) return null;
  return (
    <div className="mb-3 flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/[0.04] border border-blue-500/10">
      <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-[12px] font-semibold text-white/60 mb-0.5">Por que a simulação aparece positiva?</p>
        <p className="text-[11px] text-white/35 leading-relaxed">A conta tem campanhas críticas, mas a simulação mostra o potencial de <span className="text-white/55 font-medium">&quot;{campanhaNome}&quot;</span> — sua melhor campanha ativa.</p>
      </div>
    </div>
  );
}

// ─── SliderProjecaoInline ─────────────────────────────────────────────────────
function SliderProjecaoInline({ campanha, scoreGlobal, temCriticas }: {
  campanha: CampanhaBase; scoreGlobal: number; temCriticas: boolean;
}) {
  const [escala, setEscala] = useState(20);
  const proj = useMemo(() => calcularProjecaoDinamica(campanha, escala, scoreGlobal, 0, temCriticas), [campanha, escala, scoreGlobal, temCriticas]);
  const corDelta = proj.deltaLucro > 0 ? "text-emerald-400" : "text-red-400";
  return (
    <div className="mt-4 p-5 rounded-2xl bg-[#0f0f11] border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-4"><Gauge size={13} className="text-purple-400" /><p className="text-[12px] font-bold text-white">Simular escala</p><span className="text-[11px] text-white/30 truncate">&quot;{campanha.nome_campanha}&quot;</span></div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2"><span className="text-[11px] text-white/30">Aumentar orçamento</span><span className="text-[15px] font-black font-mono text-purple-400">+{escala}%</span></div>
        <input type="range" min={0} max={50} step={5} value={escala} onChange={e => setEscala(Number(e.target.value))} className="w-full h-1 rounded-full appearance-none bg-white/10 accent-purple-500 cursor-pointer" />
        <div className="flex justify-between text-[9px] text-white/15 mt-1">{[0, 10, 20, 30, 40, 50].map(v => <span key={v}>{v}%</span>)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: "Novo gasto", value: `R$${fmtBRL0(proj.novoGasto)}`, cor: "text-white/60" },
          { label: "Novo lucro", value: `R$${fmtBRL0(proj.novoLucro)}`, cor: proj.novoLucro > 0 ? "text-emerald-400" : "text-red-400" },
          { label: "ROAS proj.", value: `${proj.novoRoas.toFixed(2)}×`,  cor: proj.novoRoas >= 2.5 ? "text-emerald-400" : "text-amber-400" },
          { label: "Score est.", value: `${proj.novoScore}/100`,          cor: proj.novoScore >= 70 ? "text-emerald-400" : "text-amber-400" },
        ].map((m, i) => (
          <div key={i} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">{m.label}</p>
            <p className={`text-[13px] font-black font-mono ${m.cor}`}>{m.value}</p>
          </div>
        ))}
      </div>
      {escala > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-2">
          <span className="text-[11px] text-white/30">Lucro adicional estimado</span>
          <span className={`text-[15px] font-black font-mono ${corDelta}`}>{proj.deltaLucro > 0 ? "+" : ""}R${fmtBRL0(proj.deltaLucro)}</span>
        </div>
      )}
      {proj.avisos.map((aviso, i) => (
        <div key={i} className="flex items-start gap-2 mt-1">
          <AlertTriangle size={11} className="text-amber-400/60 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-400/50 leading-snug">{aviso}</p>
        </div>
      ))}
    </div>
  );
}

// ─── PAGE PRINCIPAL ───────────────────────────────────────────────────────────
// ─── PainelPorObjetivo ────────────────────────────────────────────────────────
function PainelPorObjetivo({
  campanhas, health, onDecisao,
}: {
  campanhas: CampanhaEnriquecida[];
  health: ReturnType<typeof calcularHealth>;
  onDecisao: (id: string, acao: string, impacto: string, extra?: { lucro?: number; margem?: number }) => Promise<void>;
}) {
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const toggleGrupo = (tipo: string) =>
    setColapsados(prev => {
      const next = new Set(prev);
      if (next.has(tipo)) { next.delete(tipo); } else { next.add(tipo); }
      return next;
    });

  // Agrupa campanhas por tipo/objetivo detectado
  const grupos = useMemo(() => {
    const map: Record<TipoCampanha, CampanhaEnriquecida[]> = {} as Record<TipoCampanha, CampanhaEnriquecida[]>;
    for (const c of campanhas) {
      const tipo = resolverTipo(
        c.nome_campanha,
        c.objective ?? c.tipo_campanha ?? null,
        {
          cliques:    c.cliques    ?? 0,
          contatos:   c.contatos   ?? 0,
          impressoes: c.impressoes ?? 0,
          ctr:        c.ctr        ?? 0,
          cpm:        c.m.cpm      ?? 0,
          gasto_total: c.gasto_total ?? 0,
        }
      );
      if (!map[tipo]) map[tipo] = [];
      map[tipo].push(c);
    }
    // Ordena grupos por gasto total decrescente
    return Object.entries(map).sort(([, a], [, b]) => {
      const gastoA = a.reduce((s, c) => s + (c.gasto_total ?? 0), 0);
      const gastoB = b.reduce((s, c) => s + (c.gasto_total ?? 0), 0);
      return gastoB - gastoA;
    }) as [TipoCampanha, CampanhaEnriquecida[]][];
  }, [campanhas]);

  if (grupos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/20">
        <Target size={32} className="mb-3 opacity-40" />
        <p className="text-sm font-semibold">Nenhuma campanha no período</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grupos.map(([tipo, camps]) => {
        const bench    = BENCHMARKS_POR_TIPO[tipo];
        const totalGasto = camps.reduce((s, c) => s + (c.gasto_total ?? 0), 0);
        const totalLeads = camps.reduce((s, c) => s + (c.contatos ?? 0), 0);
        const cplMedio  = totalLeads > 0 ? totalGasto / totalLeads : 0;
        const scoresMedio = Math.round(camps.reduce((s, c) => s + c.m.score, 0) / camps.length);
        const statusCor  = scoresMedio >= 80 ? "text-emerald-400" : scoresMedio >= 60 ? "text-amber-400" : "text-red-400";
        const statusBg   = scoresMedio >= 80 ? "bg-emerald-500/10 border-emerald-500/20" : scoresMedio >= 60 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";

        return (
          <section key={tipo}>
            {/* Header do grupo — clicável para colapsar */}
            <button
              onClick={() => toggleGrupo(tipo)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-base">
                  {bench.emoji}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-[14px] font-bold ${bench.cor}`}>{bench.label}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBg} ${statusCor}`}>
                      Score {scoresMedio}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {camps.length} campanha{camps.length !== 1 ? "s" : ""} · 
                    R$ {totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} investidos
                    {totalLeads > 0 && ` · ${totalLeads} resultados · CPL médio R$${cplMedio.toFixed(2)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Métrica principal */}
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-white/25 uppercase tracking-wider">{bench.metricaPrincipal}</p>
                  <p className={`text-[15px] font-bold ${bench.cor}`}>
                    {bench.metricaPrincipal === "CPL" && cplMedio > 0 ? `R$${cplMedio.toFixed(2)}`
                    : bench.metricaPrincipal === "CPM" ? `R$${(totalGasto / Math.max(camps.reduce((s,c) => s + (c.impressoes ?? 0), 0), 1) * 1000).toFixed(2)}`
                    : "—"}
                  </p>
                </div>
                {/* Setinha */}
                <div className={`w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center transition-all group-hover:bg-white/[0.08] ${colapsados.has(tipo) ? "" : "rotate-180"}`}>
                  <ChevronRight size={13} className="text-white/30 rotate-90" />
                </div>
              </div>
            </button>

            {/* Barra de health */}
            <div className="h-px bg-white/[0.05] rounded-full mb-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${scoresMedio >= 80 ? "bg-emerald-500" : scoresMedio >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${scoresMedio}%` }}
              />
            </div>

            {/* Cards das campanhas — ocultados quando colapsado */}
            {!colapsados.has(tipo) && (
              <div className="space-y-2.5 pl-1">
                {camps
                  .sort((a, b) => b.m.score - a.m.score)
                  .map((c, i) => (
                    <CampanhaCard
                      key={c.id}
                      c={c}
                      rank={i + 1}
                      delay={i * 40}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      flags={(health.flagsPorCampanha[c.id] ?? []) as any}
                      scores={health.scoresPorCampanha[c.id] ?? null}
                      media={health.mediaConta}
                      onDecisao={onDecisao}
                    />
                  ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const STATUS_ATIVOS = new Set(["ATIVO", "ACTIVE", "ATIVA"]);

export default function DadosPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const { clienteAtual } = useCliente();

  const [campanhas, setCampanhas]                 = useState<Campanha[]>([]);
  const [decisoes, setDecisoes]                   = useState<DecisaoHistorico[]>([]);
  const [snapshots, setSnapshots]                 = useState<SnapshotHistorico[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [syncing, setSyncing]                     = useState(false);
  const [error, setError]                         = useState("");
  const [success, setSuccess]                     = useState("");
  const [periodo, setPeriodo]                     = useState<Periodo>("30d");
  const [ordem, setOrdem]                         = useState<OrdemMetrica>("score");
  const [filtroCritico, setFiltroCritico]         = useState(false);
  const [abaAtiva, setAbaAtiva]                   = useState<AbaAtiva | "objetivos">("campanhas");
  const [plataformaAtiva, setPlataformaAtiva]     = useState<PlataformaId | "geral">("geral");
  const [decisaoIgnorada, setDecisaoIgnorada]     = useState(false);
  const [executandoDecisao, setExecutandoDecisao] = useState(false);
  const [decisaoExecutada, setDecisaoExecutada]   = useState(false);
  const [otimizando, setOtimizando]               = useState(false);
  const [otimizado, setOtimizado]                 = useState(false);
  const [modalSimularIA, setModalSimularIA]       = useState(false);
  const [modoCEO, setModoCEO]                     = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_logsDecisao, setLogsDecisao]             = useState<LogDecisao[]>([]);
  const [userId, setUserId]                       = useState<string | undefined>();
  const analiseRef = useRef<AnaliseCompleta | null>(null);

  const { historico: historicoMetricas, diasDisponiveis, ultimoSnapshot, loading: histLoading } =
    useHistorico(userId, clienteAtual?.id);

  // ─── v8.2: buscarDados corrigido ─────────────────────────────────────────────
  // • Com cliente selecionado  → filtra só campanhas desse cliente
  // • Sem cliente selecionado  → retorna TODAS as campanhas do user (sem filtro extra)
  //   (a v8.1 retornava [] quando existiam clientes cadastrados → página ficava vazia)
  const buscarDados = useCallback(async (uid: string, clienteId?: string) => {
    let adsQuery = supabase.from("metricas_ads").select("*")
      .eq("user_id", uid).in("status", ["ATIVO", "ACTIVE", "ATIVA"])
      .order("gasto_total", { ascending: false });

    if (clienteId) {
      adsQuery = adsQuery.eq("cliente_id", clienteId);
    }
    // Sem clienteId → sem filtro adicional, mostra tudo

    const [{ data: ads }, { data: dec }, { data: snap }] = await Promise.all([
      adsQuery,
      supabase.from("decisoes_historico").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
      supabase.from("metricas_snapshot_diario")
        .select("campanha_id,cpl_ontem,cpl_semana,ctr_ontem,ctr_semana,leads_ontem,gasto_ontem,created_at")
        .eq("user_id", uid).order("created_at", { ascending: false }).limit(200),
    ]);

    return {
      campanhas: (ads ?? []) as Campanha[],
      decisoes:  (dec ?? []) as DecisaoHistorico[],
      snapshots: (snap ?? []) as SnapshotHistorico[],
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        setUserId(user.id);
        const dados = await buscarDados(user.id, clienteAtual?.id);
        if (cancelled) return;
        setCampanhas(dados.campanhas);
        setDecisoes(dados.decisoes);
        setSnapshots(dados.snapshots);
        setDecisaoIgnorada(false);
      } catch {}
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [buscarDados, supabase, clienteAtual]);

  useEffect(() => { setFiltroCritico(false); }, [periodo]);

  // ─── Sincronizar ─────────────────────────────────────────────────────────────
  const sincronizar = useCallback(async () => {
    setSyncing(true); setError(""); setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Sessão expirada."); return; }
      const url = clienteAtual?.id ? `/api/ads-sync?cliente_id=${clienteAtual.id}` : "/api/ads-sync";
      const res  = await fetch(url);
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) { setError(json.error || "Erro ao sincronizar."); return; }
      fetch("/api/snapshot", { method: "POST" }).catch(() => {});
      const dados = await buscarDados(user.id, clienteAtual?.id);
      setCampanhas(dados.campanhas);
      setDecisoes(dados.decisoes);
      setSnapshots(dados.snapshots);
      const ativas = dados.campanhas.filter(c => c.status === "ATIVO" || c.status === "ACTIVE" || c.status === "ATIVA").length;
      setSuccess(`${ativas} campanha${ativas !== 1 ? "s" : ""} ativa${ativas !== 1 ? "s" : ""} sincronizada${ativas !== 1 ? "s" : ""}.`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally { setSyncing(false); }
  }, [buscarDados, supabase, clienteAtual]);

  // ─── Registrar decisão ────────────────────────────────────────────────────────
  const registrarDecisao = useCallback(async (
    id: string, acao: string, impacto: string,
    extra?: { lucro?: number; margem?: number }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const campanha = campanhas.find(c => c.id === id);
      const metricas = campanha ? calcMetricas(campanha) : null;
      const row = {
        user_id: user.id, campanha: id, campanha_nome: campanha?.nome_campanha,
        acao, impacto, data: new Date().toLocaleDateString("pt-BR"),
        score_snapshot:  metricas?.score  ?? null,
        lucro_snapshot:  extra?.lucro  ?? metricas?.lucro  ?? null,
        margem_snapshot: extra?.margem ?? metricas?.margem ?? null,
      };
      const { data: inserted } = await supabase.from("decisoes_historico").insert(row).select().single();
      setDecisoes(prev => [inserted ?? row, ...prev]);
      if (campanha && metricas) {
        const campanhaBase: CampanhaBase = {
          id: campanha.id, nome_campanha: campanha.nome_campanha,
          gasto_total: campanha.gasto_total, contatos: campanha.contatos,
          receita_estimada: campanha.receita_estimada, dias_ativo: campanha.dias_ativo ?? 7,
          score: metricas.score, roas: metricas.roas,
        };
        const risco = calcularRiscoProgressivo(campanhaBase);
        const tipo: LogDecisao["tipo"] = acao.toLowerCase().includes("paus") ? "pausar"
          : acao.toLowerCase().includes("escal") ? "escalar"
          : acao.toLowerCase().includes("ignor") ? "ignorar" : "ajustar";
        const log = construirLogDecisao(campanhaBase, acao, tipo, {
          scoreAtual: metricas.score,
          scoreProjetado: analiseRef.current?.preditivo.scoreProjetado ?? metricas.score,
          roasAtual: metricas.roas, cplAtual: metricas.cpl, lucroAtual: metricas.lucro,
          indiceRiscoAtual: 0,
          tendencia: analiseRef.current?.tendencia ?? {
            roasDelta: 0, roasDeltaPct: 0, cplDelta: 0, cplDeltaPct: 0,
            scoreDelta: 0, lucroDelta: 0, lucroDeltaPct: 0, direcao: "estavel", periodoBase: "7d", confianca: 0,
          },
          confiancaEngine: risco.confianca,
        }, risco.justificativa);
        setLogsDecisao(prev => [log, ...prev].slice(0, 50));
      }
      if ((acao.includes("Pausar") || acao.includes("pausar")) && campanha && metricas) {
        await fetch("/api/telegram", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campanha: campanha.nome_campanha, sinal: `Score ${metricas.score}/100 · Margem ${(metricas.margem * 100).toFixed(1)}%`, msg: impacto }),
        }).catch(() => {});
      }
    } catch {}
  }, [supabase, campanhas]);

  // ─── Executar decisão IA ──────────────────────────────────────────────────────
  const executarDecisaoIA = useCallback(async (decisao: DecisaoIA) => {
    setExecutandoDecisao(true);
    try {
      if (decisao.tipo === "pausar") {
        const res = await fetch("/api/meta/pause-campaign", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campanhaId: decisao.campanhaId, campanhaNome: decisao.campanhaNome, motivo: decisao.frase }),
        });
        const text = await res.text();
        const json = text ? JSON.parse(text) : {};
        if (!res.ok) { setError(json.error || "Erro ao executar ação."); return; }
        setSuccess(json.message || "Campanha pausada com sucesso.");
        setTimeout(() => setSuccess(""), 6000);
        setCampanhas(prev => prev.map(c => c.id === decisao.campanhaId ? { ...c, status: "PAUSADA" } : c));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dec } = await supabase.from("decisoes_historico").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
          if (dec) setDecisoes(dec as DecisaoHistorico[]);
        }
      } else {
        await registrarDecisao(decisao.campanhaId, "Escalar budget 20% (Erizon AI)", decisao.frase, { lucro: decisao.lucroExtra });
        setSuccess("Recomendação de escala registrada.");
        setTimeout(() => setSuccess(""), 6000);
      }
      setDecisaoExecutada(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally { setExecutandoDecisao(false); }
  }, [registrarDecisao, supabase]);

  // ─── Otimização automática ────────────────────────────────────────────────────
  const executarOtimizacao = useCallback(async () => {
    setOtimizando(true);
    try {
      const criticas = campanhas.map(c => ({ ...c, m: calcMetricas(c) })).filter(c => c.m.score < 40);
      for (const c of criticas) {
        const res = await fetch("/api/meta/pause-campaign", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campanhaId: c.id, campanhaNome: c.nome_campanha, motivo: `Score ${c.m.score}/100 · Otimização automática Erizon`, scoreSnapshot: c.m.score, lucroSnapshot: c.m.lucro, margemSnapshot: c.m.margem }),
        });
        if (res.ok) setCampanhas(prev => prev.map(camp => camp.id === c.id ? { ...camp, status: "PAUSADA" } : camp));
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: dec } = await supabase.from("decisoes_historico").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
        if (dec) setDecisoes(dec as DecisaoHistorico[]);
      }
      setOtimizado(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro durante otimização.");
    } finally { setOtimizando(false); }
  }, [campanhas, supabase]);

  // ─── Memos ────────────────────────────────────────────────────────────────────
  const todasEnriquecidas = useMemo<CampanhaEnriquecida[]>(() =>
    campanhas.map(c => ({ ...c, m: calcMetricas(c) })), [campanhas]);

  // porPeriodo: filtra por período dos DADOS (gasto/leads), não pela data de sync
  // data_atualizacao reflete quando foi feito o último sync — não quando a campanha rodou
  // O período aqui serve apenas para ordenação visual; os dados são sempre do date_preset do sync
  const porPeriodo = useMemo(() =>
    todasEnriquecidas.filter(c => STATUS_ATIVOS.has(c.status ?? "")),
    [todasEnriquecidas]);

  const health = useMemo(() =>
    calcularHealth(porPeriodo as unknown as CampanhaInput[], snapshots), [porPeriodo, snapshots]);

  const snapshotsBase = useMemo<SnapshotCampanha[]>(() =>
    snapshots.map(s => ({
      campanha_id: s.campanha_id,
      data:  s.created_at ?? new Date().toISOString(),
      gasto: s.gasto_ontem ?? 0,
      leads: s.leads_ontem ?? 0,
      cpl:   s.cpl_ontem   ?? 0,
    })), [snapshots]);

  const campanhasBase = useMemo<CampanhaBase[]>(() =>
    porPeriodo.map(c => ({
      id: c.id, nome_campanha: c.nome_campanha, gasto_total: c.gasto_total,
      contatos: c.contatos, receita_estimada: c.receita_estimada,
      orcamento: c.orcamento, dias_ativo: c.dias_ativo ?? 7,
      impressoes: c.impressoes, cliques: c.cliques, score: c.m.score, roas: c.m.roas,
    })), [porPeriodo]);

  const analise = useMemo<AnaliseCompleta | null>(() => {
    const resultado = campanhasBase.length === 0 ? null : analisarConta(campanhasBase, snapshotsBase, health.score);
    analiseRef.current = resultado;
    return resultado;
  }, [campanhasBase, snapshotsBase, health.score]);

  const campanhasProblemaDetalhada = useMemo(() =>
    porPeriodo
      .filter(c => {
        const s = (c.status ?? "").toUpperCase();
        return (s === "ATIVO" || s === "ACTIVE" || s === "ATIVA") && c.m.score < 40;
      })
      .sort((a, b) => b.m.investimento - a.m.investimento)
      .map(c => ({ nome: c.nome_campanha, score: c.m.score, gasto: c.m.investimento })),
    [porPeriodo]);

  const decisaoIA = useMemo((): DecisaoIA | null => {
    if (health.enriched.length === 0) return null;
    const critica = health.enriched.filter(c => c.scores.urgencia === "critico").sort((a, b) => b.gasto - a.gasto)[0];
    if (critica) {
      const gastoDiario    = critica.gasto / Math.max(1, critica.diasAtivo);
      const receitaDiaria  = critica.leads > 0 ? critica.receita / Math.max(1, critica.diasAtivo) : 0;
      const prejuizoDiario = Math.max(0, gastoDiario - receitaDiaria);
      const impactoMensal  = prejuizoDiario > 0 ? Math.round(prejuizoDiario * 30) : Math.round(gastoDiario * 30 * Math.max(0, 2.5 - critica.roas) / 2.5);
      const roasStr = critica.roas > 0 ? `ROAS ${critica.roas.toFixed(2)}×` : "sem retorno";
      return {
        campanhaId: critica.id, campanhaNome: critica.nome_campanha, tipo: "pausar",
        frase: critica.leads === 0
          ? `Pause ${critica.nome_campanha} agora. R$${Math.round(gastoDiario)}/dia investidos sem nenhum resultado.`
          : `Pause ${critica.nome_campanha} agora. R$${Math.round(gastoDiario)}/dia com ${roasStr} abaixo do mínimo saudável.`,
        impactoMensal, riscoIgnorar: `Continuar assim: R$${Math.round(gastoDiario * 7)} investidos nos próximos 7 dias sem retorno suficiente.`,
        confianca: calcularConfianca(critica.diasAtivo, critica.gasto, critica.leads),
        lucroExtra: 0, gastoDiario: Math.round(gastoDiario),
      };
    }
    const escala = health.enriched.filter(c => c.scores.urgencia === "oportunidade" || (c.roas >= 2.5 && c.score >= 70)).sort((a, b) => b.roas * b.alavancagem - a.roas * a.alavancagem)[0];
    if (escala) {
      const extraLuc = escala.gasto * 0.2 * escala.roas - escala.gasto * 0.2;
      return {
        campanhaId: escala.id, campanhaNome: escala.nome_campanha, tipo: "escalar",
        frase: `Escale ${escala.nome_campanha} em 20%. ROAS ${escala.roas.toFixed(2)}× com margem saudável — headroom disponível.`,
        impactoMensal: Math.round(extraLuc * 4), riscoIgnorar: `Janela de escala pode fechar com saturação de audiência.`,
        confianca: calcularConfianca(escala.diasAtivo, escala.gasto, escala.leads),
        lucroExtra: Math.round(extraLuc), gastoDiario: Math.round(escala.gasto * 0.2 / 30),
      };
    }
    return null;
  }, [health]);

  const campanhaParaSimular = useMemo(() => {
    if (!decisaoIA) return null;
    if (decisaoIA.tipo === "pausar") {
      const melhor = campanhas.map(c => ({ ...c, m: calcMetricas(c) })).filter(c => c.id !== decisaoIA.campanhaId && c.m.score >= 50).sort((a, b) => b.m.score - a.m.score)[0];
      return melhor ?? campanhas.find(c => c.id === decisaoIA.campanhaId);
    }
    return campanhas.find(c => c.id === decisaoIA.campanhaId);
  }, [decisaoIA, campanhas]);

  const campanhaBaseSimular = useMemo<CampanhaBase | null>(() => {
    if (!campanhaParaSimular) return null;
    const m = calcMetricas(campanhaParaSimular);
    return { id: campanhaParaSimular.id, nome_campanha: campanhaParaSimular.nome_campanha, gasto_total: campanhaParaSimular.gasto_total, contatos: campanhaParaSimular.contatos, receita_estimada: campanhaParaSimular.receita_estimada, dias_ativo: campanhaParaSimular.dias_ativo ?? 7, score: m.score, roas: m.roas };
  }, [campanhaParaSimular]);

  const scoreProjetado = useMemo(() =>
    health.score === 0 ? 0 : Math.min(98, health.score + Math.min(25, health.campanhasProblema * 8)),
    [health]);

  const contaSaude = useMemo(() => {
    if (porPeriodo.length === 0) return null;
    const totalInvest    = porPeriodo.reduce((s, c) => s + c.m.investimento, 0);
    const totalResultado = porPeriodo.reduce((s, c) => s + c.m.resultado,    0);
    const comCtr         = porPeriodo.filter(c => c.m.ctr > 0);
    const ctrMedio       = comCtr.length > 0 ? comCtr.reduce((s, c) => s + c.m.ctr, 0) / comCtr.length : 0;
    const scoreGlobal = totalInvest > 0
      ? Math.round(porPeriodo.reduce((s, c) => s + c.m.score * c.m.investimento, 0) / totalInvest)
      : Math.round(porPeriodo.reduce((s, c) => s + c.m.score, 0) / porPeriodo.length);
    const criticas     = porPeriodo.filter(c => c.m.score < 40);
    const gastoEmRisco = criticas.reduce((s, c) => s + c.m.investimento, 0);
    return { totalInvest, totalResultado, cplMedio: totalResultado > 0 ? totalInvest / totalResultado : 0, ctrMedio, scoreGlobal, emRisco: criticas.length, gastoEmRisco, total: porPeriodo.length };
  }, [porPeriodo]);

  const baseConfidence = useMemo(() => {
    if (porPeriodo.length === 0) return 50;
    const totalInvest = porPeriodo.reduce((s, c) => s + c.m.investimento, 0);
    const totalLeads  = porPeriodo.reduce((s, c) => s + c.m.resultado,    0);
    const qtd    = Math.min(porPeriodo.length / 5, 1);
    const volume = totalInvest > 5000 ? 1 : totalInvest / 5000;
    const leads  = totalLeads  > 50   ? 1 : totalLeads  / 50;
    return Math.min(Math.max(Math.round((qtd * 0.35 + volume * 0.35 + leads * 0.30) * 100), 42), 97);
  }, [porPeriodo]);

  const comparacaoSemanal = useMemo(() => calcularComparacaoSemanal(historicoMetricas), [historicoMetricas]);

  const campanhasFiltradas = useMemo(() => {
    const base = filtroCritico ? porPeriodo.filter(c => c.m.score < 40) : porPeriodo;
    return [...base].sort((a, b) => {
      if (ordem === "score") return b.m.score - a.m.score;
      if (ordem === "gasto") return b.m.investimento - a.m.investimento;
      if (ordem === "leads") return b.m.resultado - a.m.resultado;
      if (ordem === "cpl")   return (a.m.cpl || Infinity) - (b.m.cpl || Infinity);
      if (ordem === "ctr")   return b.m.ctr - a.m.ctr;
      return 0;
    });
  }, [porPeriodo, filtroCritico, ordem]);

  const contaEmRisco = campanhasProblemaDetalhada.length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0b0b0d] to-[#0a0a0a] text-white">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-24 px-4 py-6 md:px-8 md:py-8 xl:px-14 max-w-[1400px] mx-auto w-full">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-8 pb-7 border-b border-white/[0.04]">
          <div>
            <p className="text-[11px] font-medium text-white/20 mb-2.5 tracking-wide">
              Erizon · Copiloto de decisão
              {clienteAtual && (
                <span className="ml-2 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px]">
                  {clienteAtual.nome_cliente}
                </span>
              )}
            </p>
            <h1 className="text-[1.9rem] font-bold text-white tracking-tight">Central de Decisão</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/[0.06] border border-red-500/15 rounded-xl">
                <AlertCircle size={13} className="text-red-400 shrink-0" />
                <span className="text-[12px] text-red-400">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <span className="text-[12px] text-emerald-400">{success}</span>
              </div>
            )}
            {porPeriodo.length > 0 && (
              <button onClick={() => setModoCEO(v => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-semibold transition-all ${
                  modoCEO
                    ? "bg-purple-500/10 border-purple-500/25 text-purple-400"
                    : "bg-white/[0.04] border-white/[0.07] text-white/40 hover:text-white hover:border-white/15"
                }`}>
                <Brain size={13} />
                {modoCEO ? "Sair do Modo CEO" : "Modo CEO"}
              </button>
            )}
            <button onClick={sincronizar} disabled={syncing || loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-medium text-white/60 hover:text-white">
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Sincronizando..." : "Sincronizar"}
            </button>
          </div>
        </header>

        {loading ? <PageSkeleton /> : (
          <>
            {/* ── Seletor de plataformas ─────────────────────────────────── */}
            <PlataformaSelector ativa={plataformaAtiva} onChange={setPlataformaAtiva} />

            {/* ── Vista Geral ────────────────────────────────────────────── */}
            {plataformaAtiva === "geral" ? (
              <GeralView
                campanhas={todasEnriquecidas}
                onSelecionar={p => setPlataformaAtiva(p)}
              />
            ) : plataformaAtiva !== "meta" ? (() => {
              const PLAT_LABEL: Record<string, string> = { google: "Google Ads", tiktok: "TikTok Ads", linkedin: "LinkedIn Ads" };
              const PLAT_COR:   Record<string, string> = { google: "#EA4335",    tiktok: "#69C9D0",    linkedin: "#0A66C2"    };
              const PLAT_SIGLA: Record<string, string> = { google: "G",          tiktok: "T",          linkedin: "in"         };
              const platLabel = PLAT_LABEL[plataformaAtiva] ?? plataformaAtiva;
              const platCor   = PLAT_COR[plataformaAtiva]   ?? "#888";
              const platSigla = PLAT_SIGLA[plataformaAtiva] ?? plataformaAtiva;
              const platCamps = todasEnriquecidas.filter(c => c.plataforma === plataformaAtiva);

              if (platCamps.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: platCor + "22", border: `1px solid ${platCor}44` }}
                    >
                      <span className="text-[22px] font-black" style={{ color: platCor }}>{platSigla}</span>
                    </div>
                    <p className="text-[16px] font-bold text-white/60 mb-2">{platLabel}</p>
                    <p className="text-[13px] text-white/25 max-w-xs leading-relaxed mb-6">
                      Nenhuma campanha sincronizada ainda. Conecte sua conta em{" "}
                      <a href="/settings/integracoes" className="text-purple-400 hover:underline">Integrações</a>{" "}
                      e sincronize.
                    </p>
                    <button
                      onClick={() => setPlataformaAtiva("geral")}
                      className="text-[12px] text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      ← Voltar para visão geral
                    </button>
                  </div>
                );
              }

              const totalInvest = platCamps.reduce((s, c) => s + c.m.investimento, 0);
              const totalLeads  = platCamps.reduce((s, c) => s + c.m.resultado,    0);
              const cplMedio    = totalLeads > 0 ? totalInvest / totalLeads : 0;
              const scoreGlobal = totalInvest > 0
                ? Math.round(platCamps.reduce((s, c) => s + c.m.score * c.m.investimento, 0) / totalInvest)
                : Math.round(platCamps.reduce((s, c) => s + c.m.score, 0) / platCamps.length);

              return (
                <div>
                  {/* Overview strip */}
                  <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
                    {[
                      { label: "Investimento", value: `R$${totalInvest.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` },
                      { label: "Leads", value: totalLeads.toLocaleString("pt-BR") },
                      { label: "CPL Médio", value: totalLeads > 0 ? `R$${cplMedio.toFixed(2)}` : "—" },
                      { label: "Score Médio", value: String(scoreGlobal) },
                    ].map(({ label, value }) => (
                      <div key={label} className="px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">{label}</p>
                        <p className="text-[18px] font-black font-mono text-white/80">{value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Campaign cards */}
                  <div className="space-y-3">
                    {platCamps.map((c, i) => (
                      <CampanhaCard
                        key={c.id} c={c} rank={i + 1} delay={i * 60}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        flags={(health.flagsPorCampanha[c.id] ?? []) as any}
                        scores={health.scoresPorCampanha[c.id] ?? null}
                        media={health.mediaConta}
                        onDecisao={registrarDecisao}
                      />
                    ))}
                  </div>
                </div>
              );
            })() : (
            /* ── Meta Ads — UI existente ──────────────────────────────── */
            <>
            {modoCEO && contaSaude ? (
              <ModoCEODados
                scoreGlobal={contaSaude.scoreGlobal}
                scoreProjetado={scoreProjetado}
                emRisco={contaSaude.emRisco}
                totalCampanhas={contaSaude.total}
                gastoEmRisco={contaSaude.gastoEmRisco}
                totalInvest={contaSaude.totalInvest}
                decisaoIA={decisaoIA}
                analise={analise}
                onSair={() => setModoCEO(false)}
              />
            ) : (
              <>
                {analise && !decisaoIgnorada && <ConcentracaoRiscoPanel concentracao={analise.concentracao} />}

                {porPeriodo.length > 0 && decisaoIA && !decisaoIgnorada && (
                  <BlocoDecisaoIA
                    decisao={decisaoIA}
                    onExecutar={() => executarDecisaoIA(decisaoIA)}
                    onSimular={() => setModalSimularIA(true)}
                    onIgnorar={() => setDecisaoIgnorada(true)}
                    executando={executandoDecisao}
                    executado={decisaoExecutada}
                  />
                )}

                {modalSimularIA && decisaoIA && campanhaParaSimular && campanhaBaseSimular && (() => {
                  const camp = campanhaParaSimular;
                  const m = calcMetricas(camp);
                  return (
                    <>
                      <BannerContextoSimulacao campanhaNome={camp.nome_campanha} contaEmRisco={contaEmRisco && camp.id !== decisaoIA.campanhaId} />
                      <ModalSimulacaoEscala
                        campanha={{ id: camp.id, nome_campanha: camp.nome_campanha, gasto_total: camp.gasto_total, contatos: camp.contatos, orcamento: camp.orcamento ?? 0, score: m.score }}
                        onConfirmar={async () => {
                          setModalSimularIA(false);
                          await registrarDecisao(camp.id, "Escalar (via simulação IA)", decisaoIA.frase, { lucro: m.lucro, margem: m.margem });
                        }}
                        onFechar={() => setModalSimularIA(false)}
                      />
                      <SliderProjecaoInline campanha={campanhaBaseSimular} scoreGlobal={health.score} temCriticas={contaEmRisco} />
                    </>
                  );
                })()}

                {porPeriodo.length > 0 && !decisaoIgnorada && (
                  <AlertaInacao
                    perdaMensal={Math.round((health.lucroPerda7d / 7) * 30)}
                    roasAtual={health.roasMedio}
                    roasRisco={health.roasMedio * 0.75}
                    campanhasProblema={campanhasProblemaDetalhada}
                  />
                )}

                {porPeriodo.length > 0 && health.campanhasProblema > 0 && (
                  <BotaoOtimizarConta
                    scoreAtual={health.score} scoreProjetado={scoreProjetado}
                    onOtimizar={executarOtimizacao} otimizando={otimizando} otimizado={otimizado}
                  />
                )}

                {porPeriodo.length > 0 && <RadarOperacional health={health} />}
                {porPeriodo.length > 0 && <InteligenciaResumo health={health} />}

                {decisoes.length > 0 && <MemoriaEstrategica decisoes={decisoes} />}

                {analise && porPeriodo.length > 0 && contaSaude && (
                  <PainelInsights
                    analise={analise}
                    cplMedio={contaSaude.cplMedio}
                    totalInvest={contaSaude.totalInvest}
                    baseConfidence={baseConfidence}
                  />
                )}

                {comparacaoSemanal && <ComparacaoSemanalCard comp={comparacaoSemanal} />}

                {porPeriodo.length > 0 && (
                  <PainelHistoricoMetricas
                    historico={historicoMetricas}
                    diasDisponiveis={diasDisponiveis}
                    ultimoSnapshot={ultimoSnapshot}
                    loading={histLoading}
                    titulo="Histórico de Performance"
                    modo="completo"
                  />
                )}

                {analise && porPeriodo.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <PainelTendencia tendencia={analise.tendencia} />
                    <PreditivoScore preditivo={analise.preditivo} />
                  </div>
                )}

                {analise && analise.ranking.length > 0 && <RankingAcoes acoes={analise.ranking} />}

                {contaSaude && (
                  <ContaHealthBar
                    score={contaSaude.scoreGlobal} emRisco={contaSaude.emRisco}
                    total={contaSaude.total} gastoEmRisco={contaSaude.gastoEmRisco}
                    onFiltrarRisco={() => setFiltroCritico(f => !f)} filtrando={filtroCritico}
                  />
                )}

                {contaSaude && (
                  <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
                    <OverviewCard label="Investimento total" value={`R$ ${contaSaude.totalInvest.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} sub="período selecionado" icon={DollarSign} />
                    <OverviewCard label="Total de leads" value={contaSaude.totalResultado.toLocaleString("pt-BR")} sub={`em ${contaSaude.total} campanha${contaSaude.total !== 1 ? "s" : ""}`} icon={Users} highlight />
                    <OverviewCard label="CPL médio" value={contaSaude.cplMedio > 0 ? `R$ ${contaSaude.cplMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"} sub="custo por resultado" icon={TrendingUp} />
                    <OverviewCard label="ROAS médio" value={health.roasMedio > 0 ? `${health.roasMedio.toFixed(2)}×` : "—"} sub="retorno sobre invest." icon={ArrowUpRight} />
                  </div>
                )}

                <div className="relative mb-5">
                  <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                </div>

                <div className="flex items-center gap-1 bg-[#0f0f11] border border-white/[0.05] p-1 rounded-xl w-fit mb-5">
                  <button onClick={() => setAbaAtiva("campanhas")}
                    className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${abaAtiva === "campanhas" ? "bg-white/[0.07] text-white" : "text-white/25 hover:text-white/50"}`}>
                    Campanhas
                    {porPeriodo.length > 0 && <span className="ml-1.5 text-[9px] text-white/20">{porPeriodo.length}</span>}
                  </button>
                  <button onClick={() => setAbaAtiva("decisoes")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${abaAtiva === "decisoes" ? "bg-white/[0.07] text-white" : "text-white/25 hover:text-white/50"}`}>
                    <History size={12} /> Decisões
                    {decisoes.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 text-[9px] font-bold flex items-center justify-center">
                        {decisoes.length > 9 ? "9+" : decisoes.length}
                      </span>
                    )}
                  </button>
                  <button onClick={() => setAbaAtiva("objetivos")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${abaAtiva === "objetivos" ? "bg-white/[0.07] text-white" : "text-white/25 hover:text-white/50"}`}>
                    <Target size={12} /> Por Objetivo
                  </button>
                  <button onClick={() => setAbaAtiva("funil")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${abaAtiva === "funil" ? "bg-white/[0.07] text-white" : "text-white/25 hover:text-white/50"}`}>
                    <Activity size={12} /> Funil
                  </button>
                </div>

                {abaAtiva === "decisoes" ? (
                  <PainelDecisoes decisoes={decisoes} campanhas={todasEnriquecidas} />
                ) : abaAtiva === "objetivos" ? (
                  <PainelPorObjetivo campanhas={campanhasFiltradas} health={health} onDecisao={registrarDecisao} />
                ) : abaAtiva === "funil" ? (
                  <div className="space-y-4">
                    {campanhasFiltradas.length === 0 ? (
                      <EmptyState periodo={periodo} filtrando={filtroCritico} onLimpar={() => setFiltroCritico(false)} />
                    ) : (
                      campanhasFiltradas.map(c => (
                        <div key={c.id} className="rounded-2xl border border-white/[0.06] bg-[#0d0d10] p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[12px] font-semibold text-white truncate">{c.nome_campanha}</span>
                            <span className="text-[10px] text-white/25 shrink-0">R$ {fmtBRL0(c.gasto_total)} investidos</span>
                          </div>
                          <FunnelPanel campanha={c} gasto={c.gasto_total} />
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                      <div className="flex items-center gap-1 bg-[#0f0f11] border border-white/[0.05] p-1 rounded-xl w-fit">
                        {PERIODOS.map(p => (
                          <button key={p.id} onClick={() => setPeriodo(p.id)}
                            className={`px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all ${periodo === p.id ? "bg-white/[0.07] text-white" : "text-white/25 hover:text-white/50"}`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] text-white/20 shrink-0">Ordenar</p>
                        <div className="flex items-center gap-1 bg-[#0f0f11] border border-white/[0.05] p-1 rounded-xl">
                          {ORDENS.map(o => (
                            <button key={o.id} onClick={() => setOrdem(o.id)}
                              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${ordem === o.id ? "bg-white/[0.07] text-white" : "text-white/25 hover:text-white/50"}`}>
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {campanhasFiltradas.length === 0 ? (
                      <EmptyState periodo={periodo} filtrando={filtroCritico} onLimpar={() => setFiltroCritico(false)} />
                    ) : (
                      <div className="space-y-3">
                        {campanhasFiltradas.map((c, i) => (
                          <CampanhaCard
                            key={c.id} c={c} rank={i + 1} delay={i * 60}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            flags={(health.flagsPorCampanha[c.id] ?? []) as any}
                            scores={health.scoresPorCampanha[c.id] ?? null}
                            media={health.mediaConta}
                            onDecisao={registrarDecisao}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            </> /* fecha bloco Meta Ads */
            )} {/* fecha ternário plataforma */}
          </>
        )}
      </main>
    </div>
  );
}
