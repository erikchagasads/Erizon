"use client";

/**
 * pulse.tsx — v4
 * Correções desta versão:
 * 1. Card motivacional dinâmico no topo (pulsa conforme score da conta)
 * 2. Insights IA mostram NOMES das campanhas problemáticas, não só percentuais
 * 3. Pulse = centro de NOTIFICAÇÃO (não operação pesada — essa é a Dados)
 * 4. Insights mais acionáveis e específicos
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  TrendingUp, TrendingDown, Pause, Loader2, ChevronRight,
  AlertTriangle, CheckCircle2, ArrowUpRight, Brain, Zap,
  Target, DollarSign, BarChart2, History, X,
  Flame, Sparkles, ShieldAlert, Clock, PauseCircle, PlayCircle,
  Trophy, Wind, Rocket, Activity,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import {
  processarCampanhas, calcularCPL, formatBRL, resolverConfig,
  type CampanhaRaw, type CampanhaProcessada, type EngineResult, type UserEngineConfig
} from "@/app/lib/engine/pulseEngine";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DecisaoHistorico {
  id?: string;
  data: string;
  acao: string;
  campanha: string;
  campanha_nome?: string;
  impacto: string;
  score_snapshot?: number;
  lucro_snapshot?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL  = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtBRL2 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── CardMotivacional — NOVO: pulsa conforme estado da conta ─────────────────
function CardMotivacional({ engine, nomeUsuario }: {
  engine: EngineResult | null;
  nomeUsuario: string;
}) {
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  // Sem dados
  if (!engine) {
    return (
      <div className="mb-6 px-6 py-5 rounded-[22px] border border-white/[0.07] bg-white/[0.02] flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
          <Activity size={17} className="text-white/30" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-white">{saudacao}, {nomeUsuario}.</p>
          <p className="text-[12px] text-white/30 mt-0.5">Sincronize sua conta para começar a análise.</p>
        </div>
      </div>
    );
  }

  const score = engine.campanhas.length > 0
    ? Math.round(engine.campanhas.reduce((s, c) => s + c.scoreCampanha, 0) / engine.campanhas.length)
    : 0;

  // Elite — tudo verde, hora de escalar
  if (score >= 75 && engine.capitalEmRisco === 0) {
    return (
      <div className="mb-6 px-6 py-5 rounded-[22px] border border-emerald-500/20 bg-emerald-500/[0.04] relative overflow-hidden">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5">
          <Trophy size={80} className="text-emerald-400" />
        </div>
        <div className="relative flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Trophy size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white">{saudacao}, {nomeUsuario}. Conta saudável. 🟢</p>
            <p className="text-[12px] text-emerald-400/80 mt-0.5 font-medium">
              Score médio {score}/100 · Sem campanhas críticas · Momento ideal para testar novos criativos e audiências.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Crescendo — melhorando mas ainda tem espaço
  if (score >= 55 && engine.capitalEmRisco > 0) {
    return (
      <div className="mb-6 px-6 py-5 rounded-[22px] border border-amber-500/15 bg-amber-500/[0.03] relative overflow-hidden">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5">
          <Rocket size={80} className="text-amber-400" />
        </div>
        <div className="relative flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Rocket size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white">{saudacao}, {nomeUsuario}. Conta em progresso. 🟡</p>
            <p className="text-[12px] text-amber-400/80 mt-0.5 font-medium">
              Score {score}/100 · Algumas campanhas precisam de ajuste · Confira as ações abaixo para destravar o potencial.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Crítico — precisa agir agora
  if (score < 55 || engine.capitalEmRisco > 500) {
    return (
      <div className="mb-6 px-6 py-5 rounded-[22px] border border-red-500/20 bg-red-500/[0.04] relative overflow-hidden">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5">
          <Wind size={80} className="text-red-400" />
        </div>
        <div className="relative flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
            <ShieldAlert size={16} className="text-red-400" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white">{saudacao}, {nomeUsuario}. Atenção necessária. 🔴</p>
            <p className="text-[12px] text-red-400/80 mt-0.5 font-medium">
              Score {score}/100 · R${fmtBRL(engine.capitalEmRisco)} em risco este mês · {engine.campanhas.filter(c => c.scoreCampanha < 40).length} ação{engine.campanhas.filter(c => c.scoreCampanha < 40).length !== 1 ? "ões" : ""} prioritária{engine.campanhas.filter(c => c.scoreCampanha < 40).length !== 1 ? "s" : ""} identificada{engine.campanhas.filter(c => c.scoreCampanha < 40).length !== 1 ? "s" : ""}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Padrão
  return (
    <div className="mb-6 px-6 py-5 rounded-[22px] border border-white/[0.06] bg-white/[0.02] flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
        <Sparkles size={16} className="text-purple-400" />
      </div>
      <div>
        <p className="text-[15px] font-bold text-white">{saudacao}, {nomeUsuario}.</p>
        <p className="text-[12px] text-white/35 mt-0.5">Score {score}/100 · {engine.totalAtivos} campanha{engine.totalAtivos !== 1 ? "s" : ""} ativa{engine.totalAtivos !== 1 ? "s" : ""} em análise.</p>
      </div>
    </div>
  );
}

// ─── Score de Maturidade ──────────────────────────────────────────────────────
interface NivelMaturidade {
  nivel: string;
  proximo: string;
  cor: string;
  bg: string;
  border: string;
  indice: number;
  criterios: { texto: string; ok: boolean }[];
}

function calcularMaturidade(engine: EngineResult, cplMedio: number): NivelMaturidade {
  const ok_cpl      = cplMedio > 0 && cplMedio < 30;
  const ok_roas     = engine.roasGlobal >= 2.5;
  const ok_margem   = engine.margemGlobal >= 0.25;
  const ok_diversif = engine.campanhas.length >= 3;
  const ok_critico  = engine.pausadasCount === 0;
  const ok_escala   = engine.saudaveisCount >= 2;

  const pontos = [ok_cpl, ok_roas, ok_margem, ok_diversif, ok_critico, ok_escala].filter(Boolean).length;

  if (pontos <= 1) return {
    nivel: "Iniciante", proximo: "Estruturada",
    cor: "text-red-400", bg: "bg-red-500/[0.04]", border: "border-red-500/15",
    indice: 1,
    criterios: [
      { texto: `Reduzir CPL médio para abaixo de R$30 (atual: ${cplMedio > 0 ? `R$${fmtBRL(cplMedio)}` : "—"})`, ok: ok_cpl },
      { texto: "Atingir ROAS mínimo de 2.5× na conta", ok: ok_roas },
      { texto: "Ter ao menos 3 campanhas ativas", ok: ok_diversif },
    ],
  };
  if (pontos <= 3) return {
    nivel: "Estruturada", proximo: "Avançada",
    cor: "text-amber-400", bg: "bg-amber-500/[0.04]", border: "border-amber-500/15",
    indice: 2,
    criterios: [
      { texto: "Margem média acima de 25%", ok: ok_margem },
      { texto: "Eliminar campanhas com score crítico", ok: ok_critico },
      { texto: "ROAS global acima de 2.5×", ok: ok_roas },
    ],
  };
  if (pontos <= 5) return {
    nivel: "Avançada", proximo: "Elite",
    cor: "text-sky-400", bg: "bg-sky-500/[0.04]", border: "border-sky-500/15",
    indice: 3,
    criterios: [
      { texto: "Ter 2+ campanhas prontas para escala simultânea", ok: ok_escala },
      { texto: "Margem global acima de 30%", ok: engine.margemGlobal >= 0.30 },
      { texto: "ROAS acima de 3× com consistência", ok: engine.roasGlobal >= 3 },
    ],
  };
  return {
    nivel: "Elite", proximo: "—",
    cor: "text-emerald-400", bg: "bg-emerald-500/[0.04]", border: "border-emerald-500/15",
    indice: 4,
    criterios: [
      { texto: "Operação no nível mais alto", ok: true },
      { texto: "Todos os critérios atingidos", ok: true },
      { texto: "Foco em manutenção e expansão", ok: true },
    ],
  };
}

// ─── Insights CORRIGIDOS: mostram nomes das campanhas ────────────────────────
interface Insight {
  emoji: string;
  texto: string;
  tipo: "risco" | "oportunidade" | "neutro";
  campanhasDestaque?: string[]; // NOVO: campanhas específicas
}

function gerarInsights(engine: EngineResult, cplMedio: number, totalInvest: number): Insight[] {
  const insights: Insight[] = [];

  // 1. Risco: campanhas específicas que estão corroendo o ROAS
  const campanhasCriticas = engine.campanhas
    .filter(c => c.scoreCampanha < 50 && !c.pausadaLocalmente)
    .sort((a, b) => b.gastoSimulado - a.gastoSimulado);

  const gastoCritico = campanhasCriticas.reduce((s, c) => s + c.gastoSimulado, 0);

  if (totalInvest > 0 && gastoCritico > 0) {
    const pctCritico = Math.round((gastoCritico / totalInvest) * 100);
    const nomes = campanhasCriticas.slice(0, 3).map(c => `"${c.nome_campanha}"`).join(", ");
    if (pctCritico >= 20) {
      insights.push({
        emoji: "📉",
        texto: `${pctCritico}% do budget está em campanhas com score abaixo de 50: ${nomes}. Isso corrói o ROAS da conta inteira.`,
        tipo: "risco",
        campanhasDestaque: campanhasCriticas.slice(0, 3).map(c => c.nome_campanha),
      });
    }
  }

  // 2. Risco de perda com valor específico
  const perdaMensal = engine.capitalEmRisco;
  if (perdaMensal > 100) {
    const pioresCriticas = campanhasCriticas.slice(0, 2);
    const nomesRisco = pioresCriticas.map(c => `"${c.nome_campanha}"`).join(" e ");
    insights.push({
      emoji: "⚠️",
      texto: pioresCriticas.length > 0
        ? `R$${fmtBRL(perdaMensal)} em risco este mês. As campanhas ${nomesRisco} estão queimando budget sem retorno adequado.`
        : `R$${fmtBRL(perdaMensal)} podem ser perdidos nos próximos 30 dias sem intervenção.`,
      tipo: "risco",
    });
  }

  // 3. Oportunidade de escala com nome da campanha
  if (engine.melhorAtivo) {
    const potencial = engine.melhorAtivo.lucroLiquido * 0.2 * 4;
    if (potencial > 100) {
      insights.push({
        emoji: "🚀",
        texto: `Escalando "${engine.melhorAtivo.nome_campanha}" em 20% agora — ROAS ${engine.melhorAtivo.roas.toFixed(2)}× e score ${engine.melhorAtivo.scoreCampanha}/100 — você pode gerar +R$${fmtBRL(potencial)} este mês.`,
        tipo: "oportunidade",
      });
    }
  }

  // 4. ROAS abaixo do mínimo
  if (engine.roasGlobal > 0 && engine.roasGlobal < 1.5) {
    insights.push({
      emoji: "🔴",
      texto: `ROAS global de ${engine.roasGlobal.toFixed(2)}× — cada real investido retorna apenas R$${engine.roasGlobal.toFixed(2)}. A conta está gerando menos do que gasta.`,
      tipo: "risco",
    });
  }

  // 5. Conta saudável
  if (engine.margemGlobal >= 0.30 && engine.roasGlobal >= 2.5 && campanhasCriticas.length === 0) {
    insights.push({
      emoji: "✅",
      texto: `Margem de ${(engine.margemGlobal * 100).toFixed(0)}% com ROAS ${engine.roasGlobal.toFixed(2)}×. Operação saudável — bom momento para testar novos criativos.`,
      tipo: "oportunidade",
    });
  }

  // 6. CPL alto
  if (cplMedio > 60) {
    insights.push({
      emoji: "📌",
      texto: `CPL médio de R$${fmtBRL(cplMedio)} está acima do recomendado. Revisar segmentação e criativos pode reduzir esse custo em até 30%.`,
      tipo: "risco",
    });
  }

  return insights.slice(0, 3);
}

// ─── InsightCard com destaque das campanhas ───────────────────────────────────
function InsightCard({ insight, delay = 0 }: { insight: Insight; delay?: number }) {
  const s = {
    risco:       { border: "border-red-500/12",     bg: "bg-red-500/[0.03]",     text: "text-red-400/80"     },
    oportunidade:{ border: "border-emerald-500/12", bg: "bg-emerald-500/[0.03]", text: "text-emerald-400/80" },
    neutro:      { border: "border-white/[0.05]",   bg: "bg-white/[0.02]",       text: "text-white/50"       },
  }[insight.tipo];

  return (
    <div
      className={`px-5 py-4 rounded-2xl border ${s.border} ${s.bg} flex flex-col gap-3`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <span className="text-[18px] shrink-0 mt-0.5">{insight.emoji}</span>
        <p className={`text-[13px] leading-relaxed font-medium ${s.text}`}>{insight.texto}</p>
      </div>
      {/* NOVO: badges das campanhas em destaque */}
      {insight.campanhasDestaque && insight.campanhasDestaque.length > 0 && (
        <div className="flex flex-wrap gap-1.5 ml-7">
          {insight.campanhasDestaque.map((nome, i) => (
            <span key={i} className="text-[10px] px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/15 text-red-400/70 font-medium truncate max-w-[180px]">
              {nome}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Projeção 30 dias ─────────────────────────────────────────────────────────
interface Projecao30d {
  semMudanca: { receita: number; perda: number; lucro: number };
  comRecomendacoes: { receita: number; lucroExtra: number; lucroTotal: number };
}

function calcularProjecao30d(engine: EngineResult): Projecao30d {
  const diasRef = 30;
  const fatorDia = diasRef / 7;

  const receitaAtual  = engine.totalReceita * fatorDia;
  const perdaAtual    = engine.capitalEmRisco;
  const lucroAtual    = engine.totalLucro * fatorDia;

  const ganhoEscala   = engine.melhorAtivo ? engine.melhorAtivo.lucroLiquido * 0.2 * fatorDia : 0;
  const economiaRisco = perdaAtual * 0.8;
  const receitaExtra  = engine.melhorAtivo ? engine.melhorAtivo.gastoSimulado * 0.2 * engine.melhorAtivo.roas * fatorDia : 0;
  const lucroExtra    = ganhoEscala + economiaRisco;

  return {
    semMudanca: {
      receita: Math.max(0, receitaAtual),
      perda:   Math.max(0, perdaAtual),
      lucro:   lucroAtual,
    },
    comRecomendacoes: {
      receita:    Math.max(0, receitaAtual + receitaExtra),
      lucroExtra: Math.max(0, lucroExtra),
      lucroTotal: Math.max(0, lucroAtual + lucroExtra),
    },
  };
}

// ─── ProjecaoBar ──────────────────────────────────────────────────────────────
function ProjecaoBar({ label, valor, max, cor }: {
  label: string; valor: number; max: number;
  cor: "red" | "emerald" | "white";
}) {
  const pct  = max > 0 ? Math.min((valor / max) * 100, 100) : 0;
  const fill = { red: "bg-red-500/40", emerald: "bg-emerald-500/50", white: "bg-white/20" }[cor];
  const text = { red: "text-red-400", emerald: "text-emerald-400", white: "text-white/60" }[cor];
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-white/30 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-[3px] rounded-full bg-white/[0.05] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[12px] font-bold font-mono shrink-0 ${text}`}>R${fmtBRL(valor)}</span>
    </div>
  );
}

// ─── MaturidadeBar ────────────────────────────────────────────────────────────
function MaturidadeBar({ indice }: { indice: number }) {
  const niveis = ["Iniciante", "Estruturada", "Avançada", "Elite"];
  const cores  = ["bg-red-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"];
  return (
    <div className="flex items-center gap-1.5">
      {niveis.map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < indice ? cores[i] : "bg-white/[0.06]"}`} />
      ))}
    </div>
  );
}

