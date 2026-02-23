"use client";

/**
 * RadarOperacional.tsx — v2.1
 *
 * Fix v2.1:
 *   - mostrarBanner só ativa se score < 60 (conta realmente em risco)
 *   - Evita banner vermelho pulsando em conta com score 90
 */

import type { HealthResult, UrgenciaNivel, CampanhaEnriquecidaAlgo, RadarItem } from "@/app/lib/algoritmoErizon";
import { AlertTriangle, TrendingUp, Gauge, CheckCircle2, Clock, TrendingDown, Zap } from "lucide-react";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const URGENCIA_CFG: Record<UrgenciaNivel, {
  border: string; bg: string; glow: string;
  badge: string; badgeLabel: string;
  icon: React.ElementType; iconColor: string;
  titulo: string;
}> = {
  critico: {
    border: "border-red-500/25", bg: "bg-red-500/[0.06]",
    glow: "shadow-[0_0_30px_rgba(239,68,68,0.08)]",
    badge: "bg-red-500 text-white", badgeLabel: "🚨 AÇÃO IMEDIATA",
    icon: AlertTriangle, iconColor: "text-red-400", titulo: "Operação em risco",
  },
  atencao: {
    border: "border-amber-500/20", bg: "bg-amber-500/[0.04]",
    glow: "",
    badge: "bg-amber-500/20 text-amber-300", badgeLabel: "⚠️ ATENÇÃO",
    icon: Gauge, iconColor: "text-amber-400", titulo: "Requer atenção",
  },
  oportunidade: {
    border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.06)]",
    badge: "bg-emerald-500/20 text-emerald-300", badgeLabel: "🚀 OPORTUNIDADE",
    icon: TrendingUp, iconColor: "text-emerald-400", titulo: "Pronto para escalar",
  },
  estavel: {
    border: "border-white/[0.06]", bg: "bg-white/[0.02]",
    glow: "",
    badge: "bg-white/10 text-white/50", badgeLabel: "✓ ESTÁVEL",
    icon: CheckCircle2, iconColor: "text-white/40", titulo: "Operação estável",
  },
};

// ── Linha do radar ────────────────────────────────────────────────────────────
function RadarLinha({ tipo, mensagem, valorEmJogo }: {
  tipo: "escala" | "critico" | "saturacao"; mensagem: string; valorEmJogo: number;
}) {
  const s = {
    escala:    { dot: "bg-emerald-500", text: "text-emerald-400", valor: "text-emerald-400", prefix: "+" },
    critico:   { dot: "bg-red-500",     text: "text-red-400",     valor: "text-red-400",     prefix: "−" },
    saturacao: { dot: "bg-amber-500",   text: "text-amber-400",   valor: "text-amber-400",   prefix: "~" },
  }[tipo];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
      <span className={`text-[13px] font-semibold flex-1 ${s.text}`}>{mensagem}</span>
      {valorEmJogo > 0 && (
        <span className={`text-[12px] font-bold font-mono ${s.valor} shrink-0`}>
          {s.prefix}R${fmtBRL(valorEmJogo)}
        </span>
      )}
    </div>
  );
}

