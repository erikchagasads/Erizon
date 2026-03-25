"use client";

/**
 * RadarOperacional.tsx — v3.0
 * Reescrito para usar ContaHealth de algoritmoErizon.ts
 * Remove dependência de HealthResult, CampanhaEnriquecidaAlgo, RadarItem
 */

import { useState } from "react";
import type { ContaHealth, UrgenciaNivel } from "@/app/lib/algoritmoErizon";
import { AlertTriangle, TrendingUp, Gauge, CheckCircle2, Clock, Zap } from "lucide-react";

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
  tipo: "escala" | "critico" | "saturacao"; mensagem: string; valorEmJogo: number; key?: string | number;
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

type RadarLinhaItem = { tipo: "escala" | "critico" | "saturacao"; mensagem: string; valorEmJogo: number };

function RadarListaPaginada({ linhas }: { linhas: RadarLinhaItem[] }) {
  const [pagina, setPagina] = useState(0);
  const POR_PAGINA = 6;
  const totalPaginas = Math.ceil(linhas.length / POR_PAGINA);
  const visiveis = linhas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  return (
    <div className="flex-1 px-6 py-5">
      {linhas.length > 0 ? (
        <>
          {visiveis.map((item, i) => (
            <RadarLinha key={pagina * POR_PAGINA + i} tipo={item.tipo} mensagem={item.mensagem} valorEmJogo={item.valorEmJogo} />
          ))}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
              <button
                onClick={() => setPagina(p => Math.max(0, p - 1))}
                disabled={pagina === 0}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-[10px] text-white/20 font-mono">{pagina + 1} / {totalPaginas}</span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
                disabled={pagina === totalPaginas - 1}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 py-2">
          <CheckCircle2 size={14} className="text-emerald-400/60" />
          <span className="text-[13px] text-white/30">Todas as campanhas dentro dos parâmetros</span>
        </div>
      )}
    </div>
  );
}

export default function RadarOperacional({ health }: { health: ContaHealth }) {
  if (!health?.enriched || health.enriched.length === 0) return null;

  // urgenciaGlobal derivada do nivel
  const urgenciaGlobal: UrgenciaNivel =
    health.nivel === "critico"  ? "critico"     :
    health.nivel === "atencao"  ? "atencao"     :
    health.nivel === "saudavel" ? "oportunidade" : "estavel";

  const cfg  = URGENCIA_CFG[urgenciaGlobal];
  const Icon = cfg.icon;

  // Campanha crítica mais pesada
  const campanhaCritica = health.enriched
    .filter(c => c.scores.urgencia === "critico")
    .sort((a, b) => b.gasto - a.gasto)[0];

  // Banner vermelho só quando conta realmente em risco
  const mostrarBanner = urgenciaGlobal === "critico" && campanhaCritica && health.score < 60;

  // Resumo em frase derivado do resumo existente
  const resumoFrase = health.resumo;

  // Gerar linhas de radar a partir dos enriched
  const radarLinhas: Array<{ tipo: "escala" | "critico" | "saturacao"; mensagem: string; valorEmJogo: number }> = [];

  health.enriched.forEach(c => {
    if (c.scores.urgencia === "critico") {
      radarLinhas.push({
        tipo: "critico",
        mensagem: c.leads === 0
          ? `${c.nome_campanha} — sem leads · R$${fmtBRL(c.gasto)} investidos`
          : `${c.nome_campanha} — ROAS ${c.roas.toFixed(2)}× abaixo do mínimo`,
        valorEmJogo: Math.abs(c.lucro),
      });
    } else if (c.scores.urgencia === "oportunidade") {
      radarLinhas.push({
        tipo: "escala",
        mensagem: `${c.nome_campanha} — ROAS ${c.roas.toFixed(2)}× · pronto para escalar`,
        valorEmJogo: c.lucro,
      });
    }
  });

  // Projeções estimadas
  const lucroEmRisco72h  = (health.lucroPerda7d / 7) * 3;
  const lucroPotencial72h = (health.lucroPotencial / 30) * 3;
  const margemMedia = health.mediaConta.margem;

  return (
    <div className={`mb-5 rounded-[24px] border ${cfg.border} ${cfg.bg} ${cfg.glow} overflow-hidden`}>

      {/* ── Resumo em 1 frase ── */}
      <div className="px-6 pt-5 pb-0">
        <p className="text-[13px] text-white/50 leading-relaxed font-medium">
          {resumoFrase}
        </p>
      </div>

      {/* ── Banner de urgência crítica ── */}
      {mostrarBanner && campanhaCritica && (
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

      {/* ── Banner de atenção (se não crítico e há campanhas em atenção) ── */}
      {!mostrarBanner && urgenciaGlobal === "atencao" && (
        <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 bg-amber-500/[0.08] border border-amber-500/15 rounded-xl">
          <Zap size={14} className="text-amber-400 shrink-0" />
          <p className="text-[12px] font-semibold text-amber-300 flex-1">
            {health.criticas > 0
              ? `${health.criticas} campanha${health.criticas !== 1 ? "s" : ""} crítica${health.criticas !== 1 ? "s" : ""} — monitore de perto`
              : "Conta em atenção — acompanhe as métricas"}
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
        <RadarListaPaginada linhas={radarLinhas} />

        {/* Projeções 72h + 7d */}
        <div className="flex flex-col justify-center gap-4 px-6 py-5 lg:min-w-[220px] lg:shrink-0">
          <ProjecaoItem
            label="Lucro em risco"
            valor72h={lucroEmRisco72h}
            valor7d={health.lucroPerda7d}
            cor="red"
          />
          <ProjecaoItem
            label="Lucro potencial"
            valor72h={lucroPotencial72h}
            valor7d={health.lucroPotencial}
            cor="emerald"
          />
          {lucroEmRisco72h === 0 && lucroPotencial72h === 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-white/25 uppercase tracking-widest">Margem média</span>
              <span className="text-[15px] font-black font-mono text-white">
                {(margemMedia * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}