// ─── Ação Prioritária ─────────────────────────────────────────────────────────
function AcaoPrioritaria({ engine }: { engine: EngineResult }) {
  const critica = engine.campanhas
    .filter(c => c.scoreCampanha < 40 && !c.pausadaLocalmente)
    .sort((a, b) => b.gastoSimulado - a.gastoSimulado)[0];

  const escala = !critica && engine.campanhas
    .filter(c => c.scoreCampanha >= 80 && !c.escaladaLocalmente)
    .sort((a, b) => b.lucroLiquido * b.roas - a.lucroLiquido * a.roas)[0];

  const campanha = critica ?? escala ?? null;
  if (!campanha) return null;

  const isPausar = !!critica;

  const accent = isPausar ? {
    border: "border-red-500/20", bg: "bg-red-500/[0.06]",
    glow:   "shadow-[0_0_50px_rgba(239,68,68,0.08)]",
    badge:  "bg-red-500 text-white", badgeText: "🔥 AÇÃO PRIORITÁRIA DO DIA",
    btn:    "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/15",
    icon: Pause, iconBg: "bg-red-500/10 border-red-500/20", iconColor: "text-red-400",
    impactoColor: "text-red-400",
  } : {
    border: "border-emerald-500/20", bg: "bg-emerald-500/[0.05]",
    glow:   "shadow-[0_0_50px_rgba(16,185,129,0.07)]",
    badge:  "bg-emerald-500 text-white", badgeText: "🚀 OPORTUNIDADE DO DIA",
    btn:    "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15",
    icon: TrendingUp, iconBg: "bg-emerald-500/10 border-emerald-500/20", iconColor: "text-emerald-400",
    impactoColor: "text-emerald-400",
  };

  const Icon = accent.icon;

  return (
    <div className={`mb-5 rounded-[28px] border ${accent.border} ${accent.bg} ${accent.glow} overflow-hidden`}>
      <div className="px-7 pt-6 pb-0 flex items-center gap-3">
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg ${accent.badge}`}>
          {accent.badgeText}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.05] mt-5">
        <div className="flex-1 px-7 py-5 flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${accent.iconBg}`}>
            <Icon size={18} className={accent.iconColor} />
          </div>
          <div>
            <p className="text-[16px] font-bold text-white leading-snug mb-1">
              {isPausar ? "Pausar" : "Escalar"} <span className="text-white/60">"{campanha.nome_campanha}"</span>
            </p>
            <p className="text-[12px] text-white/30 leading-relaxed">
              {isPausar
                ? `Score ${campanha.scoreCampanha}/100 · ROAS ${campanha.roas.toFixed(2)}× · orçamento queimando sem retorno adequado`
                : `Score ${campanha.scoreCampanha}/100 · ROAS ${campanha.roas.toFixed(2)}× · margem ${(campanha.margem * 100).toFixed(0)}% · headroom disponível`}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center px-7 py-5 lg:min-w-[220px] shrink-0">
          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Impacto estimado</p>
          <p className={`text-[20px] font-black font-mono ${accent.impactoColor}`}>
            {isPausar ? "−" : "+"}R${fmtBRL(isPausar
              ? (campanha.perdaMensalProjetada ?? campanha.gastoSimulado * 0.3)
              : campanha.lucroLiquido * 0.2 * 4)}
          </p>
          <p className="text-[11px] text-white/20 mt-0.5">{isPausar ? "evitado este mês" : "lucro extra este mês"}</p>
        </div>

        <div className="flex flex-col justify-center px-7 py-5 lg:min-w-[180px] shrink-0">
          <a href="/dados"
            className={`flex items-center justify-center gap-2 py-3 px-5 rounded-xl border text-[13px] font-bold transition-all ${accent.btn}`}>
            <ChevronRight size={14} /> Ver em Dados
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Modo CEO ─────────────────────────────────────────────────────────────────
function ModoCEO({ engine, projecao, acaoPrioritaria, onSair }: {
  engine: EngineResult;
  projecao: Projecao30d;
  acaoPrioritaria: React.ReactNode;
  onSair: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">Visão Executiva</span>
        </div>
        <button onClick={onSair}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.07] text-[11px] text-white/25 hover:text-white hover:border-white/20 transition-all">
          <X size={11} /> Sair do modo CEO
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Receita projetada / 30d",
            valor: `R$${fmtBRL(projecao.semMudanca.receita)}`,
            cor: "text-white",
            sub: "se nada mudar",
          },
          {
            label: "Perda em risco / 30d",
            valor: engine.capitalEmRisco > 0 ? `R$${fmtBRL(engine.capitalEmRisco)}` : "Nenhuma",
            cor: engine.capitalEmRisco > 0 ? "text-red-400" : "text-emerald-400",
            sub: engine.capitalEmRisco > 0 ? "de campanhas críticas" : "risco detectado",
          },
          {
            label: "Oportunidade de escala",
            valor: engine.melhorAtivo ? `+R$${fmtBRL(engine.melhorAtivo.lucroLiquido * 0.2 * 4)}` : "—",
            cor: "text-emerald-400",
            sub: engine.melhorAtivo ? engine.melhorAtivo.nome_campanha : "nenhuma campanha pronta",
          },
          {
            label: "Lucro potencial / 30d",
            valor: `+R$${fmtBRL(projecao.comRecomendacoes.lucroExtra)}`,
            cor: "text-emerald-400",
            sub: "aplicando recomendações",
          },
        ].map((m, i) => (
          <div key={i} className="p-5 rounded-2xl bg-[#111113] border border-white/[0.05] flex flex-col gap-2">
            <p className="text-[10px] text-white/25 uppercase tracking-widest leading-tight">{m.label}</p>
            <p className={`text-[22px] font-black font-mono tracking-tight ${m.cor}`}>{m.valor}</p>
            <p className="text-[10px] text-white/20">{m.sub}</p>
          </div>
        ))}
      </div>

      {acaoPrioritaria}
    </div>
  );
}

