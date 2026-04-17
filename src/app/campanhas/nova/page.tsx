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
    classification === "good" ? "#a78bfa" :
    classification === "risky" ? "#fb923c" :
    "#f87171";

  const label =
    classification === "excellent" ? "Excelente — pronta para lançar" :
    classification === "good" ? "Boa — pequenos ajustes recomendados" :
    classification === "risky" ? "Arriscada — corrija antes de lançar" :
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
  const [objetivo, setObjetivo] = useState("LEADS");
  const [orcamento, setOrcamento] = useState("");
  const [audiencia, setAudiencia] = useState("");
  const [formato, setFormato] = useState("video");
  const [temCTA, setTemCTA] = useState(true);
  const [duracao, setDuracao] = useState("");
  const [velocidade, setVelocidade] = useState("");
  const [temPixel, setTemPixel] = useState(true);
  const [publicoCustom, setPublicoCustom] = useState(false);
  const [metaCpl, setMetaCpl] = useState("");
  const [campaignName, setCampaignName] = useState("");

  async function analisar() {
    if (!orcamento) return;
    setLoading(true);
    const body = {
      clientId: clienteAtual?.id,
      campaignName,
      objetivo,
      orcamentoDiario: parseFloat(orcamento),
      audienciaSize: audiencia ? parseFloat(audiencia) * 1000 : undefined,
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
                      className={`px-4 py-2 rounded-xl border text-[12px] font-semibold transition-all ${!clienteAtual ? "border-purple-500/40 bg-purple-500/[0.10] text-purple-300" : "border-white/[0.07] text-white/45 hover:text-white/70 hover:bg-white/[0.04]"}`}
                    >
                      Sem cliente
                    </button>
                    {clientes.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => selecionarCliente(cliente)}
                        className={`px-4 py-2 rounded-xl border text-[12px] font-semibold transition-all ${clienteAtual?.id === cliente.id ? "border-purple-500/40 bg-purple-500/[0.10] text-purple-300" : "border-white/[0.07] text-white/45 hover:text-white/70 hover:bg-white/[0.04]"}`}
                      >
                        {cliente.nome_cliente ?? cliente.nome}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/28">
                    {clienteAtual ? `Preflight enriquecido para ${clienteAtual.nome_cliente ?? clienteAtual.nome}.` : "Preflight generico da conta, sem contexto de cliente."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {step === "result" && result && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <ScoreGauge score={result.score} classification={result.classification} />
            </div>
            {result.risks.length > 0 && (
              <div className="space-y-2">
                {result.risks.map(risk => (
                  <div key={risk.id} className="rounded-2xl border overflow-hidden border-white/[0.07] bg-white/[0.02]">
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
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-blue-500/10 border-blue-500/20 text-blue-400">
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
          </div>
        )}
      </main>
    </div>
  );
}
