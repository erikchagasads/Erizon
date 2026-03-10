"use client";

// src/components/TipoCampanhaBadge.tsx

import { badgeTipo, resolverTipo, calcMetricasPorTipo } from "@/app/analytics/tipoCampanha";
import type { TipoCampanha } from "@/app/analytics/tipoCampanha";

// ─────────────────────────────────────────────────────────────────────────────
// TipoCampanhaBadge — mostra tipo + métrica principal no card
// ─────────────────────────────────────────────────────────────────────────────

interface BadgeProps {
  nomeCampanha: string;
  tipoBanco?: string | null;
  dados?: {
    gasto_total?: number;
    contatos?: number;
    impressoes?: number;
    cliques?: number;
    ctr?: number;
    cpm?: number;
    orcamento?: number;
    visualizacoes?: number;
    instalacoes?: number;
    engajamentos?: number;
    mensagens_iniciadas?: number;
  };
  ticket?: number;
  conv?: number;
  showMetrica?: boolean;
}

export function TipoCampanhaBadge({
  nomeCampanha,
  tipoBanco,
  dados,
  ticket = 450,
  conv = 0.04,
  showMetrica = true,
}: BadgeProps) {
  const tipo  = resolverTipo(nomeCampanha, tipoBanco, dados);
  const badge = badgeTipo(tipo);

  let metricaLabel = "";
  if (showMetrica && dados?.gasto_total) {
    const mt = calcMetricasPorTipo(
      {
        gasto_total:         dados.gasto_total ?? 0,
        contatos:            dados.contatos ?? 0,
        impressoes:          dados.impressoes,
        cliques:             dados.cliques,
        ctr:                 dados.ctr,
        cpm:                 dados.cpm,
        orcamento:           dados.orcamento,
        visualizacoes:       dados.visualizacoes,
        instalacoes:         dados.instalacoes,
        engajamentos:        dados.engajamentos,
        mensagens_iniciadas: dados.mensagens_iniciadas,
      },
      tipo,
      ticket,
      conv
    );
    metricaLabel = mt.metricaPrincipalLabel;
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${badge.cor}`}
      >
        {badge.emoji} {badge.label}
      </span>

      {metricaLabel && (
        <span className={`text-xs font-mono font-semibold ${badge.cor}`}>
          {metricaLabel}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MetricaPrincipalDisplay — versão destacada para cards maiores
// ─────────────────────────────────────────────────────────────────────────────

interface MetricaProps {
  tipo: TipoCampanha;
  label: string;
  status: "otimo" | "bom" | "atencao" | "critico";
}

export function MetricaPrincipalDisplay({ tipo, label, status }: MetricaProps) {
  const colors = {
    otimo:   "text-emerald-400",
    bom:     "text-sky-400",
    atencao: "text-amber-400",
    critico: "text-red-400",
  };

  const badge = badgeTipo(tipo);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-white/40 uppercase tracking-wide">
        {badge.emoji} Métrica Principal
      </span>
      <span className={`text-lg font-bold font-mono ${colors[status]}`}>
        {label}
      </span>
    </div>
  );
}