// ─── Tabela de campanhas ──────────────────────────────────────────────────────
function TabelaCampanhas({ campanhas, onAcao }: {
  campanhas: CampanhaProcessada[];
  onAcao: (c: CampanhaProcessada) => void;
}) {
  const sorted = [...campanhas].sort((a, b) => b.indiceRelevancia - a.indiceRelevancia);
  if (sorted.length === 0) return (
    <div className="text-center py-16">
      <BarChart2 size={24} className="text-white/10 mx-auto mb-3" />
      <p className="text-white/20 text-sm">Nenhuma campanha encontrada.</p>
    </div>
  );

  const recBadge: Record<string, { bg: string; text: string }> = {
    "Pausar":         { bg: "bg-red-500/15",     text: "text-red-400"     },
    "ROAS crítico":   { bg: "bg-red-500/10",      text: "text-red-400"     },
    "Escalar":        { bg: "bg-emerald-500/15",  text: "text-emerald-400" },
    "Budget crítico": { bg: "bg-amber-500/15",    text: "text-amber-400"   },
    "Saturação":      { bg: "bg-amber-500/10",    text: "text-amber-400"   },
    "Manter":         { bg: "bg-white/[0.05]",    text: "text-white/40"    },
    "Maturando":      { bg: "bg-purple-500/10",   text: "text-purple-400"  },
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/[0.05]">
            {["Campanha", "Gasto", "Receita", "Margem", "ROAS", "Score", "Status", ""].map(h => (
              <th key={h} className="pb-4 text-[10px] font-medium text-white/25 uppercase tracking-[0.16em] pr-6 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {sorted.map((c) => {
            const margemPct   = (c.margem * 100).toFixed(1);
            const margemColor = c.margem < 0 ? "text-red-400" : c.margem >= 0.30 ? "text-emerald-400" : "text-amber-400";
            const scoreColor  = c.scoreCampanha < 50 ? "text-red-400" : c.scoreCampanha >= 80 ? "text-emerald-400" : "text-amber-400";
            const s = recBadge[c.recomendacao] ?? { bg: "bg-white/[0.05]", text: "text-white/40" };
            return (
              <tr key={c.id} className={`group hover:bg-white/[0.02] transition-colors ${c.pausadaLocalmente ? "opacity-40" : ""}`}>
                <td className="py-4 pr-6">
                  <div>
                    <p className="text-[13px] font-semibold text-white leading-none">{c.nome_campanha}</p>
                    {c.pausadaLocalmente  && <span className="text-[9px] text-white/25 mt-1 block">PAUSADA</span>}
                    {c.escaladaLocalmente && <span className="text-[9px] text-emerald-400 mt-1 block">ESCALANDO</span>}
                  </div>
                </td>
                <td className="py-4 pr-6 text-[13px] text-white/50 font-mono whitespace-nowrap">R$ {fmtBRL2(c.gastoSimulado)}</td>
                <td className="py-4 pr-6 text-[13px] text-white/50 font-mono whitespace-nowrap">R$ {fmtBRL2(c.receitaEstimada)}</td>
                <td className="py-4 pr-6"><span className={`text-[13px] font-bold font-mono ${margemColor}`}>{margemPct}%</span></td>
                <td className="py-4 pr-6 text-[13px] text-white/50 font-mono">{c.roas.toFixed(2)}×</td>
                <td className="py-4 pr-6"><span className={`text-[14px] font-black font-mono ${scoreColor}`}>{c.scoreCampanha}</span></td>
                <td className="py-4 pr-6">
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${s.bg} ${s.text}`}>{c.recomendacao}</span>
                </td>
                <td className="py-4">
                  <button onClick={() => onAcao(c)} disabled={c.acaoPendente || c.pausadaLocalmente}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.07] text-white/25 hover:text-white hover:border-white/20 transition-all disabled:opacity-30">
                    {c.acaoPendente ? <Loader2 size={13} className="animate-spin" />
                      : c.pausadaLocalmente ? <PauseCircle size={13} />
                      : c.scoreCampanha < 50 ? <PauseCircle size={13} className="text-red-400/70" />
                      : <PlayCircle size={13} className="text-emerald-400/70" />}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Histórico ────────────────────────────────────────────────────────────────
function PainelHistorico({ historico }: { historico: DecisaoHistorico[] }) {
  if (historico.length === 0) return (
    <div className="text-center py-16">
      <History size={24} className="text-white/10 mx-auto mb-3" />
      <p className="text-white/20 text-sm">Nenhuma decisão registrada ainda.</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {historico.map((d, i) => {
        const isPausa = d.acao.toLowerCase().includes("paus");
        const isEscala = d.acao.toLowerCase().includes("escal");
        const cor = isPausa ? "text-red-400" : isEscala ? "text-emerald-400" : "text-amber-400";
        const icon = isPausa ? "🛑" : isEscala ? "🚀" : "⚡";
        return (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.04] hover:border-white/[0.07] transition-all">
            <span className="text-[11px] text-white/20 font-mono shrink-0 w-20">{d.data}</span>
            <div className="w-px h-4 bg-white/[0.06] shrink-0" />
            <span className="text-[11px]">{icon}</span>
            <p className="text-[12px] font-medium text-white/50 flex-1 truncate">{d.acao}</p>
            <p className="text-[11px] text-white/25 truncate max-w-[180px]">{d.campanha_nome || d.campanha}</p>
            <span className={`text-[11px] font-semibold shrink-0 ${cor}`}>{d.impacto}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex min-h-screen bg-[#0a0a0a] items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="w-6 h-6 border-[1.5px] border-white/20 border-t-white/60 rounded-full animate-spin" />
        <p className="text-[11px] text-white/20 font-medium uppercase tracking-[0.24em]">Analisando operação</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PulsePage() {
  const [dados, setDados]                       = useState<CampanhaRaw[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [historico, setHistorico]               = useState<DecisaoHistorico[]>([]);
  const [tabAtiva, setTabAtiva]                 = useState<"campanhas" | "historico">("campanhas");
  const [acoesPendentes, setAcoesPendentes]     = useState<Record<string, boolean>>({});
  const [campanhasLocais, setCampanhasLocais]   = useState<Record<string, "pausada" | "escalada">>({});
  const [userEngineConfig, setUserEngineConfig] = useState<UserEngineConfig | null>(null);
  const [modoCEO, setModoCEO]                   = useState(false);
  const [nomeUsuario, setNomeUsuario]           = useState("você");

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Pega nome do usuário
      if (user.user_metadata?.full_name) {
        setNomeUsuario(user.user_metadata.full_name.split(" ")[0]);
      } else if (user.email) {
        setNomeUsuario(user.email.split("@")[0]);
      }

      const [{ data: ads }, { data: hist }, { data: cfg }] = await Promise.all([
        supabase.from("metricas_ads").select("*")
          .eq("user_id", user.id).in("status", ["ATIVO", "ACTIVE", "ATIVA"]),
        supabase.from("decisoes_historico").select("*")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("user_configs")
          .select("ticket_medio_cliente,ticket_medio_global,taxa_conversao")
          .eq("user_id", user.id).maybeSingle(),
      ]);

      if (ads)  setDados(ads);
      if (hist) setHistorico(hist as DecisaoHistorico[]);
      if (cfg)  setUserEngineConfig(cfg);
      setLoading(false);
    }
    load();
    fetch("/api/check-alerts", { method: "POST" }).catch(() => {});
  }, [supabase]);

  const engineConfig = useMemo(() => resolverConfig(userEngineConfig), [userEngineConfig]);

  const engine = useMemo(() =>
    dados.length === 0 ? null
      : processarCampanhas(dados, engineConfig, 1.0, campanhasLocais, acoesPendentes),
    [dados, engineConfig, campanhasLocais, acoesPendentes]
  );

  const cplMedio    = engine ? calcularCPL(engine.totalGasto, engine.totalLeads) : 0;
  const totalInvest = engine?.totalGasto ?? 0;
  const insights    = useMemo(() => engine ? gerarInsights(engine, cplMedio, totalInvest) : [], [engine, cplMedio, totalInvest]);
  const maturidade  = useMemo(() => engine ? calcularMaturidade(engine, cplMedio) : null, [engine, cplMedio]);
  const projecao    = useMemo(() => engine ? calcularProjecao30d(engine) : null, [engine]);

  // ── Executar ação da tabela ─────────────────────────────────────────────────
  const executarAcao = useCallback(async (campanha: CampanhaProcessada) => {
    const tipo: "pausada" | "escalada" = campanha.scoreCampanha < 50 ? "pausada" : "escalada";
    setAcoesPendentes(prev => ({ ...prev, [campanha.id]: true }));
    await new Promise(r => setTimeout(r, 900));
    setCampanhasLocais(prev => ({ ...prev, [campanha.id]: tipo }));
    setAcoesPendentes(prev => { const n = { ...prev }; delete n[campanha.id]; return n; });

    const row: DecisaoHistorico = {
      data: new Date().toLocaleDateString("pt-BR"),
      acao: tipo === "pausada" ? "Campanha pausada" : "Escala aplicada",
      campanha: campanha.id,
      campanha_nome: campanha.nome_campanha,
      impacto: tipo === "pausada"
        ? `−R$${fmtBRL(campanha.perdaMensalProjetada ?? campanha.gastoSimulado * 0.3)}/mês evitados`
        : `+R$${fmtBRL(campanha.lucroLiquido * 0.2 * 4)} potencial este mês`,
    };
    setHistorico(prev => [row, ...prev].slice(0, 20));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("decisoes_historico").insert({ user_id: user.id, ...row });
    } catch {}
  }, [supabase]);

  if (loading) return <LoadingState />;

  const acaoPrioritariaNode = engine ? <AcaoPrioritaria engine={engine} /> : null;

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0b0b0d] to-[#0a0a0a] text-white">
      <Sidebar />

      <main className="flex-1 ml-0 md:ml-24 px-5 md:px-10 xl:px-14 py-10 max-w-[1400px] mx-auto w-full">

        {/* ── HEADER ── */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-8 pb-7 border-b border-white/[0.04]">
          <div>
            <p className="text-[11px] font-medium text-white/20 mb-2.5 tracking-wide">Erizon · Estratégia</p>
            <h1 className="text-[1.9rem] font-bold text-white tracking-tight">Pulse</h1>
            <p className="text-[13px] text-white/25 mt-1">Notificações, direção e oportunidades — em tempo real.</p>
          </div>
          <button
            onClick={() => setModoCEO(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-semibold transition-all mt-1 ${
              modoCEO
                ? "bg-purple-500/10 border-purple-500/25 text-purple-400"
                : "bg-white/[0.04] border-white/[0.07] text-white/40 hover:text-white hover:border-white/15"
            }`}
          >
            <Brain size={13} />
            {modoCEO ? "Sair do modo CEO" : "Modo CEO"}
          </button>
        </header>

        {/* ── CARD MOTIVACIONAL DINÂMICO — NOVO ── */}
        <CardMotivacional engine={engine} nomeUsuario={nomeUsuario} />

        {!engine ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <BarChart2 size={28} className="text-white/10 mb-4" />
            <p className="text-white/25 text-[14px] font-medium mb-1">Nenhuma campanha ativa.</p>
            <p className="text-white/15 text-[12px]">Sincronize sua conta em Dados para começar.</p>
          </div>
        ) : modoCEO ? (
          <ModoCEO
            engine={engine}
            projecao={projecao!}
            acaoPrioritaria={acaoPrioritariaNode}
            onSair={() => setModoCEO(false)}
          />
        ) : (
          <>
            {/* ── 1. AÇÃO PRIORITÁRIA DO DIA ── */}
            {acaoPrioritariaNode}

            {/* ── 2. IA COM NOMES DAS CAMPANHAS — CORRIGIDO ── */}
            {insights.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">Erizon AI · análise em tempo real</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {insights.map((ins, i) => <InsightCard key={i} insight={ins} delay={i * 80} />)}
                </div>
              </section>
            )}

            {/* ── 3. PROJEÇÃO 30 DIAS ── */}
            {projecao && (
              <section className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-[20px] bg-[#111113] border border-white/[0.05]">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <TrendingDown size={13} className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-white">Se nada mudar</p>
                        <p className="text-[10px] text-white/25">Projeção 30 dias · cenário atual</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <ProjecaoBar label="Receita estimada" valor={projecao.semMudanca.receita} max={projecao.comRecomendacoes.receita} cor="white" />
                      {projecao.semMudanca.perda > 0 && (
                        <ProjecaoBar label="Perda potencial" valor={projecao.semMudanca.perda} max={projecao.semMudanca.perda} cor="red" />
                      )}
                      <div className="pt-3 border-t border-white/[0.04]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/25">Lucro projetado</span>
                          <span className={`text-[15px] font-black font-mono ${projecao.semMudanca.lucro >= 0 ? "text-white/60" : "text-red-400"}`}>
                            {projecao.semMudanca.lucro >= 0 ? "" : "−"}R${fmtBRL(Math.abs(projecao.semMudanca.lucro))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-[20px] bg-emerald-500/[0.03] border border-emerald-500/15 relative overflow-hidden">
                    <div className="absolute top-3 right-3">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400">Recomendado</span>
                    </div>
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <TrendingUp size={13} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-white">Aplicando recomendações</p>
                        <p className="text-[10px] text-white/25">Projeção 30 dias · cenário otimizado</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <ProjecaoBar label="Receita estimada" valor={projecao.comRecomendacoes.receita} max={projecao.comRecomendacoes.receita} cor="emerald" />
                      <ProjecaoBar label="Lucro extra" valor={projecao.comRecomendacoes.lucroExtra} max={projecao.comRecomendacoes.receita} cor="emerald" />
                      <div className="pt-3 border-t border-emerald-500/10">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/25">Lucro total projetado</span>
                          <span className="text-[15px] font-black font-mono text-emerald-400">
                            +R${fmtBRL(projecao.comRecomendacoes.lucroTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── 4. SCORE DE MATURIDADE ── */}
            {maturidade && (
              <section className="mb-6">
                <div className={`p-6 rounded-[20px] border ${maturidade.border} ${maturidade.bg}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div>
                          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Nível da operação</p>
                          <div className="flex items-baseline gap-2">
                            <p className={`text-[22px] font-black ${maturidade.cor}`}>{maturidade.nivel}</p>
                            {maturidade.proximo !== "—" && (
                              <>
                                <ChevronRight size={14} className="text-white/20" />
                                <p className="text-[14px] font-semibold text-white/30">{maturidade.proximo}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mb-4">
                        <MaturidadeBar indice={maturidade.indice} />
                      </div>
                      {maturidade.proximo !== "—" && (
                        <div>
                          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2.5">
                            Para subir para {maturidade.proximo}:
                          </p>
                          <div className="space-y-1.5">
                            {maturidade.criterios.map((c, i) => (
                              <div key={i} className="flex items-start gap-2">
                                {c.ok
                                  ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                                  : <div className="w-3 h-3 rounded-full border border-white/20 shrink-0 mt-0.5" />
                                }
                                <p className={`text-[12px] leading-snug ${c.ok ? "text-emerald-400/70 line-through" : "text-white/40"}`}>
                                  {c.texto}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col gap-4 sm:gap-3 shrink-0 sm:min-w-[160px]">
                      {[
                        { label: "ROAS global",  valor: `${engine.roasGlobal.toFixed(2)}×`,       cor: engine.roasGlobal >= 2.5 ? "text-emerald-400" : "text-amber-400" },
                        { label: "Margem",        valor: `${(engine.margemGlobal * 100).toFixed(1)}%`, cor: engine.margemGlobal >= 0.25 ? "text-emerald-400" : "text-red-400" },
                        { label: "CPL médio",     valor: cplMedio > 0 ? `R$${fmtBRL(cplMedio)}` : "—", cor: cplMedio < 30 ? "text-emerald-400" : "text-amber-400" },
                      ].map((s, i) => (
                        <div key={i} className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-white/20 uppercase tracking-widest">{s.label}</span>
                          <span className={`text-[14px] font-black font-mono ${s.cor}`}>{s.valor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── 5. ANÁLISE COMPLETA ── */}
            <section className="bg-[#111113] border border-white/[0.06] rounded-[20px] overflow-hidden">
              <div className="flex items-center gap-1 px-6 pt-5 border-b border-white/[0.05]">
                {[
                  { id: "campanhas" as const, label: "Análise de Campanhas", count: engine.totalAtivos },
                  { id: "historico"  as const, label: "Histórico de Decisões", count: historico.length },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setTabAtiva(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 mb-[-1px] text-[12px] font-semibold transition-all border-b-2 rounded-t-lg ${
                      tabAtiva === tab.id ? "border-white/40 text-white" : "border-transparent text-white/25 hover:text-white/50"
                    }`}>
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30 font-bold">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-6 md:p-8">
                {tabAtiva === "campanhas" && (
                  <TabelaCampanhas campanhas={engine.campanhas} onAcao={executarAcao} />
                )}
                {tabAtiva === "historico" && <PainelHistorico historico={historico} />}
              </div>
            </section>
          </>
        )}

      </main>
    </div>
  );
}