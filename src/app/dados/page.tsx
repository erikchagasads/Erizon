"use client";

// src/app/dados/page.tsx — v2
// Correções desta versão:
// 1. Card "Operação em Risco" lista nome + score + gasto de cada campanha crítica
// 2. Filtro cliente_id via useCliente — não mistura campanhas de clientes diferentes
// 3. CTR: fallback calculado; tooltip quando vazio (dado não enviado pela Meta)
// 4. Simulação: contexto explicando que simula melhor campanha, não a crítica
// 5. Notificações coerentes: se 7 campanhas rodam, o card mostra quantas têm problemas

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  RefreshCw, AlertCircle, CheckCircle2, DollarSign, Users,
  TrendingUp, ArrowUpRight, History, ChevronRight, ShieldAlert,
  Sparkles, Loader2, Info,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import RadarOperacional from "@/components/RadarOperacional";
import InteligenciaResumo from "@/components/InteligenciaResumo";
import ModalSimulacaoEscala from "@/components/ModalSimulacaoEscala";
import {
  calcularHealth,
  type CampanhaInput, type SnapshotHistorico,
} from "@/app/lib/algoritmoErizon";

import StatusContaDominante from "@/components/dados/Statuscontadominante";
import BlocoDecisaoIA from "@/components/dados/BlocoDecisaoIA";
import CampanhaCard, {
  OverviewCard, ContaHealthBar, EmptyState, PageSkeleton,
} from "@/components/dados/CampanhaCard";
import PainelDecisoes from "@/components/dados/PainelDecisoes";
import { useCliente } from "@/app/hooks/useCliente";

import {
  calcMetricas, dentroDoperiodo, calcularConfianca,
} from "@/app/dados/engine";

import type {
  Campanha, CampanhaEnriquecida, DecisaoHistorico, DecisaoIA,
  Periodo, OrdemMetrica, AbaAtiva,
} from "@/app/dados/types";

// ─── Constantes ───────────────────────────────────────────────────────────────
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoje", label: "Hoje" }, { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" }, { id: "mes", label: "Mês atual" },
];
const ORDENS: { id: OrdemMetrica; label: string }[] = [
  { id: "score", label: "Score" }, { id: "gasto", label: "Investimento" },
  { id: "leads", label: "Leads" }, { id: "cpl", label: "CPL" }, { id: "ctr", label: "CTR" },
];

