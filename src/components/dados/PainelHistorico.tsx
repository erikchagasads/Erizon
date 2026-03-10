"use client";

// src/components/dados/PainelHistorico.tsx
// Painel de histórico com sparklines SVG puras (zero dependência externa)
// Mostra tendências de ROAS, CPL, Score, Leads, Margem ao longo do tempo
// Usado em Pulse e Dados

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import type { HistoricoProcessado, TendenciaMetrica, PontoTendencia } from "@/app/hooks/useHistorico";

// ─── Sparkline SVG pura ────────────────────────────────────────────────────────
function Sparkline({
  pontos,
  cor = "#8b5cf6",
  altura = 36,
  largura = 100,
}: {
  pontos: PontoTendencia[];
  cor?: string;
  altura?: number;
  largura?: number;
}) {
  // PontoTendencia usa campo "valor" (único)
  const valores = pontos.map(p => p.valor);
  if (valores.length < 2) return null;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const range = max - min || 1;
  const pad = 3;

  const pontosSVG = valores.map((v, i) => {
    const x = pad + (i / (valores.length - 1)) * (largura - pad * 2);
    const y = pad + (1 - (v - min) / range) * (altura - pad * 2);
    return { x, y };
  });

  const pathD = pontosSVG
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaD = [
    `M ${pontosSVG[0].x.toFixed(1)} ${altura}`,
    ...pontosSVG.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${pontosSVG[pontosSVG.length - 1].x.toFixed(1)} ${altura}`,
    "Z",
  ].join(" ");

  const ultimoPonto = pontosSVG[pontosSVG.length - 1];
  const gradId = `grad-${cor.replace("#", "")}`;

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      width={largura}
      height={altura}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={cor} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ultimoPonto.x} cy={ultimoPonto.y} r="2.5" fill={cor} />
    </svg>
  );
}

// ─── Card de métrica com sparkline ────────────────────────────────────────────
function CardMetrica({
  label,
  tendencia,
  formato,
  cor,
}: {
  label: string;
  tendencia: TendenciaMetrica;
  formato: (v: number) => string;
  cor: string;
}) {
  // Hook retorna: valorAtual, deltaPct, direcao
  const { valorAtual, deltaPct, direcao, inverso } = tendencia;

  const positivo = inverso ? direcao === "caindo" : direcao === "subindo";

  const corDelta =
    direcao === "estavel" ? "text-white/30"
    : positivo ? "text-emerald-400"
    : "text-red-400";

  const bgCard =
    direcao === "estavel" ? "border-white/[0.06] bg-white/[0.02]"
    : positivo ? "border-emerald-500/[0.12] bg-emerald-500/[0.03]"
    : "border-red-500/[0.12] bg-red-500/[0.03]";

  const Icone = direcao === "estavel" ? Minus : positivo ? TrendingUp : TrendingDown;
  const sinalDelta = deltaPct > 0 ? "+" : "";

  return (
    <div className={`p-4 rounded-2xl border ${bgCard} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium text-white/25 uppercase tracking-widest">{label}</p>
        <div className={`flex items-center gap-1 text-[10px] font-bold ${corDelta}`}>
          <Icone size={10} />
          <span>{sinalDelta}{deltaPct.toFixed(1)}%</span>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[20px] font-black font-mono text-white leading-none">
            {formato(valorAtual)}
          </p>
          <p className="text-[10px] text-white/20 mt-1">vs 7d anterior</p>
        </div>
        <div className="shrink-0">
          <Sparkline
            pontos={tendencia.pontos.slice(-14)}
            cor={cor}
            altura={36}
            largura={80}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Gráfico de linha completo (inline SVG) ───────────────────────────────────
function GraficoLinha({
  pontos,
  cor = "#8b5cf6",
  altura = 80,
}: {
  pontos: PontoTendencia[];
  cor?: string;
  altura?: number;
}) {
  const largura = 500;
  // PontoTendencia usa campo "valor" (único)
  const valores = pontos.map(p => p.valor);
  if (valores.length < 2) return null;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const range = max - min || 1;
  const padX = 8;
  const padY = 8;

  const pts = valores.map((v, i) => ({
    x: padX + (i / (valores.length - 1)) * (largura - padX * 2),
    y: padY + (1 - (v - min) / range) * (altura - padY * 2),
    label: pontos[i].data,
    valor: v,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = [
    `M ${pts[0].x.toFixed(1)} ${altura}`,
    ...pts.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `L ${pts[pts.length - 1].x.toFixed(1)} ${altura}`,
    "Z",
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      className="w-full overflow-visible"
      style={{ height: `${altura}px` }}
    >
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#area-grad)" />
      <path d={pathD} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={cor} opacity="0.7" />
      ))}
    </svg>
  );
}

// ─── Props do painel ──────────────────────────────────────────────────────────
interface Props {
  historico: HistoricoProcessado | null;
  // diasDisponiveis e ultimoSnapshot são retornados separadamente pelo hook
  diasDisponiveis?: number;
  ultimoSnapshot?: string | null;
  loading?: boolean;
  titulo?: string;
  modo?: "compacto" | "completo";
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PainelHistoricoMetricas({
  historico,
  diasDisponiveis = 0,
  ultimoSnapshot,
  loading = false,
  titulo = "Histórico de Performance",
  modo = "compacto",
}: Props) {
  const [expandido, setExpandido] = useState(false);
  const [metricaExpandida, setMetricaExpandida] = useState<"roas" | "cpl" | "score" | "leads" | "margem">("roas");

  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const fmtNum = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="mb-6 p-5 rounded-[20px] border border-white/[0.06] bg-white/[0.02] animate-pulse">
        <div className="h-4 w-48 bg-white/[0.06] rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white/[0.04] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!historico || diasDisponiveis < 2) {
    return (
      <div className="mb-6 p-6 rounded-[20px] border border-white/[0.05] bg-white/[0.02]">
        <div className="flex items-center gap-3 mb-2">
          <Calendar size={14} className="text-white/20" />
          <p className="text-[12px] font-semibold text-white/30">{titulo}</p>
        </div>
        <p className="text-[11px] text-white/20">
          {diasDisponiveis === 1
            ? "Aguarde pelo menos 2 dias de dados para ver tendências."
            : "Nenhum dado histórico ainda. Os snapshots são gerados automaticamente a cada sincronização."}
        </p>
        <p className="text-[10px] text-white/15 mt-1">
          Acumule 3+ dias de dados para ver gráficos de tendência.
        </p>
      </div>
    );
  }

  const { conta } = historico;

  const metricas = [
    {
      key: "roas" as const,
      label: "ROAS",
      tendencia: conta.roas,
      formato: (v: number) => `${v.toFixed(2)}×`,
      cor: "#10b981",
    },
    {
      key: "cpl" as const,
      label: "CPL",
      tendencia: conta.cpl,
      formato: (v: number) => `R$${v.toFixed(0)}`,
      cor: "#f59e0b",
    },
    {
      key: "score" as const,
      label: "Score",
      tendencia: conta.score,
      formato: (v: number) => `${v.toFixed(0)}/100`,
      cor: "#8b5cf6",
    },
    {
      key: "leads" as const,
      label: "Leads",
      tendencia: conta.leads,
      formato: (v: number) => fmtNum(v),
      cor: "#0ea5e9",
    },
    {
      key: "margem" as const,
      label: "Margem",
      tendencia: conta.margem,
      formato: fmtPct,
      cor: "#6366f1",
    },
  ];

  const metricaAtual = metricas.find(m => m.key === metricaExpandida)!;

  // min/max calculados a partir dos pontos (campo "valor")
  const valoresPontos = metricaAtual.tendencia.pontos.map(p => p.valor);
  const minValor = valoresPontos.length > 0 ? Math.min(...valoresPontos) : 0;
  const maxValor = valoresPontos.length > 0 ? Math.max(...valoresPontos) : 0;

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/25">{titulo}</p>
          <span className="text-[10px] text-white/15">· {diasDisponiveis} dias</span>
        </div>
        {ultimoSnapshot && (
          <p className="text-[10px] text-white/15">
            Último: {ultimoSnapshot}
          </p>
        )}
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metricas.map(m => (
          <button
            key={m.key}
            onClick={() => {
              setMetricaExpandida(m.key);
              if (modo === "completo") setExpandido(true);
              else setExpandido(prev => metricaExpandida === m.key ? !prev : true);
            }}
            className={`text-left transition-all ring-1 ring-transparent hover:ring-purple-500/30 rounded-2xl ${
              expandido && metricaExpandida === m.key ? "ring-purple-500/40" : ""
            }`}
          >
            <CardMetrica
              label={m.label}
              tendencia={m.tendencia}
              formato={m.formato}
              cor={m.cor}
            />
          </button>
        ))}
      </div>

      {/* Gráfico expandido */}
      {expandido && metricaAtual && (
        <div className="mt-3 p-5 rounded-2xl border border-white/[0.06] bg-[#111113]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[12px] font-bold text-white">
                {metricaAtual.label} — últimos {diasDisponiveis} dias
              </p>
              <p className="text-[10px] text-white/25 mt-0.5">
                Mín: {metricaAtual.formato(minValor)} ·{" "}
                Máx: {metricaAtual.formato(maxValor)} ·{" "}
                Atual: {metricaAtual.formato(metricaAtual.tendencia.valorAtual)}
              </p>
            </div>
            <button
              onClick={() => setExpandido(false)}
              className="text-[10px] text-white/20 hover:text-white/50 transition-colors px-2 py-1 rounded-lg border border-white/[0.06]"
            >
              fechar
            </button>
          </div>

          <div className="relative">
            <GraficoLinha
              pontos={metricaAtual.tendencia.pontos}
              cor={metricaAtual.cor}
              altura={80}
            />
            {/* Labels datas */}
            <div className="flex justify-between mt-1">
              {metricaAtual.tendencia.pontos
                .filter((_, i, arr) => i === 0 || i === Math.floor(arr.length / 2) || i === arr.length - 1)
                .map((p, i) => (
                  <span key={i} className="text-[9px] text-white/20">{p.data}</span>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}