"use client";

/**
 * pulse/page.tsx — v11 "Jornal Executivo"
 *
 * ESTRUTURA DE LEITURA (30 segundos):
 *   HEADLINE      — manchete dinâmica gerada pelo engine (o título do jornal)
 *   ALERTAS 24h   — o que mudou desde ontem (notícia quente)
 *   BRIEFING      — estado geral da conta + score global
 *   DECISÃO       — 1 ação prioritária com impacto R$
 *   VITÓRIAS      — o que está funcionando esta semana
 *   FINANCEIROS   — investimento / lucro / ROAS global
 *   TENDÊNCIA     — 4 chips vs 7d anterior
 *   MEMÓRIA       — últimas 3 decisões + impacto acumulado
 *   PROJEÇÃO      — oportunidade 30 dias
 *   INTELLIGENCE  — PainelGrowthEngine (análise estratégica)
 *   HISTÓRICO     — gráfico compacto
 *   MATURIDADE    — nível + critérios próximo nível
 *   RISCO         — índice com fatores ativos
 *
 * SEM listas de campanhas individuais (→ vai para Dados)
 * SEM métricas técnicas (CTR, CPM, frequência) (→ vai para Dados)
 * SEM filtro de cliente — Pulse é visão global do negócio
 */

import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  TrendingUp, TrendingDown, ChevronRight, CheckCircle2,
  Sparkles, BarChart2, Brain, Minus, Activity,
  ArrowUpRight, DollarSign, Calendar, AlertTriangle,
  Zap, Trophy, Newspaper, Bell,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import {
  processarCampanhas, calcularCPL, resolverConfig,
  type CampanhaRaw, type EngineResult, type UserEngineConfig,
} from "@/app/lib/engine/pulseEngine";
import PainelHistoricoMetricas from "@/components/dados/PainelHistorico";
import PainelGrowthEngine from "@/components/dados/PainelGrowthEngine";
import { useHistorico } from "@/app/hooks/useHistorico";
import type { DecisaoHistorico, CampanhaEnriquecida } from "@/app/analytics/types";
import { calcMetricas } from "@/app/analytics/engine";

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function getSaudacao() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

function getDataFormatada() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function getDiaSemana() {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long" });
}

