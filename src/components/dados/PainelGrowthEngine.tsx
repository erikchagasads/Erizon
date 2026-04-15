// src/components/dados/PainelGrowthEngine.tsx
// Painel que une: memoria estrategica + benchmark real da rede + diagnostico estrutural

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  Layers,
  Minus,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  calcularAssertividade,
  identificarPadroesAprendidos,
  type AssertividadeIA,
  type PadraoAprendido,
} from "@/app/lib/memoriaEstrategica";
import {
  diagnosticarConta,
  type CamadaProblema,
  type RelatorioEstrutura,
} from "@/app/lib/diagnosticoEstrutural";
import type { CampanhaBase } from "@/app/analytics/engine";
import type { CampanhaEnriquecida, DecisaoHistorico } from "@/app/analytics/types";

interface Props {
  decisoes: DecisaoHistorico[];
  campanhas: CampanhaEnriquecida[];
  cplMedio: number;
  roasMedio: number;
  ctrMedio: number;
  cpmMedio?: number;
}

type Posicao = "top10" | "top25" | "mediana" | "abaixo" | "critico";

type NetworkInsight = {
  nicho: string;
  semanaInicio: string;
  cplP25: number | null;
  cplP50: number | null;
  cplP75: number | null;
  roasP25: number | null;
  roasP50: number | null;
  roasP75: number | null;
  ctrP50: number | null;
  nWorkspaces: number;
  trendNote: string | null;
};

type NetworkPosition = {
  nicho: string;
  suaCpl: number | null;
  benchmarkCplP50: number | null;
  posicaoCpl: "top25" | "median" | "bottom25" | "unknown";
  suaRoas: number | null;
  benchmarkRoasP50: number | null;
  posicaoRoas: "top25" | "median" | "bottom25" | "unknown";
  insight: string;
};

type NetworkPayload = {
  ok: boolean;
  position: NetworkPosition | null;
  nicheInsight: NetworkInsight | null;
};

