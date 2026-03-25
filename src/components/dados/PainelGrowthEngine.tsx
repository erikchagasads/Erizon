// src/components/dados/PainelGrowthEngine.tsx
// Painel que une: Memória Estratégica + Benchmark + Diagnóstico Estrutural
// "De engine de mídia para engine de crescimento"

"use client";

import { useMemo, useState } from "react";
import {
  Brain, TrendingUp, TrendingDown, Minus, Target, BarChart3,
  AlertTriangle, Zap, ArrowRight,
  Flame, Layers, Activity, ChevronDown, ChevronUp,
  ShieldCheck, Info,
} from "lucide-react";

import {
  calcularAssertividade,
  identificarPadroesAprendidos,
  type AssertividadeIA,
  type PadraoAprendido,
} from "@/app/lib/memoriaEstrategica";

import {
  gerarRelatorioComparativo,
  SETORES_DISPONIVEIS,
  type RelatorioComparativo,
  type Setor,
  type Posicao,
} from "@/app/lib/benchmarkSetor";

import {
  diagnosticarConta,
  type RelatorioEstrutura,
  type CamadaProblema,
} from "@/app/lib/diagnosticoEstrutural";

import type { DecisaoHistorico, CampanhaEnriquecida } from "@/app/analytics/types";
import type { CampanhaBase } from "@/app/analytics/engine";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  decisoes: DecisaoHistorico[];
  campanhas: CampanhaEnriquecida[];
  cplMedio: number;
  roasMedio: number;
  ctrMedio: number;
  cpmMedio?: number;
  setorInicial?: Setor;
}

// ─── Helpers de cor ───────────────────────────────────────────────────────────