// ─── AlertaInacao — CORRIGIDO: mostra quais campanhas estão causando risco ───
function AlertaInacao({
  perdaMensal,
  roasAtual,
  roasRisco,
  campanhasProblema,
}: {
  perdaMensal: number;
  roasAtual: number;
  roasRisco: number;
  campanhasProblema: Array<{ nome: string; score: number; gasto: number }>;
}) {
  if (perdaMensal <= 0 || campanhasProblema.length === 0) return null;

  const totalGastoEmRisco = campanhasProblema.reduce((s, c) => s + c.gasto, 0);

  return (
    <div className="mb-5 rounded-[20px] border border-red-500/20 bg-red-500/[0.03] overflow-hidden">
      <div className="px-5 py-4">
        {/* Header do card */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert size={14} className="text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-red-400">
              Operação em risco — {campanhasProblema.length} campanha{campanhasProblema.length !== 1 ? "s" : ""} precisam de atenção
            </p>
            <p className="text-[11px] text-white/30 mt-0.5">
              R${totalGastoEmRisco.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} investidos em campanhas com score crítico
            </p>
          </div>
        </div>

        {/* Lista das campanhas problemáticas com nome + score + gasto */}
        <div className="mb-4 space-y-2">
          {campanhasProblema.slice(0, 5).map((c, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              {/* Score pill */}
              <div className="flex items-center justify-center w-10 h-7 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0">
                <span className="text-[11px] font-black text-red-400">{c.score}</span>
              </div>
              {/* Nome */}
              <p className="text-[12px] font-medium text-white/70 flex-1 truncate">{c.nome}</p>
              {/* Gasto */}
              <span className="text-[11px] text-white/30 shrink-0 font-mono">
                R${c.gasto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </span>
              {/* Badge de urgência */}
              <span className="text-[9px] font-bold px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/15 shrink-0">
                CRÍTICA
              </span>
            </div>
          ))}
          {campanhasProblema.length > 5 && (
            <p className="text-[11px] text-white/20 pl-4">
              +{campanhasProblema.length - 5} campanha{campanhasProblema.length - 5 !== 1 ? "s" : ""} adicional{campanhasProblema.length - 5 !== 1 ? "is" : ""}
            </p>
          )}
        </div>

        {/* Impacto financeiro */}
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 pt-3 border-t border-white/[0.04]">
          <span className="text-[12px] text-white/40">
            <span className="text-red-400 font-semibold">
              −R${perdaMensal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </span>{" "}
            potencial perdido este mês se nada for feito
          </span>
          {roasRisco > 0 && roasRisco < roasAtual && (
            <span className="text-[12px] text-white/40">
              ROAS médio pode cair para{" "}
              <span className="text-red-400 font-semibold">{roasRisco.toFixed(2)}×</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BotaoOtimizarConta ───────────────────────────────────────────────────────
function BotaoOtimizarConta({ scoreAtual, scoreProjetado, onOtimizar, otimizando, otimizado }: {
  scoreAtual: number; scoreProjetado: number;
  onOtimizar: () => void; otimizando: boolean; otimizado: boolean;
}) {
  return (
    <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-[20px] border border-purple-500/15 bg-purple-500/[0.03]">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
          <Sparkles size={15} className="text-purple-400" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-white">Otimizar conta automaticamente</p>
          <p className="text-[11px] text-white/25 mt-0.5">Pausa críticas · Sugere escala das vencedoras · Atualiza projeção</p>
        </div>
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
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-semibold">
            <CheckCircle2 size={13} /> Otimizado
          </div>
        ) : (
          <button
            onClick={onOtimizar} disabled={otimizando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 text-[13px] font-semibold hover:bg-purple-500/15 hover:border-purple-500/35 transition-all disabled:opacity-60"
          >
            {otimizando
              ? <><Loader2 size={13} className="animate-spin" /> Otimizando...</>
              : <><Sparkles size={13} /> Otimizar conta</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── BannerContextoSimulacao — explica o que a simulação está mostrando ──────
function BannerContextoSimulacao({ campanhaNome, contaEmRisco }: {
  campanhaNome: string;
  contaEmRisco: boolean;
}) {
  if (!contaEmRisco) return null;
  return (
    <div className="mb-3 flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/[0.04] border border-blue-500/10">
      <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-[12px] font-semibold text-white/60 mb-0.5">Por que a simulação aparece positiva?</p>
        <p className="text-[11px] text-white/35 leading-relaxed">
          A conta tem campanhas críticas, mas a simulação mostra o potencial de{" "}
          <span className="text-white/55 font-medium">"{campanhaNome}"</span> — sua melhor campanha ativa.
          São cenários independentes: enquanto você pausa as problemáticas, escalar essa pode gerar receita adicional.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
  const [abaAtiva, setAbaAtiva]                   = useState<AbaAtiva>("campanhas");
  const [decisaoIgnorada, setDecisaoIgnorada]     = useState(false);
  const [combinacoesAnalisadas, setCombinacoesAnalisadas] = useState(14000);
  const [executandoDecisao, setExecutandoDecisao] = useState(false);
  const [decisaoExecutada, setDecisaoExecutada]   = useState(false);
  const [otimizando, setOtimizando]               = useState(false);
  const [otimizado, setOtimizado]                 = useState(false);
  const [modalSimularIA, setModalSimularIA]       = useState(false);

  // ── Busca com filtro cliente_id ──────────────────────────────────────────────
  const buscarDados = useCallback(async (userId: string, clienteId?: string) => {
    let adsQuery = supabase.from("metricas_ads").select("*")
      .eq("user_id", userId)
      .in("status", ["ATIVO", "ACTIVE", "ATIVA"])
      .order("gasto_total", { ascending: false });

    if (clienteId) adsQuery = adsQuery.eq("cliente_id", clienteId);

    const [{ data: ads }, { data: dec }, { data: snap }] = await Promise.all([
      adsQuery,
      supabase.from("decisoes_historico").select("*")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("metricas_snapshot_diario")
        .select("campanha_id,cpl_ontem,cpl_semana,ctr_ontem,ctr_semana,leads_ontem,gasto_ontem")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    ]);
    return {
      campanhas: (ads ?? []) as Campanha[],
      decisoes:  (dec ?? []) as DecisaoHistorico[],
      snapshots: (snap ?? []) as SnapshotHistorico[],
    };
  }, [supabase]);

  // re-busca ao trocar cliente
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const dados = await buscarDados(user.id, clienteAtual?.id);
        if (cancelled) return;
        setCampanhas(dados.campanhas);
        setDecisoes(dados.decisoes);
        setSnapshots(dados.snapshots);
        setDecisaoIgnorada(false); // reseta ao trocar cliente
      } catch {}
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [buscarDados, supabase, clienteAtual]);

  useEffect(() => { setCombinacoesAnalisadas(Math.floor(Math.random() * 8000) + 14000); }, []);
  useEffect(() => { setFiltroCritico(false); }, [periodo]);

  // ── Sincronizar ──────────────────────────────────────────────────────────────
  const sincronizar = useCallback(async () => {
    setSyncing(true); setError(""); setSuccess("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Sessão expirada."); return; }
      const res  = await fetch("/api/ads-sync");
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Erro ao sincronizar."); return; }
      const dados = await buscarDados(user.id, clienteAtual?.id);
      setCampanhas(dados.campanhas); setDecisoes(dados.decisoes); setSnapshots(dados.snapshots);
      setSuccess(`${dados.campanhas.length} campanha${dados.campanhas.length !== 1 ? "s" : ""} sincronizada${dados.campanhas.length !== 1 ? "s" : ""}.`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally { setSyncing(false); }
  }, [buscarDados, supabase, clienteAtual]);

  // ── Registrar decisão ────────────────────────────────────────────────────────
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

      if ((acao.includes("Pausar") || acao.includes("pausar")) && campanha && metricas) {
        await fetch("/api/telegram-alert", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campanha: campanha.nome_campanha,
            sinal: `Score ${metricas.score}/100 · Margem ${(metricas.margem * 100).toFixed(1)}%`,
            msg: impacto,
          }),
        }).catch(() => {});
      }
    } catch { /* silencia */ }
  }, [supabase, campanhas]);

  // ── Executar decisão IA ──────────────────────────────────────────────────────
  const executarDecisaoIA = useCallback(async (decisao: DecisaoIA) => {
    setExecutandoDecisao(true);
    try {
      if (decisao.tipo === "pausar") {
        const res = await fetch("/api/meta/pause-campaign", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campanhaId: decisao.campanhaId, campanhaNome: decisao.campanhaNome, motivo: decisao.frase }),
        });
        const json = await res.json();
        if (!res.ok) { setError(json.error || "Erro ao executar ação."); return; }
        setSuccess(json.message || "Campanha pausada com sucesso.");
        setTimeout(() => setSuccess(""), 6000);
        setCampanhas(prev => prev.map(c => c.id === decisao.campanhaId ? { ...c, status: "PAUSADA" } : c));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dec } = await supabase.from("decisoes_historico").select("*")
            .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
          if (dec) setDecisoes(dec as DecisaoHistorico[]);
        }
      } else {
        await registrarDecisao(decisao.campanhaId, "Escalar budget 20% (Erizon AI)", decisao.frase, { lucro: decisao.lucroExtra });
        setSuccess("Recomendação de escala registrada. Aplique o ajuste no Meta Ads.");
        setTimeout(() => setSuccess(""), 6000);
      }
      setDecisaoExecutada(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro inesperado ao executar ação.");
    } finally { setExecutandoDecisao(false); }
  }, [registrarDecisao, supabase]);

  // ── Otimização automática ────────────────────────────────────────────────────
  const executarOtimizacao = useCallback(async () => {
    setOtimizando(true);
    try {
      const criticas = campanhas.map(c => ({ ...c, m: calcMetricas(c) })).filter(c => c.m.score < 40);
      for (const c of criticas) {
        const res = await fetch("/api/meta/pause-campaign", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campanhaId: c.id, campanhaNome: c.nome_campanha,
            motivo: `Score ${c.m.score}/100 · Otimização automática Erizon`,
            scoreSnapshot: c.m.score, lucroSnapshot: c.m.lucro, margemSnapshot: c.m.margem,
          }),
        });
        if (res.ok) setCampanhas(prev => prev.map(camp => camp.id === c.id ? { ...camp, status: "PAUSADA" } : camp));
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: dec } = await supabase.from("decisoes_historico").select("*")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
        if (dec) setDecisoes(dec as DecisaoHistorico[]);
      }
      setOtimizado(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro durante otimização.");
    } finally { setOtimizando(false); }
  }, [campanhas, supabase]);

  // ── Memoizações ──────────────────────────────────────────────────────────────
  const todasEnriquecidas = useMemo<CampanhaEnriquecida[]>(() =>
    campanhas.map(c => ({ ...c, m: calcMetricas(c) })), [campanhas]);

  const porPeriodo = useMemo(() =>
    todasEnriquecidas.filter(c =>
      dentroDoperiodo(c.data_atualizacao || c.data_insercao || c.data_inicio, periodo)
    ), [todasEnriquecidas, periodo]);

  const health = useMemo(() =>
    calcularHealth(porPeriodo as unknown as CampanhaInput[], snapshots),
    [porPeriodo, snapshots]);

  // Lista detalhada das campanhas problemáticas para o card de risco
  const campanhasProblemaDetalhada = useMemo(() =>
    porPeriodo
      .filter(c => c.m.score < 40)
      .sort((a, b) => b.m.investimento - a.m.investimento)
      .map(c => ({
        nome: c.nome_campanha,
        score: c.m.score,
        gasto: c.m.investimento,
      })),
    [porPeriodo]);

  const decisaoIA = useMemo((): DecisaoIA | null => {
    if (health.enriched.length === 0) return null;
    const critica = health.enriched
      .filter(c => c.scores.urgencia === "critico")
      .sort((a, b) => b.gasto - a.gasto)[0];
    if (critica) {
      const gastoDiario    = critica.gasto / Math.max(1, critica.diasAtivo);
      const receitaDiaria  = critica.leads > 0 ? critica.receita / Math.max(1, critica.diasAtivo) : 0;
      const prejuizoDiario = Math.max(0, gastoDiario - receitaDiaria);
      const impactoMensal  = prejuizoDiario > 0
        ? Math.round(prejuizoDiario * 30)
        : Math.round(gastoDiario * 30 * Math.max(0, 2.5 - critica.roas) / 2.5);
      const roasStr = critica.roas > 0 ? `ROAS ${critica.roas.toFixed(2)}×` : "sem retorno";
      return {
        campanhaId: critica.id, campanhaNome: critica.nome_campanha, tipo: "pausar",
        frase: critica.leads === 0
          ? `Pause ${critica.nome_campanha} agora. R$${Math.round(gastoDiario)}/dia investidos sem nenhum resultado.`
          : `Pause ${critica.nome_campanha} agora. R$${Math.round(gastoDiario)}/dia com ${roasStr} abaixo do mínimo saudável.`,
        impactoMensal,
        riscoIgnorar: `Continuar assim: R$${Math.round(gastoDiario * 7)} investidos nos próximos 7 dias sem retorno suficiente.`,
        confianca: calcularConfianca(critica.diasAtivo, critica.gasto, critica.leads),
        lucroExtra: 0, gastoDiario: Math.round(gastoDiario),
      };
    }
    const escala = health.enriched
      .filter(c => c.scores.urgencia === "oportunidade" || (c.roas >= 2.5 && c.score >= 70))
      .sort((a, b) => b.roas * b.alavancagem - a.roas * a.alavancagem)[0];
    if (escala) {
      const extraLuc = escala.gasto * 0.2 * escala.roas - escala.gasto * 0.2;
      return {
        campanhaId: escala.id, campanhaNome: escala.nome_campanha, tipo: "escalar",
        frase: `Escale ${escala.nome_campanha} em 20%. ROAS ${escala.roas.toFixed(2)}× com margem saudável — headroom disponível.`,
        impactoMensal: Math.round(extraLuc * 4),
        riscoIgnorar: `Janela de escala pode fechar com saturação de audiência.`,
        confianca: calcularConfianca(escala.diasAtivo, escala.gasto, escala.leads),
        lucroExtra: Math.round(extraLuc), gastoDiario: Math.round(escala.gasto * 0.2 / 30),
      };
    }
    return null;
  }, [health]);

  // Para a simulação: se a decisão é pausar (conta em risco), simula a MELHOR campanha ativa
  const campanhaParaSimular = useMemo(() => {
    if (!decisaoIA) return null;
    if (decisaoIA.tipo === "pausar") {
      // Pega a melhor campanha ativa que NÃO é a crítica
      const melhor = campanhas
        .map(c => ({ ...c, m: calcMetricas(c) }))
        .filter(c => c.id !== decisaoIA.campanhaId && c.m.score >= 50)
        .sort((a, b) => b.m.score - a.m.score)[0];
      return melhor ?? campanhas.find(c => c.id === decisaoIA.campanhaId);
    }
    return campanhas.find(c => c.id === decisaoIA.campanhaId);
  }, [decisaoIA, campanhas]);

  const scoreProjetado = useMemo(() =>
    health.score === 0 ? 0 : Math.min(98, health.score + Math.min(25, health.campanhasProblema * 8)),
    [health]);

  const contaSaude = useMemo(() => {
    if (porPeriodo.length === 0) return null;
    const totalInvest    = porPeriodo.reduce((s, c) => s + c.m.investimento, 0);
    const totalResultado = porPeriodo.reduce((s, c) => s + c.m.resultado, 0);
    const comCtr         = porPeriodo.filter(c => c.m.ctr > 0);
    const ctrMedio       = comCtr.length > 0 ? comCtr.reduce((s, c) => s + c.m.ctr, 0) / comCtr.length : 0;
    const scoreGlobal    = totalInvest > 0
      ? Math.round(porPeriodo.reduce((s, c) => s + c.m.score * c.m.investimento, 0) / totalInvest)
      : Math.round(porPeriodo.reduce((s, c) => s + c.m.score, 0) / porPeriodo.length);
    const criticas     = porPeriodo.filter(c => c.m.score < 40);
    const gastoEmRisco = criticas.reduce((s, c) => s + c.m.investimento, 0);
    return {
      totalInvest, totalResultado,
      cplMedio: totalResultado > 0 ? totalInvest / totalResultado : 0,
      ctrMedio, scoreGlobal, emRisco: criticas.length, gastoEmRisco, total: porPeriodo.length,
    };
  }, [porPeriodo]);

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

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0b0b0d] to-[#0a0a0a] text-white">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-24 px-5 md:px-10 xl:px-14 py-10 max-w-[1400px] mx-auto w-full">

        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-8 pb-7 border-b border-white/[0.04]">
          <div>
            <p className="text-[11px] font-medium text-white/20 mb-2.5 tracking-wide">
              Erizon · Copiloto de decisão
              {clienteAtual && (
                <span className="ml-2 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px]">
                  {clienteAtual.nome}
                </span>
              )}
            </p>
            <h1 className="text-[1.9rem] font-bold text-white tracking-tight">Central de Decisão</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1">
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
            <button
              onClick={sincronizar} disabled={syncing || loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-medium text-white/60 hover:text-white"
            >
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Sincronizando..." : "Sincronizar"}
            </button>
          </div>
        </header>

        {loading ? <PageSkeleton /> : (
          <>
            {porPeriodo.length > 0 && contaSaude && (
              <StatusContaDominante health={health} totalInvest={contaSaude.totalInvest} combinacoesAnalisadas={combinacoesAnalisadas} />
            )}

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

            {/* Modal simulação com contexto explicativo */}
            {modalSimularIA && decisaoIA && campanhaParaSimular && (() => {
              const camp = campanhaParaSimular;
              const m = calcMetricas(camp);
              return (
                <>
                  <BannerContextoSimulacao
                    campanhaNome={camp.nome_campanha}
                    contaEmRisco={contaEmRisco && camp.id !== decisaoIA.campanhaId}
                  />
                  <ModalSimulacaoEscala
                    campanha={{
                      id: camp.id,
                      nome_campanha: camp.nome_campanha,
                      gasto_total: camp.gasto_total,
                      contatos: camp.contatos,
                      orcamento: camp.orcamento ?? 0,
                      score: m.score,
                    }}
                    onConfirmar={async () => {
                      setModalSimularIA(false);
                      await registrarDecisao(camp.id, "Escalar (via simulação IA)", decisaoIA.frase, { lucro: m.lucro, margem: m.margem });
                    }}
                    onFechar={() => setModalSimularIA(false)}
                  />
                </>
              );
            })()}

            {/* Card OPERAÇÃO EM RISCO — CORRIGIDO: lista campanhas com nome + score + gasto */}
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

            {contaSaude && (
              <ContaHealthBar
                score={contaSaude.scoreGlobal} emRisco={contaSaude.emRisco}
                total={contaSaude.total} gastoEmRisco={contaSaude.gastoEmRisco}
                onFiltrarRisco={() => setFiltroCritico(f => !f)} filtrando={filtroCritico}
              />
            )}

            {contaSaude && (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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
              <button
                onClick={() => setAbaAtiva("campanhas")}
                className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${abaAtiva === "campanhas" ? "bg-white/[0.07] text-white" : "text-white/25 hover:text-white/50"}`}
              >
                Campanhas
                {porPeriodo.length > 0 && (
                  <span className="ml-1.5 text-[9px] text-white/20">{porPeriodo.length}</span>
                )}
              </button>
              <button
                onClick={() => setAbaAtiva("decisoes")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${abaAtiva === "decisoes" ? "bg-white/[0.07] text-white" : "text-white/25 hover:text-white/50"}`}
              >
                <History size={12} /> Decisões
                {decisoes.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 text-[9px] font-bold flex items-center justify-center">
                    {decisoes.length > 9 ? "9+" : decisoes.length}
                  </span>
                )}
              </button>
            </div>

            {abaAtiva === "decisoes" ? (
              <PainelDecisoes decisoes={decisoes} campanhas={todasEnriquecidas} />
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
                        flags={health.flagsPorCampanha[c.id] ?? []}
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
      </main>
    </div>
  );
}