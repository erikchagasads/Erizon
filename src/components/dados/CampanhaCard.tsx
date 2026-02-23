"use client";

// src/components/dados/CampanhaCard.tsx
// Card de campanha individual + todos os sub-componentes visuais:
// ScoreRing, CTAButton, FlagBadge, NarrativaCard, UrgenciaBadge,
// AlertaChip, DeltaVsConta, OverviewCard, ContaHealthBar, EmptyState, PageSkeleton

import { useState, useEffect } from "react";
import {
  ChevronRight, CheckCircle2, Loader2, AlertCircle, ShieldAlert,
  ArrowUpRight, ArrowDownRight, Zap, Target, History, DollarSign,
} from "lucide-react";
import ModalSimulacaoEscala from "@/components/ModalSimulacaoEscala";
import type {
  CampanhaEnriquecida, CTA, Alerta, ScoreBadge, Periodo,
} from "@/app/dados/types";
import type { Flag, ScoresAvancados, MediaConta } from "@/app/lib/algoritmoErizon";
import { formatBRL, fmtBRL0 } from "@/app/dados/engine";

// ─── ScoreRing ────────────────────────────────────────────────────────────────
export function ScoreRing({ score, badge }: { score: number; badge: ScoreBadge }) {
  const r = 28, circ = 2 * Math.PI * r, filled = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 shrink-0">
      <svg
        width="72" height="72" viewBox="0 0 72 72"
        style={badge.glow ? { filter: `drop-shadow(0 0 6px ${badge.textRing}26)` } : undefined}
      >
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={badge.textRing} strokeWidth="4"
          strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={circ / 4} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
        <text x="36" y="40" textAnchor="middle" fill="white" fontSize="16" fontWeight="800" fontFamily="monospace">
          {score}
        </text>
      </svg>
      <span className={`text-[11px] font-semibold tracking-widest uppercase ${badge.color}`}>{badge.label}</span>
    </div>
  );
}

// ─── DeltaVsConta ─────────────────────────────────────────────────────────────
export function DeltaVsConta({ valor, media, inverso = false }: { valor: number; media: number; inverso?: boolean }) {
  if (media === 0 || valor === 0) return null;
  const delta = ((valor - media) / media) * 100;
  const melhor = inverso ? delta < -10 : delta > 10;
  const pior   = inverso ? delta > 10  : delta < -10;
  if (Math.abs(delta) < 10) return null;
  return (
    <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${melhor ? "text-emerald-400" : pior ? "text-red-400" : "text-white/30"}`}>
      {melhor ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
      {Math.abs(delta).toFixed(0)}% {melhor ? "acima" : "abaixo"}
    </div>
  );
}

// ─── FlagBadge ────────────────────────────────────────────────────────────────
const FLAG_S: Record<Flag["cor"], string> = {
  emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  red:     "bg-red-500/10 border-red-500/20 text-red-400",
  amber:   "bg-amber-500/10 border-amber-500/20 text-amber-400",
  purple:  "bg-purple-500/10 border-purple-500/20 text-purple-400",
};
const FLAG_ICON: Record<Flag["cor"], React.ElementType> = {
  emerald: ArrowUpRight, red: AlertCircle, amber: ShieldAlert, purple: Zap,
};
export function FlagBadge({ flag }: { flag: Flag }) {
  const Icon = FLAG_ICON[flag.cor];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${FLAG_S[flag.cor]}`}
      title={flag.descricao}
    >
      <Icon size={10} />{flag.label}
    </span>
  );
}

// ─── NarrativaCard ────────────────────────────────────────────────────────────
const NAR_S: Record<ScoresAvancados["narrativaTipo"], { border: string; bg: string; text: string }> = {
  sucesso: { border: "border-emerald-500/10", bg: "bg-emerald-500/[0.03]", text: "text-emerald-400/80" },
  atencao: { border: "border-amber-500/10",   bg: "bg-amber-500/[0.03]",   text: "text-amber-400/80"   },
  risco:   { border: "border-red-500/10",     bg: "bg-red-500/[0.03]",     text: "text-red-400/80"     },
  neutro:  { border: "border-white/[0.05]",   bg: "bg-white/[0.02]",       text: "text-white/40"       },
};
export function NarrativaCard({ scores }: { scores: ScoresAvancados }) {
  const s = NAR_S[scores.narrativaTipo];
  return (
    <div className={`px-4 py-3 rounded-xl border ${s.border} ${s.bg} mb-4`}>
      <p className={`text-[12px] leading-relaxed ${s.text}`}>{scores.narrativa}</p>
    </div>
  );
}