function corPosicao(p: Posicao) {
  return {
    top10:   { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Top 10%" },
    top25:   { text: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/20",     label: "Top 25%" },
    mediana: { text: "text-white/50",    bg: "bg-white/[0.04]",   border: "border-white/[0.08]",   label: "Mediana"  },
    abaixo:  { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   label: "Abaixo"   },
    critico: { text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     label: "Crítico"  },
  }[p];
}


// ─── Sub-componentes ──────────────────────────────────────────────────────────

// A) MEMÓRIA ESTRATÉGICA
function PainelMemoria({
  assertividade,
  padroes,
}: {
  assertividade: AssertividadeIA;
  padroes: PadraoAprendido[];
}) {
  const [expandido, setExpandido] = useState(false);
  const { taxaGeral, totalDecisoes, acertos, erros, semDados, tendenciaAprendizado } = assertividade;
  const corTaxa = taxaGeral >= 75 ? "text-emerald-400" : taxaGeral >= 55 ? "text-amber-400" : "text-red-400";
  const IndiceTend = tendenciaAprendizado === "melhorando" ? TrendingUp : tendenciaAprendizado === "piorando" ? TrendingDown : Minus;
  const corTend = tendenciaAprendizado === "melhorando" ? "text-emerald-400" : tendenciaAprendizado === "piorando" ? "text-red-400" : "text-white/30";

  return (
    <div className="p-5 rounded-[20px] bg-[#0f0f11] border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Brain size={14} className="text-purple-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Memória Estratégica</p>
            <p className="text-[10px] text-white/25">Erizon aprende com suas decisões</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IndiceTend size={12} className={corTend} />
          <span className="text-[10px] text-white/20">{tendenciaAprendizado}</span>
        </div>
      </div>

      {/* Assertividade central */}
      {totalDecisoes === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[12px] text-white/25">Nenhuma decisão registrada ainda.</p>
          <p className="text-[11px] text-white/15 mt-1">Execute ações para a Erizon começar a aprender.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 mb-5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/15 mb-1">Taxa de assertividade</p>
              <p className={`text-[38px] font-black font-mono leading-none ${corTaxa}`}>
                {taxaGeral > 0 ? `${taxaGeral}%` : "—"}
              </p>
              <p className="text-[10px] text-white/20 mt-1">{assertividade.insightPrincipal}</p>
            </div>
            <div>
              {/* Barra visual */}
              <div className="h-2 rounded-full bg-white/[0.05] mb-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    taxaGeral >= 75 ? "bg-emerald-500" : taxaGeral >= 55 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${taxaGeral}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "✓ Acertos", val: acertos, cor: "text-emerald-400" },
                  { label: "✗ Erros",   val: erros,   cor: "text-red-400"     },
                  { label: "⏳ Aguardando", val: semDados, cor: "text-white/30" },
                ].map((item, i) => (
                  <div key={i} className="text-center px-2 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className={`text-[15px] font-black font-mono ${item.cor}`}>{item.val}</p>
                    <p className="text-[9px] text-white/20 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Taxa por tipo */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Pausas", data: assertividade.taxaPorTipo.pausar },
              { label: "Escalas", data: assertividade.taxaPorTipo.escalar },
              { label: "Ajustes", data: assertividade.taxaPorTipo.ajustar },
            ].map((item, i) => (
              <div key={i} className="px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <p className="text-[9px] text-white/20 mb-1">{item.label}</p>
                <p className={`text-[16px] font-black font-mono ${
                  item.data.taxa >= 70 ? "text-emerald-400" : item.data.taxa >= 50 ? "text-amber-400" : "text-white/30"
                }`}>
                  {item.data.total === 0 ? "—" : `${item.data.taxa}%`}
                </p>
                <p className="text-[9px] text-white/15">{item.data.total} decisões</p>
              </div>
            ))}
          </div>

          {/* Impacto financeiro */}
          {assertividade.impactoFinanceiro.totalGerado > 0 && (
            <div className="px-4 py-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/15 mb-4">
              <p className="text-[10px] text-white/20 mb-1">Impacto financeiro das decisões corretas</p>
              <p className="text-[18px] font-black font-mono text-emerald-400">
                +R${assertividade.impactoFinanceiro.totalGerado.toLocaleString("pt-BR")}
              </p>
              <p className="text-[10px] text-white/20">estimado nos últimos ciclos</p>
            </div>
          )}

          {/* Padrões aprendidos */}
          {padroes.length > 0 && (
            <>
              <button
                onClick={() => setExpandido(v => !v)}
                className="w-full flex items-center justify-between py-2 text-[11px] text-white/30 hover:text-white/50 transition-colors"
              >
                <span>{padroes.length} padrão{padroes.length > 1 ? "s" : ""} aprendido{padroes.length > 1 ? "s" : ""}</span>
                {expandido ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {expandido && (
                <div className="space-y-2 mt-1">
                  {padroes.map((p, i) => (
                    <div key={i} className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                          p.confianca === "alta" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : p.confianca === "media" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-white/[0.04] text-white/30 border-white/[0.07]"
                        }`}>{p.confianca}</span>
                        <span className="text-[11px] font-semibold text-white/60">{p.condicao}</span>
                      </div>
                      <p className="text-[11px] text-white/30">{p.acaoRecomendada} — {p.taxaAcerto}% de acerto ({p.amostras} amostras)</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// B) BENCHMARK INTELIGENTE
function PainelBenchmark({
  relatorio,
  setorAtual,
  onMudarSetor,
}: {
  relatorio: RelatorioComparativo;
  setorAtual: Setor;
  onMudarSetor: (s: Setor) => void;
}) {
  const posGeral = corPosicao(relatorio.posicaoGeral);

  const metricas = [
    { label: "ROAS",  comp: relatorio.roas, inverso: false, fmt: (v: number) => `${v.toFixed(2)}×` },
    { label: "CPL",   comp: relatorio.cpl,  inverso: true,  fmt: (v: number) => `R$${Math.round(v)}` },
    { label: "CTR",   comp: relatorio.ctr,  inverso: false, fmt: (v: number) => `${v.toFixed(1)}%` },
    { label: "CPM",   comp: relatorio.cpm,  inverso: true,  fmt: (v: number) => `R$${Math.round(v)}` },
  ];

  return (
    <div className="p-5 rounded-[20px] bg-[#0f0f11] border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <BarChart3 size={14} className="text-sky-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Benchmark do Setor</p>
            <p className="text-[10px] text-white/25">Você vs mercado real</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${posGeral.bg} ${posGeral.border} ${posGeral.text}`}>
          {posGeral.label}
        </div>
      </div>

      {/* Seletor de setor */}
      <div className="mb-4">
        <select
          value={setorAtual}
          onChange={e => onMudarSetor(e.target.value as Setor)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] text-white/60 focus:outline-none focus:border-white/20 appearance-none cursor-pointer"
        >
          {SETORES_DISPONIVEIS.map(s => (
            <option key={s.id} value={s.id} className="bg-[#111113]">{s.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-white/20 mt-1 ml-1">
          Score contextual: <span className={`font-bold ${relatorio.scoreContextual >= 70 ? "text-emerald-400" : relatorio.scoreContextual >= 50 ? "text-amber-400" : "text-red-400"}`}>{relatorio.scoreContextual}/100</span>
        </p>
      </div>

      {/* Métricas comparativas */}
      <div className="space-y-2 mb-4">
        {metricas.map((m, i) => {
          const pos = corPosicao(m.comp.posicao);
          const barWidth = m.comp.posicao === "top10" ? 95
            : m.comp.posicao === "top25" ? 75
            : m.comp.posicao === "mediana" ? 55
            : m.comp.posicao === "abaixo" ? 35 : 15;
          return (
            <div key={i} className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-white/30">{m.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${pos.bg} ${pos.border} ${pos.text}`}>
                    {pos.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-[13px] font-black font-mono ${pos.text}`}>
                    {m.fmt(m.comp.valor)}
                  </span>
                  <span className="text-[10px] text-white/20 ml-1.5">
                    vs {m.fmt(m.comp.benchmark50)} mediana
                  </span>
                </div>
              </div>
              <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    m.comp.posicao === "top10" || m.comp.posicao === "top25" ? "bg-emerald-500" :
                    m.comp.posicao === "mediana" ? "bg-white/30" : "bg-amber-500"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <p className="text-[10px] text-white/20 mt-1.5">{m.comp.insight}</p>
            </div>
          );
        })}
      </div>

      {/* Oportunidade principal */}
      <div className="px-4 py-3 rounded-xl bg-blue-500/[0.04] border border-blue-500/10">
        <div className="flex items-start gap-2">
          <Target size={11} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/40 leading-snug">{relatorio.oportunidadePrincipal}</p>
        </div>
      </div>
    </div>
  );
}

// C) DIAGNÓSTICO ESTRUTURAL
function PainelDiagnostico({ relatorio }: { relatorio: RelatorioEstrutura }) {
  const [expandido, setExpandido] = useState(false);
  const { diagnosticoPrincipal: d, analiseFunil, scoreEstrutura, tipoOperacao, proximoSalto } = relatorio;

  const iconeCamada: Record<CamadaProblema, React.ReactNode> = {
    oferta:          <Flame size={14} className="text-red-400" />,
    funil:           <Layers size={14} className="text-amber-400" />,
    criativo:        <Zap size={14} className="text-purple-400" />,
    segmentacao:     <Target size={14} className="text-sky-400" />,
    orcamento:       <Activity size={14} className="text-orange-400" />,
    sazonalidade:    <Activity size={14} className="text-white/40" />,
    estrutura_conta: <AlertTriangle size={14} className="text-orange-400" />,
    saudavel:        <ShieldCheck size={14} className="text-emerald-400" />,
  };

  return (
    <div className="p-5 rounded-[20px] bg-[#0f0f11] border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            d.camada === "saudavel"
              ? "bg-emerald-500/10 border border-emerald-500/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}>
            {iconeCamada[d.camada]}
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Diagnóstico Estrutural</p>
            <p className="text-[10px] text-white/25">Além da campanha — o problema raiz</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${
          tipoOperacao === "growth_engine"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-white/[0.04] border-white/[0.07] text-white/30"
        }`}>
          {tipoOperacao === "growth_engine" ? "Growth Engine" : "Media Only"}
        </div>
      </div>

      {/* Score estrutura */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
            <circle cx="28" cy="28" r="22" fill="none"
              stroke={scoreEstrutura >= 70 ? "#10b981" : scoreEstrutura >= 50 ? "#f59e0b" : "#ef4444"}
              strokeWidth="4"
              strokeDasharray={`${(scoreEstrutura / 100) * 138} 138`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-black text-white">
            {scoreEstrutura}
          </span>
        </div>
        <div>
          <p className={`text-[13px] font-bold ${
            d.urgencia === "critica" ? "text-red-400" :
            d.urgencia === "alta"   ? "text-amber-400" : "text-white/60"
          }`}>
            {d.titulo}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5 leading-snug">{d.descricao}</p>
        </div>
      </div>

      {/* Funil */}
      <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Layers size={11} className="text-white/30" />
          <p className="text-[11px] font-semibold text-white/40">Análise de Funil</p>
        </div>
        <p className="text-[12px] text-white/60">{analiseFunil.fraseGargalo}</p>
        <div className="flex gap-4 mt-2">
          <span className="text-[10px] text-white/20">CTR <span className="text-white/40 font-mono">{analiseFunil.taxaClique.toFixed(1)}%</span></span>
          {analiseFunil.taxaLead > 0 && (
            <span className="text-[10px] text-white/20">Lead/Clique <span className="text-white/40 font-mono">{(analiseFunil.taxaLead * 100).toFixed(1)}%</span></span>
          )}
        </div>
      </div>

      {/* Evidências */}
      <div className="space-y-1.5 mb-3">
        {d.evidencias.slice(0, 3).map((ev, i) => (
          <div key={i} className="flex items-start gap-2">
            <Info size={10} className="text-white/20 shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/30 leading-snug">{ev}</p>
          </div>
        ))}
      </div>

      {/* Ações */}
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center justify-between mb-2 py-1.5 text-[11px] text-white/30 hover:text-white/50 transition-colors"
      >
        <span>{d.acoes.length} ações recomendadas</span>
        {expandido ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expandido && (
        <div className="space-y-2 mb-3">
          {d.acoes.map((a, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 mt-0.5 ${
                a.prazo === "imediato" ? "bg-red-500/10 text-red-400 border-red-500/20"
                : a.prazo === "7_dias" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-white/[0.04] text-white/30 border-white/[0.07]"
              }`}>
                {a.prazo === "imediato" ? "Agora" : a.prazo === "7_dias" ? "7d" : "30d"}
              </span>
              <p className="text-[11px] text-white/40 leading-snug">{a.acao}</p>
            </div>
          ))}
        </div>
      )}

      {/* Próximo salto */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-purple-500/[0.04] border border-purple-500/10">
        <ArrowRight size={11} className="text-purple-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-purple-400/60 mb-0.5">Próximo Salto</p>
          <p className="text-[11px] text-white/40 leading-snug">{proximoSalto}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PainelGrowthEngine({
  decisoes,
  campanhas,
  cplMedio,
  roasMedio,
  ctrMedio,
  cpmMedio = 35,
  setorInicial = "geral",
}: Props) {
  const [setor, setSetor] = useState<Setor>(setorInicial);

  const assertividade = useMemo(() => calcularAssertividade(decisoes), [decisoes]);
  const padroes       = useMemo(() => identificarPadroesAprendidos(decisoes), [decisoes]);

  const benchmarkRelatorio = useMemo(() =>
    gerarRelatorioComparativo({ cplMedio, roasMedio, ctrMedio, cpmMedio, setor }),
    [cplMedio, roasMedio, ctrMedio, cpmMedio, setor]
  );

  const campanhasBase = useMemo<CampanhaBase[]>(() =>
    campanhas.map(c => ({
      id:               c.id,
      nome_campanha:    c.nome_campanha,
      gasto_total:      c.gasto_total,
      contatos:         c.contatos,
      receita_estimada: c.receita_estimada,
      orcamento:        c.orcamento,
      dias_ativo:       c.dias_ativo ?? 7,
      impressoes:       c.impressoes,
      cliques:          c.cliques,
      score:            c.m.score,
      roas:             c.m.roas,
    })),
    [campanhas]
  );

  const diagnosticoRelatorio = useMemo(() =>
    diagnosticarConta(campanhasBase, cplMedio, roasMedio, ctrMedio),
    [campanhasBase, cplMedio, roasMedio, ctrMedio]
  );

  // Banner de nível do sistema
  const nivelSistema = assertividade.taxaGeral >= 75 && benchmarkRelatorio.posicaoGeral !== "critico"
    ? { label: "Growth Engine ativo", cor: "border-emerald-500/15 bg-emerald-500/[0.03]", dot: "bg-emerald-400" }
    : { label: "Coleta de dados em andamento", cor: "border-white/[0.06] bg-white/[0.02]", dot: "bg-white/20" };

  return (
    <div className="mb-6">
      {/* Título do bloco */}
      <div className={`flex items-center justify-between px-5 py-3.5 rounded-[20px] border ${nivelSistema.cor} mb-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${nivelSistema.dot} ${nivelSistema.dot === "bg-emerald-400" ? "animate-pulse" : ""}`} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">Erizon Intelligence</p>
          <span className="text-[10px] text-white/20">— {nivelSistema.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {assertividade.totalDecisoes > 0 && (
            <span className="text-[11px] text-white/25 font-mono">
              {assertividade.totalDecisoes} decisões · {assertividade.taxaGeral}% assertividade
            </span>
          )}
        </div>
      </div>

      {/* Grid 3 painéis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PainelMemoria assertividade={assertividade} padroes={padroes} />
        <PainelBenchmark relatorio={benchmarkRelatorio} setorAtual={setor} onMudarSetor={setSetor} />
        <PainelDiagnostico relatorio={diagnosticoRelatorio} />
      </div>
    </div>
  );
}