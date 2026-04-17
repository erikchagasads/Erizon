"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCliente } from "@/app/hooks/useCliente";
import Sidebar from "@/components/Sidebar";
import {
  ArrowLeft, Zap, Loader2, CheckCircle2, AlertTriangle,
  XCircle, Info, ChevronDown, ChevronUp, Gauge, Users,
} from "lucide-react";
import type { PreflightResult, PreflightRisk } from "@/core/preflight-engine";

const OBJETIVOS = [
  { id: "LEADS", label: "Geração de Leads" },
  { id: "SALES", label: "Conversões / Vendas" },
  { id: "TRAFFIC", label: "Tráfego" },
  { id: "AWARENESS", label: "Reconhecimento de Marca" },
  { id: "ENGAGEMENT", label: "Engajamento" },
];

const FORMATOS = [
  { id: "video", label: "Vídeo" },
  { id: "imagem", label: "Imagem estática" },
  { id: "carrossel", label: "Carrossel" },
];

function SeverityIcon({ s }: { s: PreflightRisk["severity"] }) {
  if (s === "critical") return <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />;
  if (s === "warning") return <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />;
  return <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />;
}

function ScoreGauge({ score, classification }: { score: number; classification: PreflightResult["classification"] }) {
  const color =
    classification === "excellent" ? "#34d399" :
    classification === "good"      ? "#a78bfa" :
    classification === "risky"     ? "#fb923c" :
    "#f87171";

  const label =
    classification === "excellent" ? "Excelente — pronta para lançar" :
    classification === "good"      ? "Boa — pequenos ajustes recomendados" :
    classification === "risky"     ? "Arriscada — corrija antes de lançar" :
    "Crítica — não lance assim";

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
          <circle
            cx="60" cy="60" r="52" fill="none"
            stroke={color} strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 326.7} 326.7`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[32px] font-black" style={{ color }}>{score}</span>
          <span className="text-[10px] text-white/30 font-semibold -mt-1">/ 100</span>
        </div>
      </div>
      <p className="text-[13px] font-semibold text-center" style={{ color }}>{label}</p>
    </div>
  );
}

export default function NovaPage() {
  const router = useRouter();
  const { clientes, clienteAtual, loading: loadingClientes, selecionarCliente } = useCliente();

  const [step, setStep] = useState<"form" | "result">("form");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  // Form state
  const [objetivo, setObjetivo]                     = useState("LEADS");
  const [orcamento, setOrcamento]                   = useState("");
  const [audiencia, setAudiencia]                   = useState("");
  const [formato, setFormato]                       = useState("video");
  const [temCTA, setTemCTA]                         = useState(true);
  const [duracao, setDuracao]                       = useState("");
  const [velocidade, setVelocidade]                 = useState("");
  const [temPixel, setTemPixel]                     = useState(true);
  const [publicoCustom, setPublicoCustom]           = useState(false);
  const [metaCpl, setMetaCpl]                       = useState("");
  const [campaignName, setCampaignName]             = useState("");

  async function analisar() {
    if (!orcamento) return;
    setLoading(true);

    const body = {
      clientId: clienteAtual?.id,
      campaignName,
      objetivo,
      orcamentoDiario: parseFloat(orcamento),
      audienciaSize:   audiencia ? parseFloat(audiencia) * 1000 : undefined,
      criativo: {
        formato,
        temCTA,
        duracaoSegundos: formato === "video" && duracao ? parseInt(duracao) : undefined,
      },
      velocidadeUrl: velocidade ? parseFloat(velocidade) : undefined,
      temPixel,
      publicoCustom,
      metaCpl: metaCpl ? parseFloat(metaCpl) : undefined,
    };

    const res = await fetch("/api/campaigns/preflight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      setResult(data.result);
      setStep("result");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-[#060609] text-white">
      <Sidebar />
      <main className="md:ml-[60px] pb-20 md:pb-0 flex-1 px-8 py-8 max-w-2xl">

        <button onClick={() => step === "result" ? setStep("form") : router.push("/campanhas")}
          className="flex items-center gap-2 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-6">
          <ArrowLeft size={13} />
          {step === "result" ? "Refazer análise" : "Campanhas"}
        </button>

        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <Gauge size={16} className="text-purple-400" />
            <h1 className="text-[22px] font-bold">Pre-flight de Campanha</h1>
          </div>
          <p className="text-[12px] text-white/30">
            Analise o setup antes de gastar um real. Score 0-100 + diagnóstico completo.
          </p>
        </div>

        {step === "form" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-purple-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">Contexto do cliente</p>
              </div>

              {loadingClientes ? (
                <div className="flex items-center gap-2 text-[12px] text-white/35">
                  <Loader2 size={13} className="animate-spin text-white/30" />
                  Carregando clientes...
                </div>
              ) : clientes.length === 0 ? (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <p className="text-[12px] text-white/55">Nenhum cliente cadastrado.</p>
                  <p className="mt-1 text-[11px] text-white/30">
                    O preflight ainda funciona, mas sem DNA, metas e memoria especifica do cliente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-white/35">
                    Selecione um cliente para enriquecer a previsao com historico, Profit DNA e memoria operacional.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => selecionarCliente(null)}
                      className={`px-4 py-2 rounded-xl border text-[12px] font-semibold transition-all ${
                        !clienteAtual
                          ? "border-purple-500/40 bg-purple-500/[0.10] text-purple-300"
                          : "border-white/[0.07] text-white/45 hover:text-white/70 hover:bg-white/[0.04]"
                      }`}
                    >
                      Sem cliente
                    </button>
                    {clientes.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => selecionarCliente(cliente)}
                        className={`px-4 py-2 rounded-xl border text-[12px] font-semibold transition-all ${
                          clienteAtual?.id === cliente.id
                            ? "border-purple-500/40 bg-purple-500/[0.10] text-purple-300"
                            : "border-white/[0.07] text-white/45 hover:text-white/70 hover:bg-white/[0.04]"
                        }`}
                      >
                        {cliente.nome_cliente ?? cliente.nome}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/28">
                    {clienteAtual
                      ? `Preflight enriquecido para ${clienteAtual.nome_cliente ?? clienteAtual.nome}.`
                      : "Preflight generico da conta, sem contexto de cliente."}
                  </p>
                </div>
              )}
            </div>

            {/* Nome */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">Identificação</p>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                  Nome da campanha (opcional)
                </label>
                <input
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="Ex: Leads Agosto — Público Frio"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-colors"
                />
              </div>
            </div>

            {/* Objetivo + Orçamento */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">Configuração</p>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">Objetivo</label>
                <div className="grid grid-cols-2 gap-2">
                  {OBJETIVOS.map(o => (
                    <button key={o.id} onClick={() => setObjetivo(o.id)}
                      className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold border transition-all text-left ${
                        objetivo === o.id
                          ? "border-purple-500/40 bg-purple-500/[0.1] text-purple-300"
                          : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:bg-white/[0.05]"
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                    Orçamento diário (R$)
                  </label>
                  <input
                    type="number" value={orcamento} onChange={e => setOrcamento(e.target.value)}
                    placeholder="100"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                    CPL alvo (R$)
                  </label>
                  <input
                    type="number" value={metaCpl} onChange={e => setMetaCpl(e.target.value)}
                    placeholder="50"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                  Tamanho do público (em mil pessoas)
                </label>
                <input
                  type="number" value={audiencia} onChange={e => setAudiencia(e.target.value)}
                  placeholder="500 (= 500 mil)"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-colors"
                />
              </div>
            </div>

            {/* Criativo */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">Criativo</p>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">Formato</label>
                <div className="flex gap-2">
                  {FORMATOS.map(f => (
                    <button key={f.id} onClick={() => setFormato(f.id)}
                      className={`flex-1 px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
                        formato === f.id
                          ? "border-purple-500/40 bg-purple-500/[0.1] text-purple-300"
                          : "border-white/[0.07] text-white/40 hover:bg-white/[0.04]"
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {formato === "video" && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                    Duração do vídeo (segundos)
                  </label>
                  <input
                    type="number" value={duracao} onChange={e => setDuracao(e.target.value)}
                    placeholder="30"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-colors"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-white/70">Tem CTA claro?</p>
                  <p className="text-[10px] text-white/30">Ex: &quot;Fale agora&quot;, &quot;Saiba mais&quot;</p>
                </div>
                <button onClick={() => setTemCTA(v => !v)}
                  className={`w-10 h-6 rounded-full border transition-all ${temCTA ? "bg-purple-600 border-purple-500" : "bg-white/[0.06] border-white/[0.1]"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${temCTA ? "translate-x-4" : ""}`} />
                </button>
              </div>
            </div>

            {/* Técnico */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">Técnico</p>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5 block">
                  Velocidade de carregamento da página (segundos)
                </label>
                <input
                  type="number" step="0.1" value={velocidade} onChange={e => setVelocidade(e.target.value)}
                  placeholder="2.5"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 transition-colors"
                />
                <p className="text-[10px] text-white/20 mt-1">Use PageSpeed Insights para medir</p>
              </div>

              {[
                { label: "Pixel do Meta instalado?", sub: "Rastreamento de conversões", val: temPixel, set: setTemPixel },
                { label: "Usa Custom Audience ou Lookalike?", sub: "Público baseado em dados próprios", val: publicoCustom, set: setPublicoCustom },
              ].map(({ label, sub, val, set }) => (
                <div key={label} className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-white/70">{label}</p>
                    <p className="text-[10px] text-white/30">{sub}</p>
                  </div>
                  <button onClick={() => set((v: boolean) => !v)}
                    className={`w-10 h-6 rounded-full border transition-all ${val ? "bg-purple-600 border-purple-500" : "bg-white/[0.06] border-white/[0.1]"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${val ? "translate-x-4" : ""}`} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={analisar}
              disabled={loading || !orcamento}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-[14px] font-bold text-white transition-all disabled:opacity-40 shadow-[0_0_30px_rgba(168,85,247,0.3)]"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {loading ? "Analisando..." : "Analisar Campanha"}
            </button>
          </div>
        )}

        {/* RESULTADO */}
        {step === "result" && result && (
          <div className="space-y-4">
            {/* Score gauge */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <ScoreGauge score={result.score} classification={result.classification} />

              {/* CPL e ROAS estimados */}
              {(result.estimatedCplMin || result.estimatedRoas) && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {result.estimatedCplMin && (
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                      <p className="text-[9px] text-white/30 uppercase font-semibold mb-1">CPL Estimado</p>
                      <p className="text-[15px] font-bold text-white">
                        R${result.estimatedCplMin}–{result.estimatedCplMax}
                      </p>
                    </div>
                  )}
                  {result.estimatedRoas && (
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                      <p className="text-[9px] text-white/30 uppercase font-semibold mb-1">ROAS Estimado</p>
                      <p className="text-[15px] font-bold text-white">{result.estimatedRoas}x</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pronto para lançar? */}
              <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-xl border ${
                result.readyToLaunch
                  ? "bg-emerald-500/[0.06] border-emerald-500/20"
                  : "bg-red-500/[0.06] border-red-500/20"
              }`}>
                {result.readyToLaunch
                  ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  : <XCircle size={14} className="text-red-400 shrink-0" />}
                <p className={`text-[12px] font-semibold ${result.readyToLaunch ? "text-emerald-400" : "text-red-400"}`}>
                  {result.readyToLaunch
                    ? "Pronto para lançar — boa configuração detectada"
                    : "Não lance ainda — corrija os pontos críticos primeiro"}
                </p>
              </div>
            </div>

            {/* Recomendação principal */}
            <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.04] px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">Recomendação principal</p>
              <p className="text-[13px] text-white/70 leading-relaxed">{result.topRecommendation}</p>
            </div>

            {/* Lista de riscos */}
            {result.risks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/25">
                  {result.risks.length} pontos de atenção
                </p>
                {result.risks.map(risk => (
                  <div key={risk.id}
                    className={`rounded-2xl border overflow-hidden transition-all ${
                      risk.severity === "critical" ? "border-red-500/20 bg-red-500/[0.04]"
                      : risk.severity === "warning" ? "border-amber-500/15 bg-amber-500/[0.03]"
                      : "border-white/[0.07] bg-white/[0.02]"
                    }`}>
                    <button
                      onClick={() => setExpandedRisk(expandedRisk === risk.id ? null : risk.id)}
                      className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
                    >
                      <SeverityIcon s={risk.severity} />
                      <div className="flex-1">
                        <p className="text-[12px] font-semibold text-white/80">{risk.label}</p>
                        <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">{risk.detail}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          risk.severity === "critical" ? "bg-red-500/10 border-red-500/20 text-red-400"
                          : risk.severity === "warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        }`}>
                          -{risk.impactScore}pts
                        </span>
                        {expandedRisk === risk.id ? <ChevronUp size={12} className="text-white/25" /> : <ChevronDown size={12} className="text-white/25" />}
                      </div>
                    </button>
                    {expandedRisk === risk.id && (
                      <div className="px-4 pb-4 pt-1 border-t border-white/[0.05]">
                        <p className="text-[11px] text-white/50 leading-relaxed">
                          <span className="font-semibold text-white/60">Como corrigir: </span>
                          {risk.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setStep("form")}
              className="w-full py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-[13px] font-semibold text-white/50 hover:text-white/70 transition-all"
            >
              Analisar outra campanha
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