function formatarNome(s: string) {
  if (!s) return "";
  return s.replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

// ─── Score ponderado por gasto ────────────────────────────────────────────────
function calcScorePonderado(engine: EngineResult): number {
  if (!engine || engine.totalGasto <= 0) return 0;
  return Math.round(
    engine.campanhas.reduce((s, c) => s + c.scoreCampanha * c.gastoSimulado, 0) /
    engine.totalGasto
  );
}

// ─── Estado da Conta ──────────────────────────────────────────────────────────
interface EstadoConta {
  manchete:  string;
  subtitulo: string;
  cor:       "emerald" | "amber" | "red";
  icone:     string;
  urgencia:  "critica" | "atencao" | "positiva";
}

function calcularEstado(engine: EngineResult, risco: number): EstadoConta {
  const { roasGlobal, margemGlobal, capitalEmRisco, pausadasCount } = engine;
  if (roasGlobal < 1.0)
    return { manchete: "Conta perdendo dinheiro agora.", subtitulo: `Cada R$1 investido retorna R$${roasGlobal.toFixed(2)}. Ação urgente.`, cor: "red", icone: "🚨", urgencia: "critica" };
  if (risco >= 70)
    return { manchete: `${pausadasCount} campanha${pausadasCount !== 1 ? "s" : ""} crítica${pausadasCount !== 1 ? "s" : ""} consumindo budget.`, subtitulo: `R$${fmtBRL(capitalEmRisco)} em risco. Pausa obrigatória.`, cor: "red", icone: "⚠️", urgencia: "critica" };
  if (risco >= 45)
    return { manchete: "Risco concentrado. Resultados aceitáveis.", subtitulo: "Campanhas críticas corroem o ROAS. Ajuste necessário esta semana.", cor: "amber", icone: "⚡", urgencia: "atencao" };
  if (margemGlobal >= 0.30 && roasGlobal >= 2.5)
    return { manchete: "Operação pronta para escala.", subtitulo: `Margem ${(margemGlobal * 100).toFixed(0)}% · ROAS ${roasGlobal.toFixed(2)}× · momento ideal para crescer.`, cor: "emerald", icone: "🚀", urgencia: "positiva" };
  return { manchete: "Operação estável. Espaço para crescer.", subtitulo: "Fundamentos no lugar. Pequenos ajustes podem destravar o próximo nível.", cor: "amber", icone: "✅", urgencia: "atencao" };
}

// ─── Headline dinâmica ────────────────────────────────────────────────────────
interface Headline {
  titulo: string;
  subtitulo: string;
  tipo: "alerta" | "positivo" | "neutro";
}

function gerarHeadline(engine: EngineResult, score: number, risco: number): Headline {
  const { roasGlobal, margemGlobal, totalGasto, totalReceita, totalLeads, capitalEmRisco, pausadasCount, saudaveisCount, melhorAtivo } = engine;
  const lucro = totalReceita - totalGasto;

  // Situações críticas — manchete de alerta
  if (roasGlobal < 1.0)
    return { titulo: `🚨 Conta no vermelho: cada R$1 investido retorna R$${roasGlobal.toFixed(2)}.`, subtitulo: "Pausa imediata nas campanhas críticas pode evitar prejuízo crescente.", tipo: "alerta" };

  if (capitalEmRisco > totalGasto * 0.4)
    return { titulo: `⚠️ R$${fmtBRL(capitalEmRisco)} em campanhas sem retorno adequado.`, subtitulo: `${pausadasCount} campanha${pausadasCount !== 1 ? "s" : ""} crítica${pausadasCount !== 1 ? "s" : ""} consumindo ${Math.round((capitalEmRisco / totalGasto) * 100)}% do budget.`, tipo: "alerta" };

  // Situações positivas — manchete de crescimento
  if (margemGlobal >= 0.30 && roasGlobal >= 2.5 && saudaveisCount >= 2)
    return { titulo: `🚀 Operação no ponto ideal: ROAS ${roasGlobal.toFixed(2)}× com margem ${(margemGlobal * 100).toFixed(0)}%.`, subtitulo: `${saudaveisCount} campanha${saudaveisCount !== 1 ? "s" : ""} saudável${saudaveisCount !== 1 ? "is" : ""} pronta${saudaveisCount !== 1 ? "s" : ""} para escala. Janela de crescimento aberta.`, tipo: "positivo" };

  if (lucro > 0 && roasGlobal >= 2.0)
    return { titulo: `✅ Conta gerando lucro: +R$${fmtBRL(lucro)} com ${totalLeads} leads no período.`, subtitulo: `ROAS ${roasGlobal.toFixed(2)}× · Margem ${(margemGlobal * 100).toFixed(0)}% · Base sólida para crescer.`, tipo: "positivo" };

  if (melhorAtivo && melhorAtivo.roas >= 3.0)
    return { titulo: `⚡ "${melhorAtivo.nome_campanha}" com ROAS ${melhorAtivo.roas.toFixed(2)}× — campanha vencedora detectada.`, subtitulo: "Hora de escalar o que está funcionando antes que a janela feche.", tipo: "positivo" };

  // Situações neutras — manchete de contexto
  const dia = getDiaSemana();
  if (dia === "segunda-feira")
    return { titulo: `📋 Segunda-feira: hora de revisar o desempenho da semana passada.`, subtitulo: `Score atual: ${score}/100. Verifique o que precisa de ajuste antes de investir mais.`, tipo: "neutro" };

  if (dia === "sexta-feira")
    return { titulo: `📊 Sexta-feira: valide as campanhas antes do final de semana.`, subtitulo: "Finais de semana têm CPL mais alto em média. Ajuste budgets se necessário.", tipo: "neutro" };

  return { titulo: `📊 Score global: ${score}/100. ROAS ${roasGlobal.toFixed(2)}× com ${totalLeads} leads gerados.`, subtitulo: `R$${fmtBRL(totalGasto)} investidos · R$${fmtBRL(totalReceita)} em receita · Margem ${(margemGlobal * 100).toFixed(0)}%.`, tipo: "neutro" };
}

// ─── Alertas 24h ─────────────────────────────────────────────────────────────
interface Alerta24h {
  emoji: string;
  texto: string;
  tipo: "critico" | "atencao" | "positivo";
  campanha?: string;
}

function gerarAlertas24h(engine: EngineResult, dados: CampanhaRaw[]): Alerta24h[] {
  const alertas: Alerta24h[] = [];

  // Campanhas sem leads gastando muito
  const semLeads = engine.campanhas.filter(c => c.leadsSimulados === 0 && c.gastoSimulado > 50);
  if (semLeads.length > 0) {
    const pior = semLeads.sort((a, b) => b.gastoSimulado - a.gastoSimulado)[0];
    alertas.push({
      emoji: "🔴",
      texto: `"${pior.nome_campanha}" gastou R$${fmtBRL(pior.gastoSimulado)} sem gerar nenhum lead.`,
      tipo: "critico",
      campanha: pior.nome_campanha,
    });
  }

  // ROAS caindo
  const criticas = engine.campanhas.filter(c => c.scoreCampanha < 40 && c.gastoSimulado > 0);
  if (criticas.length > 0 && semLeads.length === 0) {
    const pior = criticas[0];
    alertas.push({
      emoji: "⚠️",
      texto: `${criticas.length} campanha${criticas.length !== 1 ? "s" : ""} com score crítico. "${pior.nome_campanha}" em ${pior.scoreCampanha}/100.`,
      tipo: "atencao",
    });
  }

  // Capital em risco
  if (engine.capitalEmRisco > engine.totalGasto * 0.3) {
    alertas.push({
      emoji: "💸",
      texto: `R$${fmtBRL(engine.capitalEmRisco)} do seu budget está em campanhas com retorno abaixo do mínimo.`,
      tipo: "atencao",
    });
  }

  // Campanhas escaláveis
  const escaláveis = engine.campanhas.filter(c => c.scoreCampanha >= 80 && c.roas >= 2.5);
  if (escaláveis.length > 0) {
    const melhor = escaláveis.sort((a, b) => b.roas - a.roas)[0];
    alertas.push({
      emoji: "🚀",
      texto: `"${melhor.nome_campanha}" com ROAS ${melhor.roas.toFixed(2)}× está pronta para escala.`,
      tipo: "positivo",
      campanha: melhor.nome_campanha,
    });
  }

  // ROAS global saudável
  if (engine.roasGlobal >= 2.5 && criticas.length === 0) {
    alertas.push({
      emoji: "✅",
      texto: `ROAS global ${engine.roasGlobal.toFixed(2)}× acima do benchmark. Conta operando bem.`,
      tipo: "positivo",
    });
  }

  return alertas.slice(0, 4);
}

// ─── Vitórias da semana ───────────────────────────────────────────────────────
interface Vitoria {
  emoji: string;
  titulo: string;
  detalhe: string;
  valor?: string;
  corValor?: string;
}

function gerarVitorias(engine: EngineResult, decisoes: DecisaoHistorico[]): Vitoria[] {
  const vitorias: Vitoria[] = [];

  // Melhor campanha
  const melhor = engine.campanhas.filter(c => c.roas >= 2.0 && c.leadsSimulados > 0)
    .sort((a, b) => b.roas * b.leadsSimulados - a.roas * a.leadsSimulados)[0];
  if (melhor) {
    vitorias.push({
      emoji: "🏆",
      titulo: `"${melhor.nome_campanha}" liderando`,
      detalhe: `ROAS ${melhor.roas.toFixed(2)}× com ${melhor.leadsSimulados} leads`,
      valor: `R$${fmtBRL(melhor.lucroLiquido)}`,
      corValor: "text-emerald-400",
    });
  }

  // Lucro gerado
  if (engine.totalLucro > 0) {
    vitorias.push({
      emoji: "💰",
      titulo: "Lucro no período",
      detalhe: `${engine.saudaveisCount} campanha${engine.saudaveisCount !== 1 ? "s" : ""} saudável${engine.saudaveisCount !== 1 ? "is" : ""} gerando retorno`,
      valor: `+R$${fmtBRL(engine.totalLucro)}`,
      corValor: "text-emerald-400",
    });
  }

  // Leads gerados
  if (engine.totalLeads > 0) {
    const cplMedio = engine.totalGasto > 0 ? engine.totalGasto / engine.totalLeads : 0;
    vitorias.push({
      emoji: "👥",
      titulo: `${engine.totalLeads} leads gerados`,
      detalhe: cplMedio > 0 ? `CPL médio R$${fmtBRL(cplMedio)}` : "no período",
      valor: cplMedio < 30 ? "CPL excelente" : cplMedio < 60 ? "CPL razoável" : undefined,
      corValor: cplMedio < 30 ? "text-emerald-400" : "text-amber-400",
    });
  }

  // Decisões tomadas esta semana
  const decisoesRecentes = decisoes.filter(d => {
    const data = (d as any).created_at ?? (d as any).data;
    if (!data) return false;
    const diff = (Date.now() - new Date(data).getTime()) / 86400000;
    return diff <= 7;
  });
  if (decisoesRecentes.length > 0) {
    vitorias.push({
      emoji: "🧠",
      titulo: `${decisoesRecentes.length} decisão${decisoesRecentes.length !== 1 ? "ões" : ""} esta semana`,
      detalhe: "Decisões registradas no Centro de Inteligência",
    });
  }

  return vitorias.slice(0, 3);
}

// ─── Risco ────────────────────────────────────────────────────────────────────
interface IndiceRisco {
  valor: number; nivel: string;
  cor: string; bg: string; border: string;
  fatores: { nome: string; peso: number; ativo: boolean; detalhe: string }[];
}

function calcularRisco(engine: EngineResult, cplMedio: number, totalInvest: number): IndiceRisco {
  const gastoCritico = engine.campanhas.filter(c => c.scoreCampanha < 50).reduce((s, c) => s + c.gastoSimulado, 0);
  const pctCritico   = totalInvest > 0 ? gastoCritico / totalInvest : 0;
  const fatores = [
    { nome: "ROAS abaixo de 1.5×",         peso: 30, ativo: engine.roasGlobal < 1.5,                                                               detalhe: `ROAS: ${engine.roasGlobal.toFixed(2)}×` },
    { nome: "Margem abaixo de 15%",         peso: 20, ativo: engine.margemGlobal < 0.15,                                                            detalhe: `Margem: ${(engine.margemGlobal * 100).toFixed(1)}%` },
    { nome: "Budget em campanhas críticas", peso: 20, ativo: pctCritico >= 0.30,                                                                    detalhe: `${(pctCritico * 100).toFixed(0)}% em risco` },
    { nome: "Campanhas com score < 40",     peso: 15, ativo: engine.campanhas.filter(c => c.scoreCampanha < 40).length > 0,                         detalhe: `${engine.campanhas.filter(c => c.scoreCampanha < 40).length} crítica(s)` },
    { nome: "CPL acima de R$60",            peso: 10, ativo: cplMedio > 60,                                                                         detalhe: `CPL: R$${fmtBRL(cplMedio)}` },
    { nome: "Concentração em 1 campanha",   peso:  5, ativo: engine.totalAtivos === 1,                                                              detalhe: "Diversificação baixa" },
  ];
  const valor = fatores.reduce((s, f) => s + (f.ativo ? f.peso : 0), 0);
  if (valor <= 10) return { valor, nivel: "Baixo",    cor: "text-emerald-400", bg: "bg-emerald-500/[0.04]", border: "border-emerald-500/15", fatores };
  if (valor <= 30) return { valor, nivel: "Moderado", cor: "text-amber-400",   bg: "bg-amber-500/[0.04]",   border: "border-amber-500/15",   fatores };
  if (valor <= 55) return { valor, nivel: "Alto",     cor: "text-orange-400",  bg: "bg-orange-500/[0.04]",  border: "border-orange-500/15",  fatores };
  return               { valor, nivel: "Crítico",  cor: "text-red-400",    bg: "bg-red-500/[0.04]",     border: "border-red-500/15",     fatores };
}

// ─── Maturidade ───────────────────────────────────────────────────────────────
interface Maturidade {
  nivel: string; proximo: string;
  cor: string; bg: string; border: string; indice: number;
  criterios: { texto: string; ok: boolean }[];
}

function calcularMaturidade(engine: EngineResult, cplMedio: number): Maturidade {
  const ok_cpl     = cplMedio > 0 && cplMedio < 30;
  const ok_roas    = engine.roasGlobal >= 2.5;
  const ok_margem  = engine.margemGlobal >= 0.25;
  const ok_div     = engine.campanhas.length >= 3;
  const ok_critico = engine.pausadasCount === 0;
  const ok_escala  = engine.saudaveisCount >= 2;
  const pts = [ok_cpl, ok_roas, ok_margem, ok_div, ok_critico, ok_escala].filter(Boolean).length;

  if (pts <= 1) return { nivel: "Iniciante",   proximo: "Estruturada", cor: "text-red-400",     bg: "bg-red-500/[0.04]",     border: "border-red-500/15",     indice: 1, criterios: [{ texto: `CPL abaixo de R$30 (atual: ${cplMedio > 0 ? `R$${fmtBRL(cplMedio)}` : "—"})`, ok: ok_cpl }, { texto: "ROAS mínimo de 2.5×", ok: ok_roas }, { texto: "Ao menos 3 campanhas ativas", ok: ok_div }] };
  if (pts <= 3) return { nivel: "Estruturada", proximo: "Avançada",   cor: "text-amber-400",   bg: "bg-amber-500/[0.04]",   border: "border-amber-500/15",   indice: 2, criterios: [{ texto: "Margem média acima de 25%", ok: ok_margem }, { texto: "Eliminar campanhas críticas", ok: ok_critico }, { texto: "ROAS global acima de 2.5×", ok: ok_roas }] };
  if (pts <= 5) return { nivel: "Avançada",    proximo: "Elite",      cor: "text-sky-400",     bg: "bg-sky-500/[0.04]",     border: "border-sky-500/15",     indice: 3, criterios: [{ texto: "2+ campanhas prontas para escala", ok: ok_escala }, { texto: "Margem global acima de 30%", ok: engine.margemGlobal >= 0.30 }, { texto: "ROAS acima de 3× consistente", ok: engine.roasGlobal >= 3 }] };
  return             { nivel: "Elite",       proximo: "—",           cor: "text-emerald-400", bg: "bg-emerald-500/[0.04]", border: "border-emerald-500/15", indice: 4, criterios: [{ texto: "Operação no nível mais alto", ok: true }, { texto: "Todos os critérios atingidos", ok: true }, { texto: "Foco em expansão e diversificação", ok: true }] };
}

// ─── Projeção 30d ─────────────────────────────────────────────────────────────
function calcProjecao(engine: EngineResult) {
  const f = 30 / 7;
  const receitaAtual = engine.totalReceita * f;
  const lucroAtual   = engine.totalLucro * f;
  const perdaAtual   = engine.capitalEmRisco;
  const ganhoEscala  = engine.melhorAtivo ? engine.melhorAtivo.lucroLiquido * 0.2 * f : 0;
  const receitaExtra = engine.melhorAtivo ? engine.melhorAtivo.gastoSimulado * 0.2 * engine.melhorAtivo.roas * f : 0;
  return {
    semMudanca:       { receita: Math.max(0, receitaAtual), perda: Math.max(0, perdaAtual), lucro: lucroAtual },
    comRecomendacoes: { receita: Math.max(0, receitaAtual + receitaExtra), lucroExtra: Math.max(0, ganhoEscala + perdaAtual * 0.8) },
    valorHero:        Math.max(0, ganhoEscala + perdaAtual * 0.8),
  };
}

// ─── Comparação semanal ───────────────────────────────────────────────────────
interface ComparSemanal {
  roas: { atual: number; pct: number };
  cpl:  { atual: number; pct: number };
  margem: { atual: number; pct: number };
  lucro: { atual: number; pct: number };
  confianca: number;
}

function normHist(raw: unknown): Array<{ data: string; roas?: number | null; cpl?: number | null; margem?: number | null; lucro?: number | null }> {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  for (const k of ["dados", "metricas", "itens", "historico", "items", "rows"]) {
    if (Array.isArray(obj[k])) return obj[k] as ReturnType<typeof normHist>;
  }
  return [];
}

function calcCompar(raw: unknown): ComparSemanal | null {
  const hist = normHist(raw);
  if (hist.length < 2) return null;
  const sorted = [...hist].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  const hoje = new Date();
  const d7   = new Date(hoje.getTime() - 7  * 86400000);
  const d14  = new Date(hoje.getTime() - 14 * 86400000);
  const rec  = sorted.filter(h => new Date(h.data) >= d7);
  const ant  = sorted.filter(h => new Date(h.data) >= d14 && new Date(h.data) < d7);
  if (!rec.length || !ant.length) return null;
  function med(arr: typeof rec, k: keyof typeof arr[0]) {
    const v = arr.map(h => Number(h[k])).filter(n => isFinite(n) && n > 0);
    return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  }
  function d(a: number, b: number) { return { atual: a, pct: b > 0 ? ((a - b) / b) * 100 : 0 }; }
  return {
    roas:   d(med(rec, "roas"),   med(ant, "roas")),
    cpl:    d(med(rec, "cpl"),    med(ant, "cpl")),
    margem: d(med(rec, "margem"), med(ant, "margem")),
    lucro:  d(med(rec, "lucro"),  med(ant, "lucro")),
    confianca: Math.min(Math.round((Math.min(rec.length, ant.length) / 7) * 100), 90),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ═════════════════════════════════════════════════════════════════════════════

// ── HeadlineDoDia ─────────────────────────────────────────────────────────────
function HeadlineDoDia({ headline, data }: { headline: Headline; data: string }) {
  const p = {
    alerta:   { border: "border-red-500/20",     bg: "bg-red-500/[0.04]",     txt: "text-red-300",    barra: "bg-red-500",     glow: "shadow-[0_0_60px_rgba(239,68,68,0.07)]"    },
    positivo: { border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]", txt: "text-emerald-300",barra: "bg-emerald-500", glow: "shadow-[0_0_60px_rgba(16,185,129,0.07)]"   },
    neutro:   { border: "border-white/[0.08]",   bg: "bg-white/[0.02]",       txt: "text-white/70",   barra: "bg-white/30",    glow: ""                                          },
  }[headline.tipo];

  return (
    <div className={`relative mb-4 rounded-[24px] border ${p.border} ${p.bg} ${p.glow} overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${p.barra} opacity-40 rounded-l-full`} />
      <div className="px-7 py-5 pl-9">
        <div className="flex items-center gap-2 mb-2">
          <Newspaper size={11} className="text-white/20" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/20">
            Manchete · {data}
          </span>
        </div>
        <p className={`text-[18px] font-black leading-snug mb-1.5 ${p.txt}`}>
          {headline.titulo}
        </p>
        <p className="text-[12px] text-white/30 leading-relaxed">{headline.subtitulo}</p>
      </div>
    </div>
  );
}

// ── Alertas24h ────────────────────────────────────────────────────────────────
function Alertas24h({ alertas }: { alertas: Alerta24h[] }) {
  if (alertas.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={11} className="text-white/20" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/20">
          Alertas · últimas 24h
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {alertas.map((a, i) => {
          const s = {
            critico:  "border-red-500/15 bg-red-500/[0.03]",
            atencao:  "border-amber-500/15 bg-amber-500/[0.02]",
            positivo: "border-emerald-500/15 bg-emerald-500/[0.03]",
          }[a.tipo];
          return (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-[16px] border ${s}`}>
              <span className="text-[14px] shrink-0 mt-0.5">{a.emoji}</span>
              <p className="text-[12px] text-white/50 leading-snug">{a.texto}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── BriefingCard ──────────────────────────────────────────────────────────────
function BriefingCard({ estado, score }: { estado: EstadoConta; score: number }) {
  const p = {
    emerald: { border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]", glow: "shadow-[0_0_60px_rgba(16,185,129,0.07)]", txt: "text-emerald-400", barra: "bg-emerald-500" },
    amber:   { border: "border-amber-500/20",   bg: "bg-amber-500/[0.03]",   glow: "",                                          txt: "text-amber-300",  barra: "bg-amber-500"   },
    red:     { border: "border-red-500/20",     bg: "bg-red-500/[0.04]",     glow: "shadow-[0_0_60px_rgba(239,68,68,0.07)]",    txt: "text-red-300",    barra: "bg-red-500"     },
  }[estado.cor];

  const scoreLabel = score >= 80 ? "Excelente" : score >= 65 ? "Bom" : score >= 50 ? "Atenção" : "Crítico";

  return (
    <div className={`relative mb-5 rounded-[24px] border ${p.border} ${p.bg} ${p.glow} overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${p.barra} opacity-50 rounded-l-full`} />
      <div className="px-7 py-6 pl-9">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-1.5 rounded-full ${p.barra} ${estado.urgencia === "critica" ? "animate-pulse" : ""}`} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/20">
                Briefing executivo
              </span>
            </div>
            <p className={`text-[20px] font-black leading-tight mb-2 ${p.txt}`}>
              {estado.icone} {estado.manchete}
            </p>
            <p className="text-[13px] text-white/35 leading-relaxed">{estado.subtitulo}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Score global</p>
            <p className={`text-[44px] font-black font-mono leading-none ${p.txt}`}>{score}</p>
            <p className="text-[10px] text-white/20 mt-1">{scoreLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DecisaoDoDia ──────────────────────────────────────────────────────────────
function DecisaoDoDia({ engine }: { engine: EngineResult }) {
  const critica = engine.campanhas.filter(c => c.scoreCampanha < 40).sort((a, b) => b.gastoSimulado - a.gastoSimulado)[0];
  const escala  = !critica && engine.campanhas.filter(c => c.scoreCampanha >= 80).sort((a, b) => b.lucroLiquido * b.roas - a.lucroLiquido * a.roas)[0];
  const campanha = critica ?? escala ?? null;

  if (!campanha) return (
    <div className="mb-5 px-6 py-5 rounded-[20px] border border-emerald-500/15 bg-emerald-500/[0.03] flex items-center gap-3">
      <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
      <div>
        <p className="text-[14px] font-bold text-emerald-400">Nenhuma ação crítica hoje.</p>
        <p className="text-[12px] text-white/30 mt-0.5">Conta estável. Monitore e mantenha o que está funcionando.</p>
      </div>
    </div>
  );

  const isPausar = !!critica;
  const impacto  = isPausar
    ? (campanha.perdaMensalProjetada ?? campanha.gastoSimulado * 0.3)
    : campanha.lucroLiquido * 0.2 * 4;
  const p = isPausar
    ? { border: "border-red-500/20",     bg: "bg-red-500/[0.04]",     glow: "shadow-[0_0_50px_rgba(239,68,68,0.07)]",    badge: "bg-red-500",     btn: "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/15",     cor: "text-red-400",     label: "🎯 AÇÃO PRIORITÁRIA"    }
    : { border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]", glow: "shadow-[0_0_50px_rgba(16,185,129,0.07)]",   badge: "bg-emerald-500", btn: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15", cor: "text-emerald-400", label: "🚀 OPORTUNIDADE DO DIA" };

  return (
    <div className={`mb-5 rounded-[24px] border ${p.border} ${p.bg} ${p.glow} overflow-hidden`}>
      <div className="px-7 pt-5 pb-0 flex items-center justify-between">
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg text-white ${p.badge}`}>{p.label}</span>
        <p className="text-[11px] text-white/15 italic">Uma ação. Hoje.</p>
      </div>
      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/[0.05] mt-5">
        <div className="flex-1 px-7 py-5">
          <p className="text-[17px] font-bold text-white mb-1.5">
            {isPausar ? "Pausar" : "Escalar"}{" "}
            <span className="text-white/50">"{campanha.nome_campanha}"</span>
          </p>
          <p className="text-[13px] text-white/30 leading-relaxed">
            {isPausar
              ? `Score ${campanha.scoreCampanha}/100 · ROAS ${campanha.roas.toFixed(2)}× · budget queimando sem retorno suficiente`
              : `Score ${campanha.scoreCampanha}/100 · ROAS ${campanha.roas.toFixed(2)}× · janela de escala aberta`}
          </p>
        </div>
        <div className="flex flex-col justify-center px-7 py-5 lg:min-w-[200px] shrink-0">
          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">
            {isPausar ? "Economia estimada" : "Lucro extra estimado"}
          </p>
          <p className={`text-[24px] font-black font-mono ${p.cor}`}>
            {isPausar ? "−" : "+"}R${fmtBRL(impacto)}
          </p>
          <p className="text-[11px] text-white/20 mt-0.5">/mês</p>
        </div>
        <div className="flex flex-col justify-center px-7 py-5 lg:min-w-[170px] shrink-0">
          <a href="/analytics"
            className={`flex items-center justify-center gap-2 py-3 px-5 rounded-xl border text-[13px] font-bold transition-all ${p.btn}`}>
            <ChevronRight size={14} /> Agir em Dados
          </a>
        </div>
      </div>
    </div>
  );
}

// ── VitoriasDaSemana ──────────────────────────────────────────────────────────
function VitoriasDaSemana({ vitorias }: { vitorias: Vitoria[] }) {
  if (vitorias.length === 0) return null;
  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={11} className="text-amber-400/50" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/20">Vitórias da semana</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {vitorias.map((v, i) => (
          <div key={i} className="px-4 py-3.5 rounded-[18px] border border-white/[0.06] bg-white/[0.01] flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">{v.emoji}</span>
              <p className="text-[12px] font-semibold text-white/70 leading-snug">{v.titulo}</p>
            </div>
            <p className="text-[11px] text-white/25 leading-snug">{v.detalhe}</p>
            {v.valor && <p className={`text-[13px] font-black font-mono mt-0.5 ${v.corValor ?? "text-white/40"}`}>{v.valor}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Números Financeiros ───────────────────────────────────────────────────────
function NumCard({ label, valor, sub, cor = "text-white", Ico }: {
  label: string; valor: string; sub: string; cor?: string;
  Ico: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="p-5 rounded-[20px] border border-white/[0.06] bg-white/[0.01]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center">
          <Ico size={11} className="text-white/30" />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20">{label}</p>
      </div>
      <p className={`text-[28px] font-black font-mono leading-none mb-1 ${cor}`}>{valor}</p>
      <p className="text-[11px] text-white/20">{sub}</p>
    </div>
  );
}

// ── Tendência Semanal ─────────────────────────────────────────────────────────
function ChipTend({ label, atual, pct, fmt, inv = false }: {
  label: string; atual: number; pct: number; fmt: "brl" | "x" | "pct"; inv?: boolean;
}) {
  const mel = inv ? pct < -1 : pct > 1;
  const pio = inv ? pct > 1  : pct < -1;
  const neu = !mel && !pio;
  const cor = neu ? "text-white/40" : mel ? "text-emerald-400" : "text-red-400";
  const bg  = neu ? "bg-white/[0.02]" : mel ? "bg-emerald-500/[0.04]" : "bg-red-500/[0.03]";
  const brd = neu ? "border-white/[0.05]" : mel ? "border-emerald-500/15" : "border-red-500/15";
  const Ico = neu ? Minus : mel ? TrendingUp : TrendingDown;
  const v   = fmt === "brl" ? `R$${fmtBRL(atual)}`
            : fmt === "x"   ? `${atual.toFixed(2)}×`
            : `${(atual * 100).toFixed(1)}%`;
  return (
    <div className={`px-4 py-3.5 rounded-[18px] border ${brd} ${bg} flex flex-col gap-1.5`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-white/20">{label}</span>
        <Ico size={11} className={cor} />
      </div>
      <p className={`text-[20px] font-black font-mono leading-none ${cor}`}>{v}</p>
      <p className={`text-[10px] font-medium opacity-70 ${cor}`}>
        {pct > 0 ? "+" : ""}{pct.toFixed(1)}% vs semana anterior
      </p>
    </div>
  );
}

function TendSemanal({ comp }: { comp: ComparSemanal }) {
  const mel = [comp.roas.pct > 2, comp.cpl.pct < -2, comp.margem.pct > 2, comp.lucro.pct > 2].filter(Boolean).length;
  const tag = mel >= 3 ? { txt: "↑ Melhorando", cor: "text-emerald-400", dot: "bg-emerald-400" }
            : mel <= 1 ? { txt: "↓ Piorando",   cor: "text-red-400",     dot: "bg-red-400"     }
            :             { txt: "→ Estável",    cor: "text-white/40",    dot: "bg-white/30"    };
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${tag.dot} ${mel <= 1 ? "animate-pulse" : ""}`} />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/20">Tendência semanal</p>
          <span className={`text-[12px] font-black ${tag.cor}`}>{tag.txt}</span>
        </div>
        <span className="text-[9px] text-white/15 flex items-center gap-1">
          <Activity size={9} /> {comp.confianca}% confiança
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <ChipTend label="ROAS"   atual={comp.roas.atual}            pct={comp.roas.pct}   fmt="x"   />
        <ChipTend label="CPL"    atual={comp.cpl.atual}             pct={comp.cpl.pct}    fmt="brl" inv />
        <ChipTend label="Margem" atual={comp.margem.atual}          pct={comp.margem.pct} fmt="pct" />
        <ChipTend label="Lucro"  atual={Math.abs(comp.lucro.atual)} pct={comp.lucro.pct}  fmt="brl" />
      </div>
      {comp.confianca < 40 && (
        <p className="mt-2.5 text-[10px] text-white/15 flex items-center gap-1.5">
          <AlertTriangle size={9} className="text-amber-400/50" />
          Histórico curto — acumule mais dados para comparação precisa.
        </p>
      )}
    </section>
  );
}

// ── Memória Estratégica ───────────────────────────────────────────────────────
function MemoriaEstrategica({ decisoes }: { decisoes: DecisaoHistorico[] }) {
  if (!decisoes.length) return null;
  const ults = decisoes.slice(0, 3).map(d => {
    const acao = (d as any).acao ?? "";
    const a    = acao.toLowerCase();
    return {
      nome:    (d as any).campanha_nome ?? (d as any).campanha ?? "Campanha",
      acao,
      data:    (d as any).data ?? new Date((d as any).created_at ?? Date.now()).toLocaleDateString("pt-BR"),
      impacto: (() => { const m = ((d as any).impacto ?? "").replace(/\./g, "").replace(",", ".").match(/[\d]+(?:\.\d+)?/); return m ? parseFloat(m[0]) : 0; })(),
      score:   (d as any).score_snapshot ?? null,
      tipo:    a.includes("paus") || a.includes("parar") ? "pausar" as const : a.includes("escal") || a.includes("aumentar") ? "escalar" as const : "outro" as const,
    };
  });
  const total = ults.reduce((s, d) => s + d.impacto, 0);
  return (
    <section className="mb-5">
      <div className="rounded-[20px] border border-purple-500/15 bg-purple-500/[0.03] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Brain size={13} className="text-purple-400" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-white">Memória Estratégica</p>
              <p className="text-[10px] text-white/25">Impacto das últimas decisões</p>
            </div>
          </div>
          {total > 0 && (
            <div className="text-right">
              <p className="text-[9px] text-white/20 uppercase tracking-widest mb-0.5">Lucro recuperado</p>
              <p className="text-[16px] font-black font-mono text-purple-400">+R${fmtBRL(total)}</p>
            </div>
          )}
        </div>
        <div className="divide-y divide-white/[0.03]">
          {ults.map((d, i) => {
            const ts = {
              pausar:  { dot: "bg-red-400",    lbl: "text-red-400/60",     label: "Pausou"  },
              escalar: { dot: "bg-emerald-400", lbl: "text-emerald-400/60", label: "Escalou" },
              outro:   { dot: "bg-white/30",    lbl: "text-white/30",       label: "Ajustou" },
            }[d.tipo];
            return (
              <div key={i} className="px-6 py-3.5 flex items-center gap-4">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ts.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold ${ts.lbl}`}>{ts.label}</span>
                    <span className="text-[12px] font-semibold text-white/60 truncate">"{d.nome}"</span>
                  </div>
                  <p className="text-[10px] text-white/20 mt-0.5 truncate">{d.acao}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {d.score !== null && <div className="text-right"><p className="text-[8px] text-white/15 uppercase tracking-widest">Score</p><p className="text-[12px] font-black font-mono text-white/35">{d.score}</p></div>}
                  {d.impacto > 0 && <div className="text-right"><p className="text-[8px] text-white/15 uppercase tracking-widest">Impacto</p><p className="text-[12px] font-black font-mono text-purple-400">+R${fmtBRL(d.impacto)}</p></div>}
                  <p className="text-[10px] text-white/15 font-mono">{d.data}</p>
                </div>
              </div>
            );
          })}
        </div>
        {decisoes.length > 3 && (
          <div className="px-6 py-3 border-t border-white/[0.04]">
            <a href="/analytics" className="text-[11px] text-white/20 hover:text-white/40 transition-colors flex items-center gap-1">
              Ver todas as {decisoes.length} decisões em Dados <ChevronRight size={11} />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Projeção 30d ──────────────────────────────────────────────────────────────
function Projecao30d({ valorHero }: { valorHero: number }) {
  if (valorHero <= 0) return null;
  return (
    <section className="mb-5">
      <div className="px-7 py-5 rounded-[20px] bg-emerald-500/[0.04] border border-emerald-500/15 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400/40 mb-1">
            Oportunidade destravável — próximos 30 dias
          </p>
          <p className="text-[36px] font-black font-mono text-emerald-400 tracking-tight">
            +R${fmtBRL(valorHero)}
          </p>
          <p className="text-[12px] text-emerald-400/40 mt-1">aplicando as recomendações agora</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400/25">
            <Sparkles size={11} /> Projeção em tempo real
          </div>
          <a href="/analytics" className="flex items-center gap-1.5 text-[11px] text-emerald-400/50 hover:text-emerald-400 transition-colors">
            Simular <ChevronRight size={11} />
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Maturidade ────────────────────────────────────────────────────────────────
function PainelMaturidade({ mat, engine, cplMedio }: {
  mat: Maturidade; engine: EngineResult; cplMedio: number;
}) {
  return (
    <div className={`p-6 rounded-[20px] border ${mat.border} ${mat.bg}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Nível da operação</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-[22px] font-black ${mat.cor}`}>{mat.nivel}</p>
            {mat.proximo !== "—" && <><ChevronRight size={14} className="text-white/20" /><p className="text-[14px] font-semibold text-white/30">{mat.proximo}</p></>}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          {[
            { l: "ROAS",   v: `${engine.roasGlobal.toFixed(2)}×`,          c: engine.roasGlobal >= 2.5    ? "text-emerald-400" : "text-amber-400" },
            { l: "Margem", v: `${(engine.margemGlobal * 100).toFixed(1)}%`, c: engine.margemGlobal >= 0.25 ? "text-emerald-400" : "text-red-400"   },
            { l: "CPL",    v: cplMedio > 0 ? `R$${fmtBRL(cplMedio)}` : "—", c: cplMedio < 30             ? "text-emerald-400" : "text-amber-400" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 justify-end">
              <span className="text-[9px] text-white/20 uppercase tracking-widest">{s.l}</span>
              <span className={`text-[12px] font-black font-mono ${s.c}`}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mb-4">
        {["bg-red-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"].map((cor, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < mat.indice ? cor : "bg-white/[0.06]"}`} />
        ))}
      </div>
      {mat.proximo !== "—" && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-white/20 uppercase tracking-widest mb-2">Para subir para {mat.proximo}:</p>
          {mat.criterios.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              {c.ok ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" /> : <div className="w-3 h-3 rounded-full border border-white/20 shrink-0 mt-0.5" />}
              <p className={`text-[12px] leading-snug ${c.ok ? "text-emerald-400/60 line-through" : "text-white/40"}`}>{c.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Risco ─────────────────────────────────────────────────────────────────────
function PainelRisco({ risco }: { risco: IndiceRisco }) {
  const ativos = risco.fatores.filter(f => f.ativo);
  const stroke = risco.valor <= 10 ? "#10b981" : risco.valor <= 30 ? "#f59e0b" : risco.valor <= 55 ? "#f97316" : "#ef4444";
  const circ   = 2 * Math.PI * 40;
  const dash   = (risco.valor / 100) * (circ * 0.75);
  return (
    <div className={`p-6 rounded-[20px] border ${risco.border} ${risco.bg}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/20 mb-1">Índice de Risco</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-[28px] font-black font-mono ${risco.cor}`}>{risco.valor}</p>
            <p className="text-[13px] text-white/20">/100</p>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${risco.bg} border ${risco.border} ${risco.cor}`}>{risco.nivel}</span>
          </div>
        </div>
        <div className="relative w-[72px] h-[56px] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 100 75" className="w-full">
            <path d="M 10 65 A 40 40 0 1 1 90 65" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
            <path d="M 10 65 A 40 40 0 1 1 90 65" fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeOpacity="0.7"
              strokeDasharray={`${dash} ${circ}`} style={{ transition: "stroke-dasharray 1s ease" }} />
          </svg>
          <p className="absolute bottom-1 text-[11px] font-black font-mono" style={{ color: stroke }}>{risco.valor}</p>
        </div>
      </div>
      {ativos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/15 mb-2">Fatores ativos</p>
          {ativos.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0"><div className="w-1 h-1 rounded-full bg-red-500/60 shrink-0" /><p className="text-[11px] text-white/40 truncate">{f.nome}</p></div>
              <p className="text-[10px] text-white/20 shrink-0">{f.detalhe}</p>
              <span className="text-[9px] font-bold text-red-400/60 w-8 text-right shrink-0">+{f.peso}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /><p className="text-[12px] text-emerald-400/60">Nenhum fator de risco ativo</p></div>
      )}
    </div>
  );
}

// ── Modo CEO ──────────────────────────────────────────────────────────────────
function ModoCEO({ estado, valorHero, risco, score, onSair }: {
  estado: EstadoConta; valorHero: number; risco: IndiceRisco; score: number; onSair: () => void;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/20">Modo CEO · Visão executiva</span>
        </div>
        <button onClick={onSair} className="text-[10px] text-white/20 hover:text-white/50 px-2.5 py-1 rounded-lg border border-white/[0.07] hover:border-white/15 transition-colors">Sair</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className={`p-5 rounded-[20px] border ${{ emerald: "border-emerald-500/20 bg-emerald-500/[0.04]", amber: "border-amber-500/20 bg-amber-500/[0.03]", red: "border-red-500/20 bg-red-500/[0.04]" }[estado.cor]}`}>
          <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Estado da Conta</p>
          <p className="text-[24px] mb-2">{estado.icone}</p>
          <p className={`text-[14px] font-bold leading-snug ${{ emerald: "text-emerald-400", amber: "text-amber-300", red: "text-red-300" }[estado.cor]}`}>{estado.manchete}</p>
        </div>
        <div className="p-5 rounded-[20px] border border-white/[0.07] bg-white/[0.02]">
          <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Score Global</p>
          <p className="text-[44px] font-black font-mono text-white leading-none mb-1">{score}</p>
          <p className="text-[11px] text-white/20">/100 · ponderado por investimento</p>
        </div>
        <div className="p-5 rounded-[20px] border border-emerald-500/15 bg-emerald-500/[0.03]">
          <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Oportunidade 30 dias</p>
          <p className="text-[32px] font-black font-mono text-emerald-400 mb-1">+R${fmtBRL(valorHero)}</p>
          <p className="text-[11px] text-emerald-400/40">aplicando recomendações</p>
        </div>
      </div>
      <div className={`px-5 py-4 rounded-[20px] border ${risco.border} ${risco.bg} flex items-center justify-between`}>
        <div className="flex items-baseline gap-3">
          <p className="text-[10px] text-white/20 uppercase tracking-widest">Risco Global</p>
          <p className={`text-[20px] font-black font-mono ${risco.cor}`}>{risco.valor}</p>
          <span className={`text-[11px] font-bold ${risco.cor}`}>{risco.nivel}</span>
        </div>
        <a href="/analytics" className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors">
          Análise completa <ChevronRight size={12} />
        </a>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════
export default function PulsePage() {
  const [dados, setDados]       = useState<CampanhaRaw[]>([]);
  const [decisoes, setDecisoes] = useState<DecisaoHistorico[]>([]);
  const [loading, setLoading]   = useState(true);
  const [config, setConfig]     = useState<UserEngineConfig | null>(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId]     = useState<string | undefined>();
  const [modoCEO, setModoCEO]   = useState(false);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ), []);

  const { historico, diasDisponiveis, ultimoSnapshot, loading: histLoading } = useHistorico(userId);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserName(formatarNome(user.email?.split("@")[0] ?? ""));
      setUserId(user.id);
      const [{ data: ads }, { data: cfg }, { data: dec }] = await Promise.all([
        supabase.from("metricas_ads").select("*").eq("user_id", user.id).in("status", ["ATIVO", "ACTIVE", "ATIVA"]),
        supabase.from("user_configs").select("ticket_medio_cliente,ticket_medio_global,taxa_conversao").eq("user_id", user.id).maybeSingle(),
        supabase.from("decisoes_historico").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      ]);
      if (ads) setDados(ads);
      if (cfg) setConfig(cfg);
      if (dec) setDecisoes(dec as DecisaoHistorico[]);
      setLoading(false);
      fetch("/api/snapshot", { method: "POST" }).catch(() => {});
    }
    load();
    fetch("/api/check-alerts", { method: "POST" }).catch(() => {});
  }, [supabase]);

  const engineConfig  = useMemo(() => resolverConfig(config), [config]);
  const engine        = useMemo(() => dados.length === 0 ? null : processarCampanhas(dados, engineConfig, 1.0, {}, {}), [dados, engineConfig]);
  const cplMedio      = engine ? calcularCPL(engine.totalGasto, engine.totalLeads) : 0;
  const totalInvest   = engine?.totalGasto ?? 0;
  const scoreGlobal   = useMemo(() => engine ? calcScorePonderado(engine) : 0, [engine]);
  const risco         = useMemo(() => engine ? calcularRisco(engine, cplMedio, totalInvest) : null, [engine, cplMedio, totalInvest]);
  const estado        = useMemo(() => engine && risco ? calcularEstado(engine, risco.valor) : null, [engine, risco]);
  const maturidade    = useMemo(() => engine ? calcularMaturidade(engine, cplMedio) : null, [engine, cplMedio]);
  const projecao      = useMemo(() => engine ? calcProjecao(engine) : null, [engine]);
  const comparSemanal = useMemo(() => calcCompar(historico), [historico]);
  const headline      = useMemo(() => engine ? gerarHeadline(engine, scoreGlobal, risco?.valor ?? 0) : null, [engine, scoreGlobal, risco]);
  const alertas24h    = useMemo(() => engine ? gerarAlertas24h(engine, dados) : [], [engine, dados]);
  const vitorias      = useMemo(() => engine ? gerarVitorias(engine, decisoes) : [], [engine, decisoes]);

  const campanhasEnriquecidas = useMemo<CampanhaEnriquecida[]>(() =>
    dados.map(c => ({ ...(c as any), m: calcMetricas(c as any) } as CampanhaEnriquecida)), [dados]);

  const ctrMedio = useMemo(() => {
    const com = dados.filter((c: any) => (c.cliques ?? 0) > 0 && (c.impressoes ?? 0) > 0);
    return com.length ? com.reduce((s: number, c: any) => s + (c.cliques / c.impressoes) * 100, 0) / com.length : 0;
  }, [dados]);

  const cpmMedio = useMemo(() => {
    const com = dados.filter((c: any) => (c.impressoes ?? 0) > 0 && (c.gasto_total ?? 0) > 0);
    return com.length ? com.reduce((s: number, c: any) => s + (c.gasto_total / c.impressoes) * 1000, 0) / com.length : 35;
  }, [dados]);

  if (loading) return (
    <div className="flex min-h-screen bg-[#0a0a0a] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-5 h-5 border-[1.5px] border-white/20 border-t-white/60 rounded-full animate-spin" />
        <p className="text-[11px] text-white/20 uppercase tracking-[0.24em]">Carregando jornal</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0b0b0d] to-[#0a0a0a] text-white">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-24 px-5 md:px-10 xl:px-14 py-10 max-w-[1400px] mx-auto w-full">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-6 pb-6 border-b border-white/[0.04]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={12} className="text-white/20" />
              <p className="text-[11px] text-white/20 tracking-wide capitalize">{getDataFormatada()}</p>
            </div>
            <h1 className="text-[1.9rem] font-bold text-white tracking-tight">
              {getSaudacao()}{userName ? `, ${userName}` : ""}.
            </h1>
            <p className="text-[13px] text-white/25 mt-1">Seu jornal de campanhas está pronto.</p>
            {engine && (
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="text-[12px] text-white/30">💰 <span className="text-white/60 font-semibold">R${fmtBRL(totalInvest)}</span> investidos</span>
                <span className="text-[12px] text-white/30">👥 <span className="text-white/60 font-semibold">{engine.totalLeads}</span> leads</span>
                <span className="text-[12px] text-white/30">📊 <span className="text-white/60 font-semibold">{engine.totalAtivos}</span> campanhas ativas</span>
                {decisoes.length > 0 && <span className="text-[12px] text-white/30">🧠 <span className="text-white/60 font-semibold">{decisoes.length}</span> decisões registradas</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {engine && (
              <button onClick={() => setModoCEO(v => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-semibold transition-all ${modoCEO ? "bg-purple-500/10 border-purple-500/25 text-purple-400" : "bg-white/[0.04] border-white/[0.07] text-white/40 hover:text-white hover:border-white/15"}`}>
                <Brain size={13} />{modoCEO ? "Sair do CEO" : "Modo CEO"}
              </button>
            )}
            <a href="/analytics" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] text-white/40 hover:text-white hover:border-white/15 text-[12px] font-semibold transition-all">
              <BarChart2 size={13} /> Centro de Inteligência
            </a>
          </div>
        </header>

        {/* SEM DADOS */}
        {!engine ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <BarChart2 size={28} className="text-white/10 mb-4" />
            <p className="text-white/25 text-[14px] font-medium mb-1">Nenhuma campanha ativa.</p>
            <p className="text-white/15 text-[12px] mb-6">Sincronize no Centro de Inteligência para começar.</p>
            <a href="/analytics" className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[13px] font-semibold hover:bg-purple-500/15 transition-all">
              Ir para Dados <ChevronRight size={14} />
            </a>
          </div>

        /* MODO CEO */
        ) : modoCEO && estado && risco && projecao ? (
          <ModoCEO estado={estado} valorHero={projecao.valorHero} risco={risco} score={scoreGlobal} onSair={() => setModoCEO(false)} />

        /* JORNAL EXECUTIVO */
        ) : (
          <>
            {/* 1 · MANCHETE DO DIA */}
            {headline && <HeadlineDoDia headline={headline} data={getDataFormatada()} />}

            {/* 2 · ALERTAS 24h */}
            {alertas24h.length > 0 && <Alertas24h alertas={alertas24h} />}

            {/* 3 · BRIEFING */}
            {estado && <BriefingCard estado={estado} score={scoreGlobal} />}

            {/* 4 · DECISÃO DO DIA */}
            <DecisaoDoDia engine={engine} />

            {/* 5 · VITÓRIAS DA SEMANA */}
            {vitorias.length > 0 && <VitoriasDaSemana vitorias={vitorias} />}

            {/* 6 · NÚMEROS FINANCEIROS */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <NumCard label="Investimento" valor={`R$${fmtBRL(totalInvest)}`} sub="total no período" Ico={DollarSign} />
              <NumCard
                label="Lucro estimado"
                valor={engine.totalLucro >= 0 ? `+R$${fmtBRL(engine.totalLucro)}` : `-R$${fmtBRL(Math.abs(engine.totalLucro))}`}
                sub="receita − investimento"
                cor={engine.totalLucro >= 0 ? "text-emerald-400" : "text-red-400"}
                Ico={TrendingUp}
              />
              <NumCard
                label="ROAS global"
                valor={`${engine.roasGlobal.toFixed(2)}×`}
                sub="retorno sobre investimento"
                cor={engine.roasGlobal >= 2.5 ? "text-emerald-400" : engine.roasGlobal >= 1.5 ? "text-amber-400" : "text-red-400"}
                Ico={ArrowUpRight}
              />
            </section>

            {/* 7 · TENDÊNCIA SEMANAL */}
            {comparSemanal && <TendSemanal comp={comparSemanal} />}

            {/* 8 · MEMÓRIA ESTRATÉGICA */}
            <MemoriaEstrategica decisoes={decisoes} />

            {/* 9 · PROJEÇÃO 30D */}
            {projecao && <Projecao30d valorHero={projecao.valorHero} />}

            {/* 10 · ERIZON INTELLIGENCE */}
            <PainelGrowthEngine
              decisoes={decisoes}
              campanhas={campanhasEnriquecidas}
              cplMedio={cplMedio}
              roasMedio={engine.roasGlobal}
              ctrMedio={ctrMedio}
              cpmMedio={cpmMedio}
            />

            {/* 11 · HISTÓRICO COMPACTO */}
            <PainelHistoricoMetricas
              historico={historico}
              diasDisponiveis={diasDisponiveis}
              ultimoSnapshot={ultimoSnapshot}
              loading={histLoading}
              titulo="Histórico de Performance"
              modo="compacto"
            />

            {/* 12 · MATURIDADE + RISCO */}
            {(maturidade || risco) && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {maturidade && <PainelMaturidade mat={maturidade} engine={engine} cplMedio={cplMedio} />}
                {risco && <PainelRisco risco={risco} />}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}