// ── Projeção comparativa ──────────────────────────────────────────────────────
function ProjecaoItem({ label, valor72h, valor7d, cor }: {
  label: string; valor72h: number; valor7d: number; cor: "red" | "emerald";
}) {
  if (valor72h <= 0 && valor7d <= 0) return null;
  const textColor = cor === "red" ? "text-red-400" : "text-emerald-400";
  const sinal     = cor === "red" ? "−" : "+";
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] text-white/25 uppercase tracking-widest">{label}</p>
      <div className="flex flex-col gap-0.5">
        {valor72h > 0 && (
          <div className="flex items-baseline gap-1.5">
            <span className={`text-[15px] font-black font-mono ${textColor}`}>{sinal}R${fmtBRL(valor72h)}</span>
            <span className="text-[10px] text-white/20">72h</span>
          </div>
        )}
        {valor7d > 0 && (
          <div className="flex items-baseline gap-1.5">
            <span className={`text-[12px] font-bold font-mono ${textColor} opacity-50`}>{sinal}R${fmtBRL(valor7d)}</span>
            <span className="text-[10px] text-white/15">7 dias</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function RadarOperacional({ health }: { health: HealthResult }) {
  const cfg  = URGENCIA_CFG[health.urgenciaGlobal];
  const Icon = cfg.icon;

  if (health.enriched.length === 0) return null;

  const campanhaCritica = health.enriched
    .filter((c: CampanhaEnriquecidaAlgo) => c.scores.urgencia === "critico")
    .sort((a: CampanhaEnriquecidaAlgo, b: CampanhaEnriquecidaAlgo) => b.scores.indicePrioridade - a.scores.indicePrioridade)[0];

  const campanhasDegradando = health.enriched.filter(
    (c: CampanhaEnriquecidaAlgo) => c.scores.degradacao.tendencia === "piorando_rapido" || c.scores.degradacao.tendencia === "piorando"
  );

  // ── FIX v2.1: banner vermelho só quando conta realmente está em risco ──
  // score < 60 garante que não aparece em contas com score 70, 80, 90
  const mostrarBanner = health.urgenciaGlobal === "critico" && campanhaCritica && health.score < 60;

  return (
    <div className={`mb-5 rounded-[24px] border ${cfg.border} ${cfg.bg} ${cfg.glow} overflow-hidden`}>

      {/* ── Resumo em 1 frase ── */}
      <div className="px-6 pt-5 pb-0">
        <p className="text-[13px] text-white/50 leading-relaxed font-medium">
          {health.resumoFrase}
        </p>
      </div>

      {/* ── Banner de urgência crítica — só aparece se score < 60 ── */}
      {mostrarBanner && (
        <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/15 rounded-xl">
          <AlertTriangle size={14} className="text-red-400 shrink-0 animate-pulse" />
          <p className="text-[12px] font-semibold text-red-300 flex-1">
            <span className="text-red-400">{campanhaCritica.nome_campanha}</span>
            {" — "}
            {campanhaCritica.leads === 0
              ? `R$${fmtBRL(campanhaCritica.gasto)} investidos sem nenhum resultado`
              : `operando no prejuízo · ROAS ${campanhaCritica.roas.toFixed(2)}×`}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-red-400/60 shrink-0">
            <Clock size={11} />
            <span>Cada hora conta</span>
          </div>
        </div>
      )}

      {/* ── Banner de degradação rápida (se não crítico) ── */}
      {!mostrarBanner && campanhasDegradando.length > 0 && campanhasDegradando[0].scores.degradacao.temDados && (
        <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 bg-amber-500/[0.08] border border-amber-500/15 rounded-xl">
          <Zap size={14} className="text-amber-400 shrink-0" />
          <p className="text-[12px] font-semibold text-amber-300 flex-1">
            {campanhasDegradando.length > 1
              ? `${campanhasDegradando.length} campanhas com tendência negativa esta semana`
              : `${campanhasDegradando[0].nome_campanha} — performance deteriorando`}
          </p>
        </div>
      )}

      {/* ── Corpo do radar ── */}
      <div className="flex flex-col lg:flex-row gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.05] mt-4">

        {/* Status global */}
        <div className="flex items-center gap-4 px-6 py-5 lg:min-w-[220px] lg:shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-black/20 ${cfg.iconColor}`}>
            <Icon size={18} />
          </div>
          <div>
            <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase mb-1.5 ${cfg.badge}`}>
              {cfg.badgeLabel}
            </div>
            <p className="text-[13px] font-bold text-white">{cfg.titulo}</p>
            <p className="text-[11px] text-white/25">{health.enriched.length} campanhas</p>
          </div>
        </div>

        {/* Radar de campanhas */}
        <div className="flex-1 px-6 py-5">
          {health.radar.length > 0 ? (
            health.radar.map((item: RadarItem, i: number) => (
              <RadarLinha key={i} tipo={item.tipo} mensagem={item.mensagem} valorEmJogo={item.valorEmJogo} />
            ))
          ) : (
            <div className="flex items-center gap-2 py-2">
              <CheckCircle2 size={14} className="text-emerald-400/60" />
              <span className="text-[13px] text-white/30">Todas as campanhas dentro dos parâmetros</span>
            </div>
          )}
        </div>

        {/* Projeções 72h + 7d */}
        <div className="flex flex-col justify-center gap-4 px-6 py-5 lg:min-w-[220px] lg:shrink-0">
          <ProjecaoItem
            label="Lucro em risco"
            valor72h={health.projecao72h.lucroEmRisco72h}
            valor7d={health.lucroPerda7d}
            cor="red"
          />
          <ProjecaoItem
            label="Lucro potencial"
            valor72h={health.projecao72h.lucroPotencial72h}
            valor7d={health.lucroPotencial7d}
            cor="emerald"
          />
          {health.projecao72h.lucroEmRisco72h === 0 && health.projecao72h.lucroPotencial72h === 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-white/25 uppercase tracking-widest">Margem média</span>
              <span className="text-[15px] font-black font-mono text-white">
                {(health.margemMedia * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}