function corPosicao(p: Posicao) {
  return {
    top10: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Top 10%" },
    top25: { text: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", label: "Top 25%" },
    mediana: { text: "text-white/50", bg: "bg-white/[0.04]", border: "border-white/[0.08]", label: "Mediana" },
    abaixo: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Abaixo" },
    critico: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Critico" },
  }[p];
}

function posicaoDaRede(
  value: number | null,
  p25: number | null,
  p50: number | null,
  p75: number | null,
  inverse = false,
): Posicao {
  if (value === null || p50 === null) return "mediana";

  if (inverse) {
    if (p25 !== null && value <= p25) return "top10";
    if (value <= p50) return "top25";
    if (p75 !== null && value >= p75 * 1.15) return "critico";
    if (p75 !== null && value >= p75) return "abaixo";
    return "mediana";
  }

  if (p75 !== null && value >= p75) return "top10";
  if (value >= p50) return "top25";
  if (p25 !== null && value <= p25 * 0.85) return "critico";
  if (p25 !== null && value <= p25) return "abaixo";
  return "mediana";
}

function scoreFromPositions(posicoes: Posicao[]) {
  const pontos: Record<Posicao, number> = {
    top10: 100,
    top25: 80,
    mediana: 60,
    abaixo: 35,
    critico: 10,
  };

  return Math.round(posicoes.reduce((sum, posicao) => sum + pontos[posicao], 0) / posicoes.length);
}

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
    <div className="rounded-[20px] border border-white/[0.06] bg-[#0f0f11] p-5">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10">
            <Brain size={14} className="text-purple-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Memoria Estrategica</p>
            <p className="text-[10px] text-white/25">Erizon aprende com suas decisoes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IndiceTend size={12} className={corTend} />
          <span className="text-[10px] text-white/20">{tendenciaAprendizado}</span>
        </div>
      </div>

      {totalDecisoes === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[12px] text-white/25">Nenhuma decisao registrada ainda.</p>
          <p className="mt-1 text-[11px] text-white/15">Execute acoes para a Erizon comecar a aprender.</p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-4">
            <div>
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/15">Taxa de assertividade</p>
              <p className={`text-[38px] font-black leading-none font-mono ${corTaxa}`}>
                {taxaGeral > 0 ? `${taxaGeral}%` : "—"}
              </p>
              <p className="mt-1 text-[10px] text-white/20">{assertividade.insightPrincipal}</p>
            </div>

            <div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    taxaGeral >= 75 ? "bg-emerald-500" : taxaGeral >= 55 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${taxaGeral}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Acertos", val: acertos, cor: "text-emerald-400" },
                  { label: "Erros", val: erros, cor: "text-red-400" },
                  { label: "Aguardando", val: semDados, cor: "text-white/30" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-2 py-2.5 text-center">
                    <p className={`text-[15px] font-black font-mono ${item.cor}`}>{item.val}</p>
                    <p className="mt-0.5 text-[9px] text-white/20">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { label: "Pausas", data: assertividade.taxaPorTipo.pausar },
              { label: "Escalas", data: assertividade.taxaPorTipo.escalar },
              { label: "Ajustes", data: assertividade.taxaPorTipo.ajustar },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                <p className="mb-1 text-[9px] text-white/20">{item.label}</p>
                <p className={`text-[16px] font-black font-mono ${
                  item.data.taxa >= 70 ? "text-emerald-400" : item.data.taxa >= 50 ? "text-amber-400" : "text-white/30"
                }`}>
                  {item.data.total === 0 ? "—" : `${item.data.taxa}%`}
                </p>
                <p className="text-[9px] text-white/15">{item.data.total} decisoes</p>
              </div>
            ))}
          </div>

          {assertividade.impactoFinanceiro.totalGerado > 0 && (
            <div className="mb-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3">
              <p className="mb-1 text-[10px] text-white/20">Impacto financeiro estimado das decisoes corretas</p>
              <p className="font-mono text-[18px] font-black text-emerald-400">
                +R${assertividade.impactoFinanceiro.totalGerado.toLocaleString("pt-BR")}
              </p>
              <p className="text-[10px] text-white/20">estimado nos ultimos ciclos</p>
            </div>
          )}

          {padroes.length > 0 && (
            <>
              <button
                onClick={() => setExpandido((v) => !v)}
                className="flex w-full items-center justify-between py-2 text-[11px] text-white/30 transition-colors hover:text-white/50"
              >
                <span>{padroes.length} padrao{padroes.length > 1 ? "es" : ""} aprendido{padroes.length > 1 ? "s" : ""}</span>
                {expandido ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {expandido && (
                <div className="mt-1 space-y-2">
                  {padroes.map((padrao) => (
                    <div key={`${padrao.condicao}-${padrao.acaoRecomendada}`} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold ${
                          padrao.confianca === "alta"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : padrao.confianca === "media"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                              : "border-white/[0.07] bg-white/[0.04] text-white/30"
                        }`}>
                          {padrao.confianca}
                        </span>
                        <span className="text-[11px] font-semibold text-white/60">{padrao.condicao}</span>
                      </div>
                      <p className="text-[11px] text-white/30">
                        {padrao.acaoRecomendada} · {padrao.taxaAcerto}% de acerto ({padrao.amostras} amostras)
                      </p>
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

function PainelBenchmark({
  network,
  cplMedio,
  roasMedio,
  ctrMedio,
}: {
  network: NetworkPayload | null;
  cplMedio: number;
  roasMedio: number;
  ctrMedio: number;
}) {
  const insight = network?.nicheInsight ?? null;
  const position = network?.position ?? null;

  if (!insight) {
    return (
      <div className="rounded-[20px] border border-white/[0.06] bg-[#0f0f11] p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10">
              <BarChart3 size={14} className="text-sky-400" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Benchmark Real da Rede</p>
              <p className="text-[10px] text-white/25">Sem fallback estatico ou setor legado</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-4 py-4">
          <p className="text-[12px] leading-relaxed text-white/55">
            A rede ainda nao tem amostra suficiente do seu nicho para abrir benchmark real aqui.
            O painel fica indisponivel em vez de cair para referencias estaticas antigas.
          </p>
        </div>
      </div>
    );
  }

  const metricas = [
    {
      label: "ROAS da rede",
      valor: roasMedio > 0 ? roasMedio : null,
      benchmark50: insight.roasP50,
      posicao: posicaoDaRede(roasMedio > 0 ? roasMedio : null, insight.roasP25, insight.roasP50, insight.roasP75, false),
      insight: position?.insight ?? "Sua comparacao real vem da rede semanal anonimizada.",
      fmt: (v: number) => `${v.toFixed(2)}x`,
    },
    {
      label: "CPL da rede",
      valor: cplMedio > 0 ? cplMedio : null,
      benchmark50: insight.cplP50,
      posicao: posicaoDaRede(cplMedio > 0 ? cplMedio : null, insight.cplP25, insight.cplP50, insight.cplP75, true),
      insight: insight.trendNote ?? "A mediana da rede mostra o custo de lead praticado no nicho.",
      fmt: (v: number) => `R$${Math.round(v)}`,
    },
    {
      label: "CTR da rede",
      valor: ctrMedio > 0 ? ctrMedio : null,
      benchmark50: insight.ctrP50,
      posicao: posicaoDaRede(ctrMedio > 0 ? ctrMedio : null, null, insight.ctrP50, null, false),
      insight: insight.ctrP50
        ? "CTR ainda usa mediana da rede, sem quartis completos publicados."
        : "CTR real da rede ainda indisponivel para comparacao.",
      fmt: (v: number) => `${v.toFixed(1)}%`,
    },
  ];

  const posicoes = metricas.map((m) => m.posicao);
  const posicaoGeral: Posicao =
    posicoes.includes("critico") ? "critico" :
    posicoes.includes("abaixo") ? "abaixo" :
    posicoes.includes("top10") ? "top10" :
    posicoes.includes("top25") ? "top25" : "mediana";
  const posGeral = corPosicao(posicaoGeral);
  const scoreContextual = scoreFromPositions(posicoes);

  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-[#0f0f11] p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10">
            <BarChart3 size={14} className="text-sky-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Benchmark Real da Rede</p>
            <p className="text-[10px] text-white/25">Seu workspace vs rede anonimizada</p>
          </div>
        </div>
        <div className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold ${posGeral.bg} ${posGeral.border} ${posGeral.text}`}>
          {posGeral.label}
        </div>
      </div>

      <div className="mb-4">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
          <p className="text-[12px] text-white/60">
            Nicho real: <span className="font-semibold capitalize text-white/80">{insight.nicho}</span>
          </p>
          <p className="mt-1 text-[10px] text-white/20">
            {insight.nWorkspaces} workspaces alimentam este benchmark semanal
          </p>
        </div>
        <p className="ml-1 mt-1 text-[10px] text-white/20">
          Score contextual real: <span className={`font-bold ${
            scoreContextual >= 70 ? "text-emerald-400" : scoreContextual >= 50 ? "text-amber-400" : "text-red-400"
          }`}>{scoreContextual}/100</span>
        </p>
      </div>

      <div className="mb-4 space-y-2">
        {metricas.map((metrica) => {
          const pos = corPosicao(metrica.posicao);
          const barWidth =
            metrica.posicao === "top10" ? 95 :
            metrica.posicao === "top25" ? 75 :
            metrica.posicao === "mediana" ? 55 :
            metrica.posicao === "abaixo" ? 35 : 15;

          return (
            <div key={metrica.label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-white/30">{metrica.label}</span>
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${pos.bg} ${pos.border} ${pos.text}`}>
                    {pos.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-mono text-[13px] font-black ${pos.text}`}>
                    {metrica.valor !== null ? metrica.fmt(metrica.valor) : "—"}
                  </span>
                  <span className="ml-1.5 text-[10px] text-white/20">
                    vs {metrica.benchmark50 !== null ? metrica.fmt(metrica.benchmark50) : "—"} mediana
                  </span>
                </div>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    metrica.posicao === "top10" || metrica.posicao === "top25"
                      ? "bg-emerald-500"
                      : metrica.posicao === "mediana"
                        ? "bg-white/30"
                        : "bg-amber-500"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-white/20">{metrica.insight}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.04] px-4 py-3">
        <div className="flex items-start gap-2">
          <Target size={11} className="mt-0.5 shrink-0 text-blue-400" />
          <p className="text-[11px] leading-snug text-white/40">
            {position?.insight ?? insight.trendNote ?? "Quando a rede aponta desvio real, o ganho vem de agir antes do mercado."}
          </p>
        </div>
      </div>
    </div>
  );
}

function PainelDiagnostico({ relatorio }: { relatorio: RelatorioEstrutura }) {
  const [expandido, setExpandido] = useState(false);
  const { diagnosticoPrincipal: d, analiseFunil, scoreEstrutura, tipoOperacao, proximoSalto } = relatorio;

  const iconeCamada: Record<CamadaProblema, ReactNode> = {
    oferta: <Flame size={14} className="text-red-400" />,
    funil: <Layers size={14} className="text-amber-400" />,
    criativo: <Zap size={14} className="text-purple-400" />,
    segmentacao: <Target size={14} className="text-sky-400" />,
    orcamento: <Activity size={14} className="text-orange-400" />,
    sazonalidade: <Activity size={14} className="text-white/40" />,
    estrutura_conta: <AlertTriangle size={14} className="text-orange-400" />,
    saudavel: <ShieldCheck size={14} className="text-emerald-400" />,
  };

  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-[#0f0f11] p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            d.camada === "saudavel"
              ? "border border-emerald-500/20 bg-emerald-500/10"
              : "border border-red-500/20 bg-red-500/10"
          }`}>
            {iconeCamada[d.camada]}
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Diagnostico Estrutural</p>
            <p className="text-[10px] text-white/25">Alem da campanha, o problema raiz</p>
          </div>
        </div>
        <div className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold ${
          tipoOperacao === "growth_engine"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-white/[0.07] bg-white/[0.04] text-white/30"
        }`}>
          {tipoOperacao === "growth_engine" ? "Growth Engine" : "Media Only"}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
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
            d.urgencia === "critica" ? "text-red-400" : d.urgencia === "alta" ? "text-amber-400" : "text-white/60"
          }`}>
            {d.titulo}
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-white/30">{d.descricao}</p>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
        <div className="mb-1 flex items-center gap-2">
          <Layers size={11} className="text-white/30" />
          <p className="text-[11px] font-semibold text-white/40">Analise de Funil</p>
        </div>
        <p className="text-[12px] text-white/60">{analiseFunil.fraseGargalo}</p>
        <div className="mt-2 flex gap-4">
          <span className="text-[10px] text-white/20">CTR <span className="font-mono text-white/40">{analiseFunil.taxaClique.toFixed(1)}%</span></span>
          {analiseFunil.taxaLead > 0 && (
            <span className="text-[10px] text-white/20">
              Lead/Clique <span className="font-mono text-white/40">{(analiseFunil.taxaLead * 100).toFixed(1)}%</span>
            </span>
          )}
        </div>
      </div>

      <div className="mb-3 space-y-1.5">
        {d.evidencias.slice(0, 3).map((evidencia) => (
          <div key={evidencia} className="flex items-start gap-2">
            <Info size={10} className="mt-0.5 shrink-0 text-white/20" />
            <p className="text-[11px] leading-snug text-white/30">{evidencia}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpandido((v) => !v)}
        className="mb-2 flex w-full items-center justify-between py-1.5 text-[11px] text-white/30 transition-colors hover:text-white/50"
      >
        <span>{d.acoes.length} acoes recomendadas</span>
        {expandido ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expandido && (
        <div className="mb-3 space-y-2">
          {d.acoes.map((acao) => (
            <div key={`${acao.prazo}-${acao.acao}`} className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-2.5">
              <span className={`mt-0.5 shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-bold ${
                acao.prazo === "imediato"
                  ? "border-red-500/20 bg-red-500/10 text-red-400"
                  : acao.prazo === "7_dias"
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    : "border-white/[0.07] bg-white/[0.04] text-white/30"
              }`}>
                {acao.prazo === "imediato" ? "Agora" : acao.prazo === "7_dias" ? "7d" : "30d"}
              </span>
              <p className="text-[11px] leading-snug text-white/40">{acao.acao}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-purple-500/10 bg-purple-500/[0.04] px-4 py-3">
        <ArrowRight size={11} className="mt-0.5 shrink-0 text-purple-400" />
        <div>
          <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-purple-400/60">Proximo Salto</p>
          <p className="text-[11px] leading-snug text-white/40">{proximoSalto}</p>
        </div>
      </div>
    </div>
  );
}

export default function PainelGrowthEngine({
  decisoes,
  campanhas,
  cplMedio,
  roasMedio,
  ctrMedio,
}: Props) {
  const [network, setNetwork] = useState<NetworkPayload | null>(null);

  const assertividade = useMemo(() => calcularAssertividade(decisoes), [decisoes]);
  const padroes = useMemo(() => identificarPadroesAprendidos(decisoes), [decisoes]);

  useEffect(() => {
    let active = true;

    fetch("/api/intelligence/network")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((payload) => {
        if (active) setNetwork(payload?.ok ? (payload as NetworkPayload) : null);
      })
      .catch(() => {
        if (active) setNetwork(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const campanhasBase = useMemo<CampanhaBase[]>(() =>
    campanhas.map((c) => ({
      id: c.id,
      nome_campanha: c.nome_campanha,
      gasto_total: c.gasto_total,
      contatos: c.contatos,
      receita_estimada: c.receita_estimada,
      orcamento: c.orcamento,
      dias_ativo: c.dias_ativo ?? 7,
      impressoes: c.impressoes,
      cliques: c.cliques,
      score: c.m.score,
      roas: c.m.roas,
    })),
  [campanhas]);

  const diagnosticoRelatorio = useMemo(
    () => diagnosticarConta(campanhasBase, cplMedio, roasMedio, ctrMedio),
    [campanhasBase, cplMedio, roasMedio, ctrMedio],
  );

  const benchmarkSaudavel = network?.position?.posicaoCpl !== "bottom25" && network?.position?.posicaoRoas !== "bottom25";
  const nivelSistema = assertividade.taxaGeral >= 75 && benchmarkSaudavel
    ? { label: "Growth Engine ativo", cor: "border-emerald-500/15 bg-emerald-500/[0.03]", dot: "bg-emerald-400" }
    : { label: "Leitura real em consolidacao", cor: "border-white/[0.06] bg-white/[0.02]", dot: "bg-white/20" };

  return (
    <div className="mb-6">
      <div className={`mb-4 flex items-center justify-between rounded-[20px] border px-5 py-3.5 ${nivelSistema.cor}`}>
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${nivelSistema.dot} ${nivelSistema.dot === "bg-emerald-400" ? "animate-pulse" : ""}`} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">Erizon Intelligence</p>
          <span className="text-[10px] text-white/20">— {nivelSistema.label}</span>
        </div>
        {assertividade.totalDecisoes > 0 && (
          <span className="text-[11px] font-mono text-white/25">
            {assertividade.totalDecisoes} decisoes · {assertividade.taxaGeral}% assertividade
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PainelMemoria assertividade={assertividade} padroes={padroes} />
        <PainelBenchmark network={network} cplMedio={cplMedio} roasMedio={roasMedio} ctrMedio={ctrMedio} />
        <PainelDiagnostico relatorio={diagnosticoRelatorio} />
      </div>
    </div>
  );
}