// ─── UrgenciaBadge ────────────────────────────────────────────────────────────
export function UrgenciaBadge({ urgencia, label }: { urgencia: string; label: string }) {
  const s: Record<string, string> = {
    critico:      "bg-red-500/15 text-red-400 border-red-500/20",
    atencao:      "bg-amber-500/15 text-amber-400 border-amber-500/20",
    oportunidade: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    estavel:      "bg-white/5 text-white/30 border-white/10",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-widest ${s[urgencia] ?? s.estavel}`}>
      {label}
    </span>
  );
}

// ─── AlertaChip ───────────────────────────────────────────────────────────────
export function AlertaChip({ alerta }: { alerta: Alerta }) {
  const s = {
    danger:  "bg-red-500/[0.06] text-red-400/70 border-red-500/[0.08]",
    warning: "bg-amber-500/[0.06] text-amber-400/70 border-amber-500/[0.08]",
    success: "bg-emerald-500/[0.06] text-emerald-400/70 border-emerald-500/[0.08]",
  }[alerta.tipo];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-medium ${s}`}>
      {alerta.texto}
    </span>
  );
}

// ─── CTAButton ────────────────────────────────────────────────────────────────
export function CTAButton({ cta, campanha, scoreAntes, onDecisao }: {
  cta: CTA;
  campanha: CampanhaEnriquecida;
  scoreAntes: number;
  onDecisao: (id: string, acao: string, impacto: string, extra?: { lucro?: number; margem?: number }) => Promise<void>;
}) {
  const [estado, setEstado] = useState<"idle" | "loading" | "done">("idle");
  const [modalAberto, setModalAberto] = useState(false);

  if (cta.acao === "escalar") {
    return (
      <>
        <button
          onClick={() => setModalAberto(true)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-medium transition-all ${cta.color}`}
        >
          <ChevronRight size={12} />{cta.label}
        </button>
        {modalAberto && (
          <ModalSimulacaoEscala
            campanha={{
              ...campanha,
              nome_campanha: campanha.nome_campanha,
              gasto_total: campanha.gasto_total,
              contatos: campanha.contatos,
              score: scoreAntes,
            }}
            onConfirmar={async () => {
              await onDecisao(
                campanha.id, cta.label,
                `Escala de 20% confirmada após simulação — Score: ${scoreAntes}`,
                { lucro: campanha.m.lucro, margem: campanha.m.margem }
              );
            }}
            onFechar={() => setModalAberto(false)}
          />
        )}
      </>
    );
  }

  async function handleClick() {
    if (estado !== "idle") return;
    setEstado("loading");
    const impacto = cta.acao === "pausar"
      ? `Pausa solicitada — Score: ${scoreAntes}`
      : `Revisão: ${cta.label}`;
    await onDecisao(campanha.id, cta.label, impacto, { lucro: campanha.m.lucro, margem: campanha.m.margem });
    setEstado("done");
    setTimeout(() => setEstado("idle"), 3000);
  }

  if (estado === "done") {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-emerald-400">
        <CheckCircle2 size={12} /> Registrado
      </span>
    );
  }
  return (
    <button
      onClick={handleClick}
      disabled={estado === "loading"}
      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-medium transition-all disabled:opacity-60 ${cta.color}`}
    >
      {estado === "loading" ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
      {estado === "loading" ? "Registrando..." : cta.label}
    </button>
  );
}

// ─── OverviewCard ─────────────────────────────────────────────────────────────
export function OverviewCard({ label, value, sub, icon: Icon, highlight }: {
  label: string; value: string; sub?: string; icon: React.ElementType; highlight?: boolean;
}) {
  return (
    <div className={`p-5 rounded-2xl border flex flex-col justify-between min-h-[96px] ${highlight ? "bg-sky-500/[0.04] border-sky-500/[0.12]" : "bg-[#0f0f11] border-white/[0.05]"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-medium text-white/25">{label}</p>
        <Icon size={13} className={highlight ? "text-sky-500/30" : "text-white/10"} />
      </div>
      <div>
        <p className={`text-xl font-black tracking-tight leading-none font-mono ${highlight ? "text-sky-300" : "text-white"}`}>{value}</p>
        {sub && <p className="text-[12px] text-white/20 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── ContaHealthBar ───────────────────────────────────────────────────────────
export function ContaHealthBar({ score, emRisco, total, gastoEmRisco, onFiltrarRisco, filtrando }: {
  score: number; emRisco: number; total: number;
  gastoEmRisco: number; onFiltrarRisco: () => void; filtrando: boolean;
}) {
  const [animado, setAnimado] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimado(true), 120); return () => clearTimeout(t); }, []);
  const color     = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const label     = score >= 75 ? "Saudável" : score >= 50 ? "Atenção" : "Crítico";

  return (
    <div className="p-6 rounded-2xl bg-[#0f0f11] border border-white/[0.05] mb-5">
      <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-medium text-white/25 mb-2">Saúde da conta</p>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black tracking-tight font-mono ${textColor}`}>{score}</span>
            <span className="text-sm text-white/20">/100</span>
            <span className={`text-[13px] font-semibold ${textColor}`}>{label}</span>
          </div>
        </div>
        {emRisco > 0 && (
          <button
            onClick={onFiltrarRisco}
            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left ${filtrando ? "bg-red-500/10 border-red-500/25" : "bg-red-500/[0.05] border-red-500/15 hover:bg-red-500/10 hover:border-red-500/25"}`}
          >
            <ShieldAlert size={15} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-red-400">R$ {formatBRL(gastoEmRisco)} em risco</p>
              <p className="text-[11px] text-red-400/50 mt-0.5">
                {emRisco} de {total} campanha{emRisco !== 1 ? "s" : ""} com score crítico
                {filtrando ? " · ver todas" : " · filtrar"}
              </p>
            </div>
          </button>
        )}
      </div>
      <div className="h-[3px] rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: animado ? `${score}%` : "0%" }}
        />
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ periodo, filtrando, onLimpar }: { periodo: Periodo; filtrando: boolean; onLimpar: () => void }) {
  const labels: Record<Periodo, string> = {
    hoje: "hoje", "7d": "nos últimos 7 dias", "30d": "nos últimos 30 dias", mes: "este mês",
  };
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
        <Target size={16} className="text-white/15" />
      </div>
      {filtrando ? (
        <>
          <p className="text-[14px] font-medium text-white/25 mb-1">Nenhuma campanha crítica.</p>
          <button onClick={onLimpar} className="text-[12px] text-purple-400/60 hover:text-purple-400 transition-colors mt-2">Ver todas</button>
        </>
      ) : (
        <>
          <p className="text-[14px] font-medium text-white/25 mb-1">Nenhuma campanha ativa {labels[periodo]}.</p>
          <p className="text-[12px] text-white/15">Ajuste o período ou sincronize.</p>
        </>
      )}
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.04] ${className ?? ""}`} />;
}
export function PageSkeleton() {
  return (
    <>
      <Skeleton className="h-[80px] mb-4 rounded-[24px]" />
      <Skeleton className="h-[140px] mb-4 rounded-[28px]" />
      <Skeleton className="h-[104px] mb-5" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-[24px]" />)}
      </div>
    </>
  );
}

// ─── CampanhaCard (principal) ─────────────────────────────────────────────────
interface CampanhaCardProps {
  c: CampanhaEnriquecida;
  rank: number;
  delay?: number;
  flags: Flag[];
  scores: ScoresAvancados | null;
  media: MediaConta | null;
  onDecisao: (id: string, acao: string, impacto: string, extra?: { lucro?: number; margem?: number }) => Promise<void>;
}

export default function CampanhaCard({ c, rank, delay = 0, onDecisao, flags, scores, media }: CampanhaCardProps) {
  const { m } = c;
  const [visivel, setVisivel] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisivel(true), delay); return () => clearTimeout(t); }, [delay]);

  const ctrColor   = m.ctr >= 2.5 ? "text-emerald-400" : m.ctr >= 1 ? "text-white/70" : m.ctr > 0 ? "text-red-400" : "text-white/25";
  const cplColor   = m.cpl === 0 ? "text-white/25" : m.cpl < 20 ? "text-emerald-400" : m.cpl < 50 ? "text-white/70" : "text-red-400";
  const leadsColor = m.resultado === 0 ? "text-white/25" : m.resultado >= 50 ? "text-sky-400" : m.resultado >= 10 ? "text-white/70" : "text-amber-400";
  const freqColor  = m.freq > 3.5 ? "text-red-400" : m.freq > 2.5 ? "text-amber-400" : m.freq > 0 ? "text-white/70" : "text-white/25";
  const cpmColor   = m.cpm > 50 ? "text-red-400" : m.cpm > 20 ? "text-amber-400" : m.cpm > 0 ? "text-white/70" : "text-white/25";
  const lucroColor  = m.lucro >= 0 ? "text-emerald-400" : "text-red-400";
  const margemColor = m.margem >= 0.3 ? "text-emerald-400" : m.margem >= 0 ? "text-white/60" : "text-red-400";

  const temRisco  = flags.some(f => f.cor === "red");
  const temEscala = flags.some(f => f.tipo === "escala");
  const border    = temRisco
    ? "border-red-500/[0.12] hover:border-red-500/25"
    : temEscala
    ? "border-emerald-500/[0.12] hover:border-emerald-500/25"
    : "border-white/[0.05] hover:border-purple-500/[0.15]";

  return (
    <div
      className={`group bg-[#111113] border ${border} rounded-[24px] p-6 transition-colors duration-200`}
      style={{
        opacity: visivel ? 1 : 0,
        transform: visivel ? "translateY(0)" : "translateY(6px)",
        transition: `opacity 0.35s ease ${delay}ms, transform 0.35s ease ${delay}ms, border-color 0.2s`,
      }}
    >
      <div className="flex items-start gap-5">
        <ScoreRing score={m.score} badge={m.scoreBadge} />
        <div className="flex-1 min-w-0">

          {/* Nome + CTA + Urgência */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[11px] text-white/15 font-mono">#{rank}</span>
                <h3 className="text-[16px] font-medium text-white leading-tight">{c.nome_campanha}</h3>
                {scores && <UrgenciaBadge urgencia={scores.urgencia} label={scores.urgenciaLabel} />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-400">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" /> Ativa
                </span>
                {c.orcamento > 0 && (
                  <span className="text-[12px] text-white/20 font-mono">· Budget R$ {formatBRL(c.orcamento)}</span>
                )}
              </div>
            </div>
            {m.cta && (
              <div style={{ opacity: visivel ? 1 : 0, transition: `opacity 0.5s ease ${delay + 150}ms` }}>
                <CTAButton cta={m.cta} campanha={c} scoreAntes={m.score} onDecisao={onDecisao} />
              </div>
            )}
          </div>

          {/* Narrativa */}
          {scores && <NarrativaCard scores={scores} />}

          {/* Métricas principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-1">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-white/20">Investimento</p>
              <p className="text-[14px] font-bold font-mono text-white/70">R$ {formatBRL(m.investimento)}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-white/20">Leads</p>
              <p className={`text-[14px] font-bold font-mono ${leadsColor}`}>
                {m.resultado > 0 ? m.resultado.toLocaleString("pt-BR") : "—"}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-white/20">CPL</p>
              <p className={`text-[14px] font-bold font-mono ${cplColor}`}>{m.cpl > 0 ? `R$ ${formatBRL(m.cpl)}` : "—"}</p>
              {media && <DeltaVsConta valor={m.cpl} media={media.cpl} inverso />}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-white/20">
                CTR{!m.ctrReal && <span className="text-[9px] text-white/15 ml-1">(sem dado)</span>}
              </p>
              <p className={`text-[14px] font-bold font-mono ${ctrColor}`}>{m.ctr > 0 ? `${m.ctr.toFixed(2)}%` : "—"}</p>
              {media && m.ctrReal && <DeltaVsConta valor={m.ctr} media={media.ctr} />}
            </div>
          </div>

          {/* Métricas avançadas */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4 pt-3 border-t border-white/[0.04]">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-white/20">Lucro est.</p>
              <p className={`text-[13px] font-bold font-mono ${lucroColor}`}>
                {m.lucro >= 0 ? `R$${fmtBRL0(m.lucro)}` : `−R$${fmtBRL0(Math.abs(m.lucro))}`}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-white/20">Margem</p>
              <p className={`text-[13px] font-bold font-mono ${margemColor}`}>
                {m.margem !== 0 ? `${(m.margem * 100).toFixed(1)}%` : "—"}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-white/20">Freq.</p>
              <p className={`text-[13px] font-bold font-mono ${freqColor}`}>{m.freq > 0 ? m.freq.toFixed(2) : "—"}</p>
              {media && <DeltaVsConta valor={m.freq} media={media.freq} inverso />}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-white/20">CPM</p>
              <p className={`text-[13px] font-bold font-mono ${cpmColor}`}>{m.cpm > 0 ? `R$${fmtBRL0(m.cpm)}` : "—"}</p>
              {media && <DeltaVsConta valor={m.cpm} media={media.cpm} inverso />}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-white/20">Impressões</p>
              <p className="text-[13px] font-bold font-mono text-white/40">
                {c.impressoes > 0 ? `${(c.impressoes / 1000).toFixed(1)}k` : "—"}
              </p>
            </div>
          </div>

          {/* Flags / Alertas */}
          {flags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {flags.map((f, i) => <FlagBadge key={i} flag={f} />)}
            </div>
          )}
          {m.alertas.length > 0 && flags.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {m.alertas.map((a, i) => <AlertaChip key={i} alerta={a} />)}
            </div>
          )}

          {/* Barra orçamento */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-[11px] text-white/15">Orçamento utilizado</p>
              <p className={`text-[11px] font-mono ${m.pctGasto > 85 ? "text-amber-400" : "text-white/20"}`}>
                {m.pctGasto.toFixed(0)}%
              </p>
            </div>
            <div className="h-[2px] rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${m.pctGasto > 85 ? "bg-amber-500/50" : "bg-purple-500/40"}`}
                style={{ width: visivel ? `${m.pctGasto}%` : "0%" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}