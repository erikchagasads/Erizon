"use client";

/**
 * InteligenciaResumo.tsx — v3
 * Recebe health como prop (calculado uma vez no pai — dados.tsx)
 * Não recalcula nada, só renderiza.
 */

import { useState } from "react";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  ChevronRight, Target, DollarSign, ArrowUpRight, Brain, Zap, Gauge, Layers
} from "lucide-react";
import type { HealthResult, RecomendacaoAcao, CampanhaEnriquecidaAlgo } from "@/app/lib/algoritmoErizon";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function HealthRing({ score }: { score: number }) {
  const r = 32, circ = 2 * Math.PI * r, filled = (score / 100) * circ;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x="40" y="45" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontFamily="monospace">{score}</text>
    </svg>
  );
}

function MiniScoreBar({ label, value, icon: Icon, descricao }: {
  label: string; value: number; icon: React.ElementType; descricao?: string;
}) {
  const color     = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-red-500";
  const textColor = value >= 70 ? "text-emerald-400" : value >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-white/25">
          <Icon size={10} /><span className="text-[10px] font-medium uppercase tracking-widest">{label}</span>
        </div>
        <span className={`text-[11px] font-bold font-mono ${textColor}`}>{value}</span>
      </div>
      <div className="h-[2px] rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
      {descricao && <p className="text-[10px] text-white/15">{descricao}</p>}
    </div>
  );
}

function StatMini({ label, value, color = "text-white", icon: Icon, sub }: {
  label: string; value: string; color?: string; icon?: React.ElementType; sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-white/25">
        {Icon && <Icon size={11} />}
        <span className="text-[10px] font-medium uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-lg font-black font-mono tracking-tight ${color}`}>{value}</span>
      {sub && <span className="text-[10px] text-white/20">{sub}</span>}
    </div>
  );
}

function ProjecaoCard({ tipo, receita, lucro, descricao }: {
  tipo: "risco" | "ganho"; receita: number; lucro: number; descricao: string;
}) {
  const isRisco = tipo === "risco";
  const s = isRisco
    ? { border: "border-red-500/15", bg: "bg-red-500/[0.04]", text: "text-red-400", sub: "text-red-400/60", icon: TrendingDown }
    : { border: "border-emerald-500/15", bg: "bg-emerald-500/[0.04]", text: "text-emerald-400", sub: "text-emerald-400/60", icon: TrendingUp };
  const Icon = s.icon;
  const sinal = isRisco ? "−" : "+";
  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl border ${s.border} ${s.bg}`}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-black/20">
        <Icon size={16} className={s.text} />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className={`text-[18px] font-black font-mono ${s.text}`}>{sinal}R${fmtBRL(receita)}</p>
          {lucro > 0 && <span className={`text-[11px] font-semibold ${s.sub}`}>{sinal}R${fmtBRL(lucro)} lucro líq.</span>}
        </div>
        <p className="text-[11px] text-white/30 mt-0.5">{descricao}</p>
      </div>
    </div>
  );
}

const REC_S: Record<RecomendacaoAcao["tipo"], { border: string; bg: string; icon: string; badge: string }> = {
  pausar:      { border: "border-red-500/15",    bg: "bg-red-500/[0.04]",     icon: "text-red-400",     badge: "bg-red-500/15 text-red-400"     },
  escalar:     { border: "border-emerald-500/15",bg: "bg-emerald-500/[0.04]", icon: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400" },
  criativo:    { border: "border-amber-500/15",  bg: "bg-amber-500/[0.04]",   icon: "text-amber-400",   badge: "bg-amber-500/15 text-amber-400"   },
  budget:      { border: "border-amber-500/15",  bg: "bg-amber-500/[0.04]",   icon: "text-amber-400",   badge: "bg-amber-500/15 text-amber-400"   },
  segmentacao: { border: "border-purple-500/15", bg: "bg-purple-500/[0.04]",  icon: "text-purple-400",  badge: "bg-purple-500/15 text-purple-400"  },
};
const REC_ICON: Record<RecomendacaoAcao["tipo"], React.ElementType> = {
  pausar: AlertTriangle, escalar: TrendingUp, criativo: Zap, budget: DollarSign, segmentacao: Target,
};

function RecCard({ rec }: { rec: RecomendacaoAcao }) {
  const s = REC_S[rec.tipo], Icon = REC_ICON[rec.tipo];
  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl border ${s.border} ${s.bg}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-black/20 ${s.icon}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${s.badge}`}>#{rec.prioridade}</span>
          <span className="text-[13px] font-semibold text-white">{rec.acao}</span>
        </div>
        <p className="text-[11px] text-white/30 truncate">{rec.campanha}</p>
        <p className={`text-[11px] font-medium mt-1 ${s.icon}`}>{rec.impacto}</p>
        {rec.lucroPotencial > 0 && (
          <p className="text-[10px] text-white/20 mt-0.5">Lucro líq.: <span className={`font-semibold ${s.icon}`}>+R${fmtBRL(rec.lucroPotencial)}</span></p>
        )}
      </div>
    </div>
  );
}

