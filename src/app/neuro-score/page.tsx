"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PlanGate from "@/components/PlanGate";
import type { Setor } from "@/app/lib/benchmarkSetor";
import { BENCHMARKS_SETOR } from "@/app/lib/benchmarkSetor";
import {
  AlertTriangle,
  Brain,
  Check,
  Eye,
  Loader2,
  MousePointerClick,
  Smile,
  ThumbsDown,
  ThumbsUp,
  Upload,
  Zap,
} from "lucide-react";

const NICHOS: { valor: Setor; label: string }[] = [
  { valor: "ecommerce", label: "E-commerce" },
  { valor: "infoprodutos", label: "Infoprodutos" },
  { valor: "saude_beleza", label: "Saúde & Beleza" },
  { valor: "imobiliario", label: "Imobiliário" },
  { valor: "educacao", label: "Educação" },
  { valor: "servicos_locais", label: "Serviços Locais" },
  { valor: "financeiro", label: "Financeiro" },
  { valor: "geral", label: "Geral" },
];

const OBJETIVOS = [
  { id: "conversao", label: "Conversão" },
  { id: "leads", label: "Geração de Leads" },
  { id: "trafego", label: "Tráfego" },
  { id: "engajamento", label: "Engajamento" },
] as const;

const SUB_SCORES = [
  { key: "atencaoScore", label: "Atenção Visual", icon: Eye },
  { key: "hookScore", label: "Hook Strength", icon: Zap },
  { key: "emocaoScore", label: "Impacto Emocional", icon: Smile },
  { key: "ctaScore", label: "CTA Power", icon: MousePointerClick },
] as const;

const LOADING_STEPS = [
  "Analisando estrutura visual...",
  "Mapeando zonas de atenção...",
  "Calculando Neuro Score...",
] as const;

type Objetivo = (typeof OBJETIVOS)[number]["id"];
type FeedbackState = "positivo" | "negativo" | null;

interface NeuroScoreResult {
  analysisId: string;
  neuroScore: number;
  atencaoScore: number;
  emocaoScore: number;
  ctaScore: number;
  hookScore: number;
  fadigaScore: number;
  emocaoDominante: string;
  zonasAtencao: string[];
  pontosFortes: string[];
  pontosFracos: string[];
  recomendacoes: {
    prioridade: "alta" | "media" | "baixa";
    acao: string;
    impactoEstimado: string;
  }[];
  reasoning: string;
}

interface HistoryAnalysis {
  id: string;
  nicho: string | null;
  objetivo: string | null;
  neuro_score: number;
  emocao_dominante: string | null;
  media_type: string;
  created_at: string;
  feedback: "positivo" | "negativo" | "editado" | null;
  ctr_real: number | null;
  cpl_real: number | null;
}

function getScoreTone(score: number) {
  if (score >= 70) {
    return {
      text: "text-emerald-300",
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/10",
      bar: "bg-emerald-400",
    };
  }
  if (score >= 50) {
    return {
      text: "text-amber-300",
      border: "border-amber-500/20",
      bg: "bg-amber-500/10",
      bar: "bg-amber-400",
    };
  }
  return {
    text: "text-red-300",
    border: "border-red-500/20",
    bg: "bg-red-500/10",
    bar: "bg-red-400",
  };
}

function getPriorityTone(prioridade: "alta" | "media" | "baixa") {
  if (prioridade === "alta") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }
  if (prioridade === "media") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }
  return "border-white/[0.08] bg-white/[0.03] text-white/55";
}

function fmtDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function ProgressBar({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Eye;
}) {
  const tone = getScoreTone(value);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Icon size={14} className="text-white/35" />
          <span>{label}</span>
        </div>
        <span className={`text-sm font-semibold ${tone.text}`}>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06]">
        <div
          className={`h-2 rounded-full transition-all ${tone.bar}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function NeuroScorePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nicho, setNicho] = useState<Setor>("ecommerce");
  const [objetivo, setObjetivo] = useState<Objetivo>("conversao");
  const [imageBase64, setImageBase64] = useState("");
  const [imageMimeType, setImageMimeType] = useState<"image/jpeg" | "image/png" | "image/webp">("image/png");
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [result, setResult] = useState<NeuroScoreResult | null>(null);
  const [history, setHistory] = useState<HistoryAnalysis[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/neuro-score/history?limit=10", { cache: "no-store" });
      if (!res.ok) {
        return;
      }
      const json = (await res.json()) as { analyses: HistoryAnalysis[] };
      setHistory(json.analyses ?? []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!loading) {
      setLoadingIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % LOADING_STEPS.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [loading]);

  const handleFile = useCallback((file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultValue = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = resultValue.split(",");
      setImageBase64(base64);
      setPreviewUrl(resultValue);
      setImageMimeType(file.type as "image/jpeg" | "image/png" | "image/webp");
      setResult(null);
      setFeedback(null);
      setError(null);
    };
    reader.onerror = () => {
      setError("Não foi possível ler a imagem selecionada.");
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  async function analyzeCreative() {
    if (!imageBase64) {
      setError("Selecione uma imagem antes de analisar.");
      return;
    }

    setLoading(true);
    setResult(null);
    setFeedback(null);
    setError(null);

    try {
      const benchmark = BENCHMARKS_SETOR[nicho];
      const res = await fetch("/api/neuro-score/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          imageMimeType,
          nicho,
          objetivo,
          benchmarkCtrP50: benchmark.ctr.p50,
          benchmarkCplP50: benchmark.cpl.p50,
        }),
      });

      const json = (await res.json()) as NeuroScoreResult & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Erro ao analisar criativo.");
      }

      setResult(json);
      await loadHistory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao analisar criativo.");
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(value: "positivo" | "negativo") {
    if (!result || sendingFeedback) {
      return;
    }

    setSendingFeedback(true);
    try {
      const res = await fetch("/api/neuro-score/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: result.analysisId,
          feedback: value,
        }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Erro ao enviar feedback.");
      }

      setFeedback(value);
      await loadHistory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao enviar feedback.");
    } finally {
      setSendingFeedback(false);
    }
  }

  const scoreTone = getScoreTone(result?.neuroScore ?? 0);
  const recomendacoesOrdenadas = [...(result?.recomendacoes ?? [])].sort((a, b) => {
    const ordem = { alta: 0, media: 1, baixa: 2 };
    return ordem[a.prioridade] - ordem[b.prioridade];
  });

  return (
    <PlanGate minPlan="command" feature="Neuro Score IA" preview={true}>
      <>
        <Sidebar />
        <div className="md:ml-[60px] min-h-screen bg-[#040406] pb-20 text-white md:pb-0">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-6">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-fuchsia-400">
                Neuro Score IA
              </p>
              <h1 className="text-2xl font-bold text-white">Análise preditiva de criativos</h1>
              <p className="mt-1 max-w-3xl text-sm text-white/40">
                Faça upload de um criativo estático, estime a força visual antes de investir e alimente
                o loop de aprendizado com feedback real.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
              <section className="space-y-5">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="mb-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/30">Nicho</p>
                      <select
                        value={nicho}
                        onChange={(e) => setNicho(e.target.value as Setor)}
                        className="w-full rounded-xl border border-white/[0.06] bg-[#0d0d10] px-4 py-3 text-sm text-white outline-none transition-all focus:border-fuchsia-500/40"
                      >
                        {NICHOS.map((item) => (
                          <option key={item.valor} value={item.valor}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/30">Objetivo</p>
                      <select
                        value={objetivo}
                        onChange={(e) => setObjetivo(e.target.value as Objetivo)}
                        className="w-full rounded-xl border border-white/[0.06] bg-[#0d0d10] px-4 py-3 text-sm text-white outline-none transition-all focus:border-fuchsia-500/40"
                      >
                        {OBJETIVOS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleFile(file);
                      }
                    }}
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={onDrop}
                    className={`cursor-pointer rounded-2xl border border-dashed p-6 text-center transition-all ${
                      dragActive
                        ? "border-fuchsia-400/50 bg-fuchsia-500/10"
                        : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10">
                      <Upload size={20} className="text-fuchsia-300" />
                    </div>
                    <p className="text-sm font-semibold text-white">Arraste seu criativo aqui</p>
                    <p className="mt-1 text-xs text-white/35">ou clique para selecionar JPG, PNG ou WEBP</p>
                  </div>

                  {previewUrl && (
                    <div className="mt-4 rounded-2xl border border-white/[0.06] bg-[#0d0d10] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-white/30">Preview</p>
                        <span className="text-[10px] text-white/30">{imageMimeType}</span>
                      </div>
                      <img
                        src={previewUrl}
                        alt="Preview do criativo"
                        className="max-h-[420px] w-full rounded-xl object-contain"
                      />
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={analyzeCreative}
                      disabled={loading || !imageBase64}
                      className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          {LOADING_STEPS[loadingIndex]}
                        </>
                      ) : (
                        <>
                          <Brain size={15} />
                          Analisar Criativo
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-white/30">
                      CTR p50 {BENCHMARKS_SETOR[nicho].ctr.p50}% · CPL p50 R${BENCHMARKS_SETOR[nicho].cpl.p50}
                    </p>
                  </div>

                  {error && (
                    <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  )}
                </div>

                {result && (
                  <div className="space-y-5">
                    <section className={`rounded-2xl border ${scoreTone.border} ${scoreTone.bg} p-6`}>
                      <div className="text-center">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
                          Neuro Score
                        </p>
                        <div className={`text-6xl font-black tracking-tight ${scoreTone.text}`}>
                          {result.neuroScore}
                        </div>
                        <p className="mt-3 text-sm text-white/50">
                          Emoção dominante:{" "}
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium text-white/80">
                            {result.emocaoDominante}
                          </span>
                        </p>
                      </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-2">
                      {SUB_SCORES.map((item) => (
                        <ProgressBar
                          key={item.key}
                          label={item.label}
                          value={result[item.key]}
                          icon={item.icon}
                        />
                      ))}
                      <ProgressBar
                        label="Clareza Visual"
                        value={100 - result.fadigaScore}
                        icon={Check}
                      />
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                          <Check size={16} />
                          Pontos Fortes
                        </div>
                        <div className="space-y-2">
                          {result.pontosFortes.map((item) => (
                            <div
                              key={item}
                              className="rounded-xl border border-emerald-500/10 bg-black/20 px-4 py-3 text-sm text-emerald-100/80"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-300">
                          <AlertTriangle size={16} />
                          Pontos Fracos
                        </div>
                        <div className="space-y-2">
                          {result.pontosFracos.map((item) => (
                            <div
                              key={item}
                              className="rounded-xl border border-amber-500/10 bg-black/20 px-4 py-3 text-sm text-amber-100/80"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">Recomendações</p>
                          <p className="mt-1 text-xs text-white/35">
                            Ações cirúrgicas ordenadas por impacto potencial.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void sendFeedback("positivo")}
                            disabled={sendingFeedback}
                            className={`rounded-xl border px-3 py-2 text-sm transition-all ${
                              feedback === "positivo"
                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                : "border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white"
                            } disabled:opacity-50`}
                            title="Feedback positivo"
                          >
                            <ThumbsUp size={14} />
                          </button>
                          <button
                            onClick={() => void sendFeedback("negativo")}
                            disabled={sendingFeedback}
                            className={`rounded-xl border px-3 py-2 text-sm transition-all ${
                              feedback === "negativo"
                                ? "border-red-500/25 bg-red-500/10 text-red-300"
                                : "border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white"
                            } disabled:opacity-50`}
                            title="Feedback negativo"
                          >
                            <ThumbsDown size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {recomendacoesOrdenadas.map((item, index) => (
                          <article
                            key={`${item.prioridade}-${item.acao}-${index}`}
                            className={`rounded-2xl border p-4 ${getPriorityTone(item.prioridade)}`}
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                                Prioridade {item.prioridade}
                              </span>
                              <span className="text-[11px]">{item.impactoEstimado}</span>
                            </div>
                            <p className="text-sm font-medium text-white">{item.acao}</p>
                          </article>
                        ))}
                      </div>

                      <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4">
                        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/30">Raciocínio</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/65">{result.reasoning}</p>
                      </div>
                    </section>
                  </div>
                )}
              </section>

              <aside className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="border-b border-white/[0.05] px-5 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-white/30">Histórico</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Últimas análises</h2>
                </div>

                <div className="space-y-3 p-4">
                  {history.length === 0 && (
                    <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-5 text-sm text-white/35">
                      Nenhuma análise ainda. As últimas 10 aparecerão aqui.
                    </div>
                  )}

                  {history.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-4"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white/85">{item.nicho ?? "Sem nicho"}</p>
                          <p className="text-[11px] text-white/30">{fmtDate(item.created_at)}</p>
                        </div>
                        <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getScoreTone(item.neuro_score).bg} ${getScoreTone(item.neuro_score).text}`}>
                          {item.neuro_score}
                        </div>
                      </div>
                      <p className="text-[12px] text-white/45">
                        {item.objetivo ?? "Sem objetivo"} · emoção {item.emocao_dominante ?? "n/d"}
                      </p>
                      {item.feedback && (
                        <p className="mt-2 text-[11px] text-white/30">Feedback: {item.feedback}</p>
                      )}
                    </article>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </>
    </PlanGate>
  );
}