export default function InteligenciaResumo({ health }: { health: HealthResult }) {
  const [expandido, setExpandido] = useState(true);
  if (health.enriched.length === 0) return null;

  const ceMedia   = Math.round(health.enriched.reduce((s: number, c: CampanhaEnriquecidaAlgo) => s + c.scores.creativeEfficiency, 0) / health.enriched.length);
  const satMedia  = Math.round(health.enriched.reduce((s: number, c: CampanhaEnriquecidaAlgo) => s + c.scores.saturacaoReal,      0) / health.enriched.length);
  const alavMedia = Math.round(health.enriched.reduce((s: number, c: CampanhaEnriquecidaAlgo) => s + c.scores.alavancagem,        0) / health.enriched.length);
  const lucroTotal = health.enriched.reduce((s: number, c: CampanhaEnriquecidaAlgo) => s + c.lucro, 0);
  const margemPct  = (health.margemMedia * 100).toFixed(1);

  return (
    <div className="mb-5 bg-[#0d0d10] border border-white/[0.07] rounded-[28px] overflow-hidden">
      <button onClick={() => setExpandido(e => !e)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Brain size={15} className="text-purple-400" />
          </div>
          <div className="text-left">
            <p className="text-[13px] font-bold text-white">Inteligência Erizon</p>
            <p className="text-[11px] text-white/25">
              Radar estratégico · {health.enriched.length} campanhas · margem{" "}
              <span className={parseFloat(margemPct) >= 20 ? "text-emerald-400" : "text-amber-400"}>{margemPct}%</span>
            </p>
          </div>
        </div>
        <ChevronRight size={16} className={`text-white/20 transition-transform duration-300 ${expandido ? "rotate-90" : ""}`} />
      </button>

      {expandido && (
        <div className="px-6 pb-6 space-y-5">
          {/* Score + stats */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-4 shrink-0">
              <HealthRing score={health.score} />
              <div>
                <p className={`text-xl font-black ${health.corLabel}`}>{health.label}</p>
                <p className="text-[11px] text-white/25 mt-0.5">Health Score global</p>
              </div>
            </div>
            <div className="h-px sm:h-12 sm:w-px bg-white/[0.06] w-full sm:w-auto shrink-0" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 flex-1">
              <StatMini label="Lucro Total"
                value={lucroTotal >= 0 ? `R$${fmtBRL(lucroTotal)}` : `−R$${fmtBRL(Math.abs(lucroTotal))}`}
                color={lucroTotal >= 0 ? "text-emerald-400" : "text-red-400"}
                icon={DollarSign} sub={`Margem ${margemPct}%`} />
              <StatMini label="ROAS Médio"
                value={health.roasMedio > 0 ? `${health.roasMedio.toFixed(2)}×` : "—"}
                color={health.roasMedio >= 2.5 ? "text-emerald-400" : health.roasMedio >= 1.5 ? "text-white" : "text-red-400"}
                icon={TrendingUp} sub="retorno médio" />
              <StatMini label="Em Risco"
                value={`R$${fmtBRL(health.dinheiroEmRisco)}`}
                color={health.dinheiroEmRisco > 0 ? "text-red-400" : "text-emerald-400"}
                icon={health.dinheiroEmRisco > 0 ? TrendingDown : CheckCircle2}
                sub={`${health.campanhasProblema} campanha${health.campanhasProblema !== 1 ? "s" : ""}`} />
              <StatMini label="Potencial Escala"
                value={`+R$${fmtBRL(health.oportunidadeEscala)}`}
                color={health.oportunidadeEscala > 0 ? "text-emerald-400" : "text-white/25"}
                icon={ArrowUpRight}
                sub={`${health.campanhasEscala} campanha${health.campanhasEscala !== 1 ? "s" : ""}`} />
            </div>
          </div>

          {/* Projeções 7d */}
          {(health.perdaProjetada7d > 10 || health.ganhoProjetado7d > 10) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20 mb-3">Projeção financeira · 7 dias</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {health.perdaProjetada7d > 10 && <ProjecaoCard tipo="risco" receita={health.perdaProjetada7d} lucro={health.lucroPerda7d} descricao="Perda projetada se campanhas críticas continuarem" />}
                {health.ganhoProjetado7d > 10 && <ProjecaoCard tipo="ganho" receita={health.ganhoProjetado7d} lucro={health.lucroPotencial7d} descricao="Receita adicional escalando campanhas prontas" />}
              </div>
            </div>
          )}

          {/* Mini Scores */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20 mb-4">Índices proprietários · média da conta</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MiniScoreBar label="Creative Efficiency" value={ceMedia}   icon={Zap}    descricao="CTR × frequência × dias ativos" />
              <MiniScoreBar label="Saturação Audiência"  value={satMedia}  icon={Gauge}  descricao="frequência + tempo + CTR" />
              <MiniScoreBar label="Alavancagem Média"    value={alavMedia} icon={Layers} descricao="headroom antes do ROAS quebrar" />
            </div>
          </div>

          {/* Recomendações */}
          {health.recomendacoes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20 mb-3">
                Top {health.recomendacoes.length} ações · ordenadas por impacto financeiro
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {health.recomendacoes.map((rec: RecomendacaoAcao, i: number) => <RecCard key={i} rec={rec} />)}
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="flex flex-wrap items-center gap-5 pt-1 border-t border-white/[0.04]">
            <span className="text-[11px] text-white/20">CPL médio: <span className="text-white/40 font-semibold">{health.mediaConta.cpl > 0 ? `R$${fmtBRL(health.mediaConta.cpl)}` : "—"}</span></span>
            <span className="text-[11px] text-white/20">Freq. média: <span className="text-white/40 font-semibold">{health.mediaConta.freq > 0 ? `${health.mediaConta.freq.toFixed(1)}×` : "—"}</span></span>
            <span className="text-[11px] text-white/20">CPM médio: <span className="text-white/40 font-semibold">{health.mediaConta.cpm > 0 ? `R$${fmtBRL(health.mediaConta.cpm)}` : "—"}</span></span>
            {health.campanhasEscala > 0 && <span className="text-[11px] text-emerald-400/60"><span className="text-emerald-400 font-semibold">{health.campanhasEscala}</span> prontas para escalar</span>}
            {health.campanhasProblema > 0 && <span className="text-[11px] text-red-400/60"><span className="text-red-400 font-semibold">{health.campanhasProblema}</span> com score crítico</span>}
            {health.campanhasDegradando > 0 && <span className="text-[11px] text-amber-400/60"><span className="text-amber-400 font-semibold">{health.campanhasDegradando}</span> com tendência negativa</span>}
          </div>
        </div>
      )}
    </div>
  );
}
