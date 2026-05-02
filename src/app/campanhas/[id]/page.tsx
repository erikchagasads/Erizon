"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  Clock,
  FileText,
  DollarSign,
  Loader2,
  MessageSquare,
  Save,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";

type CampanhaDetalhe = {
  id: string;
  user_id: string;
  nome_campanha: string | null;
  status: string | null;
  gasto_total: number | null;
  contatos: number | null;
  receita_estimada: number | null;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  impressoes: number | null;
  cliques: number | null;
  dias_ativo: number | null;
  cliente_id: string | null;
  data_atualizacao: string | null;
  plataforma: string | null;
};

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (v: number) => v.toLocaleString("pt-BR");
const fmtPct = (v: number) => `${v.toFixed(2)}%`;
const fmtX = (v: number) => `${v.toFixed(2)}x`;

function isAtiva(status?: string | null) {
  return ["ativo", "ativa", "active", "atv"].includes((status ?? "").toLowerCase());
}

function scoreCampanha(campanha: CampanhaDetalhe) {
  const gasto = Number(campanha.gasto_total ?? 0);
  const leads = Number(campanha.contatos ?? 0);
  const receita = Number(campanha.receita_estimada ?? 0);
  if (gasto > 100 && leads === 0) return 20;

  const cpl = leads > 0 ? gasto / leads : 0;
  const roas = gasto > 0 ? receita / gasto : 0;
  let score = 50;

  if (roas >= 3) score += 25;
  else if (roas >= 2) score += 10;
  else if (roas > 0 && roas < 1) score -= 20;

  if (cpl > 0 && cpl < 30) score += 15;
  else if (cpl > 80) score -= 15;

  if ((campanha.ctr ?? 0) >= 2) score += 8;
  else if ((campanha.ctr ?? 0) > 0 && (campanha.ctr ?? 0) < 0.7) score -= 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function diagnosticar(campanha: CampanhaDetalhe) {
  const gasto = Number(campanha.gasto_total ?? 0);
  const leads = Number(campanha.contatos ?? 0);
  const receita = Number(campanha.receita_estimada ?? 0);
  const cpl = leads > 0 ? gasto / leads : 0;
  const roas = gasto > 0 ? receita / gasto : 0;
  const ctr = Number(campanha.ctr ?? 0);
  const score = scoreCampanha(campanha);

  if (gasto > 100 && leads === 0) {
    return {
      label: "Campanha zumbi",
      tone: "red",
      text: "Investimento relevante sem leads. Prioridade alta para pausar, revisar evento ou trocar criativo/oferta.",
      action: "Pausar e diagnosticar tracking/oferta",
      score,
      cpl,
      roas,
    };
  }

  if (score < 40 || (roas > 0 && roas < 1)) {
    return {
      label: "Risco de desperdício",
      tone: "amber",
      text: "A campanha está abaixo do saudável. Vale revisar público, criativo e promessa antes de aumentar orçamento.",
      action: "Reduzir budget e testar nova copy",
      score,
      cpl,
      roas,
    };
  }

  if (roas >= 2.5 && cpl > 0 && cpl < 80 && ctr >= 1) {
    return {
      label: "Oportunidade de escala",
      tone: "emerald",
      text: "Indicadores sustentam um aumento progressivo. Escala segura deve respeitar limite de 20% a 30% por iteração.",
      action: "Escalar com limite de segurança",
      score,
      cpl,
      roas,
    };
  }

  return {
    label: "Monitoramento",
    tone: "sky",
    text: "Campanha dentro de uma zona intermediária. Melhor próximo passo é acompanhar tendência e testar variação criativa.",
    action: "Manter e testar variação",
    score,
    cpl,
    roas,
  };
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof DollarSign }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
      <div className="mb-3 flex items-center gap-2 text-white/25">
        <Icon size={14} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

export default function CampanhaDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);
  const [campanha, setCampanha] = useState<CampanhaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [copyGerada, setCopyGerada] = useState("");
  const [gerandoCopy, setGerandoCopy] = useState(false);
  const [salvandoCopy, setSalvandoCopy] = useState(false);
  const [copySalva, setCopySalva] = useState(false);
  const [erroCopy, setErroCopy] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      setErro(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErro("Faça login para ver a campanha.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("metricas_ads")
        .select("id,user_id,nome_campanha,status,gasto_total,contatos,receita_estimada,ctr,cpm,cpc,impressoes,cliques,dias_ativo,cliente_id,data_atualizacao,plataforma")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) setErro("Não foi possível carregar a campanha.");
      else setCampanha(data as CampanhaDetalhe | null);

      setLoading(false);
    }

    void carregar();
  }, [params.id, supabase]);

  const diagnostico = campanha ? diagnosticar(campanha) : null;
  const nome = campanha?.nome_campanha ?? "Campanha";
  const gasto = Number(campanha?.gasto_total ?? 0);
  const leads = Number(campanha?.contatos ?? 0);
  const receita = Number(campanha?.receita_estimada ?? 0);
  const roas = gasto > 0 ? receita / gasto : 0;
  const cpl = leads > 0 ? gasto / leads : 0;

  function abrirEri() {
    if (!campanha || !diagnostico) return;
    window.dispatchEvent(new CustomEvent("erizon:open-agent", {
      detail: {
        prompt: [
          `Analise a campanha "${nome}".`,
          `Diagnóstico atual: ${diagnostico.label} - ${diagnostico.text}`,
          `Investimento: ${fmtBRL(gasto)}; leads: ${leads}; CPL: ${cpl > 0 ? fmtBRL(cpl) : "sem leads"}; ROAS: ${roas > 0 ? fmtX(roas) : "sem receita"}; CTR: ${campanha.ctr ? fmtPct(campanha.ctr) : "não informado"}.`,
          "Explique a causa provável e sugira uma próxima ação segura.",
        ].join("\n"),
      },
    }));
  }

  const contextoCopy = campanha && diagnostico
    ? [
        `Campanha: ${nome}`,
        `Diagnóstico: ${diagnostico.label} - ${diagnostico.text}`,
        `Investimento: ${fmtBRL(gasto)}`,
        `Leads: ${leads}`,
        `CPL: ${cpl > 0 ? fmtBRL(cpl) : "sem leads"}`,
        `ROAS: ${roas > 0 ? fmtX(roas) : "sem receita"}`,
        `CTR: ${campanha.ctr ? fmtPct(campanha.ctr) : "não informado"}`,
        "Crie variações honestas, sem inventar prova, resultado ou garantia.",
      ].join("\n")
    : "";

  async function gerarCopyContextual() {
    if (!campanha || !diagnostico) return;
    setGerandoCopy(true);
    setErroCopy(null);
    setCopySalva(false);

    try {
      const res = await fetch("/api/ai-copywriter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagemUsuario: `Gere uma nova copy para a campanha com foco em: ${diagnostico.action}.`,
          tipoCopy: "body_ad",
          contexto: contextoCopy,
          cliente_id: campanha.cliente_id,
        }),
      });
      const json = (await res.json()) as { copy?: string; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Não foi possível gerar a copy.");
      setCopyGerada(json.copy ?? "");
    } catch (error) {
      setErroCopy(error instanceof Error ? error.message : "Erro ao gerar copy.");
    } finally {
      setGerandoCopy(false);
    }
  }

  async function salvarCopyContextual() {
    if (!campanha || !copyGerada.trim()) return;
    setSalvandoCopy(true);
    setErroCopy(null);

    try {
      const res = await fetch("/api/creative-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campanha.id,
          campaign_name: nome,
          client_id: campanha.cliente_id,
          copy: copyGerada,
          prompt: contextoCopy,
          format: "body_ad",
        }),
      });
      const json = (await res.json()) as { error?: string | null };
      if (!res.ok || json.error) throw new Error(json.error ?? "Não foi possível salvar a copy.");
      setCopySalva(true);
    } catch (error) {
      setErroCopy(error instanceof Error ? error.message : "Erro ao salvar copy.");
    } finally {
      setSalvandoCopy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white">
      <Sidebar />
      <main className="md:ml-[60px] px-5 py-8">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => router.push("/campanhas")}
            className="mb-6 inline-flex items-center gap-2 text-sm text-white/35 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Voltar para campanhas
          </button>

          {loading && (
            <div className="flex min-h-[420px] items-center justify-center">
              <Loader2 size={24} className="animate-spin text-purple-300" />
            </div>
          )}

          {!loading && erro && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5 text-red-200">
              {erro}
            </div>
          )}

          {!loading && !erro && !campanha && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-8 text-center">
              <AlertTriangle className="mx-auto mb-3 text-white/20" size={28} />
              <p className="text-sm text-white/45">Campanha não encontrada.</p>
            </div>
          )}

          {campanha && diagnostico && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-white/[0.06] bg-[#0d0d11] p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                        isAtiva(campanha.status) ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.06] text-white/35"
                      }`}>
                        {isAtiva(campanha.status) ? "Ativa" : "Pausada"}
                      </span>
                      <span className="rounded-md bg-purple-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-purple-300">
                        {campanha.plataforma ?? "meta"}
                      </span>
                    </div>
                    <h1 className="max-w-3xl text-2xl font-bold tracking-tight text-white">{nome}</h1>
                    <p className="mt-2 text-sm text-white/35">
                      Atualizada em {campanha.data_atualizacao ? new Date(campanha.data_atualizacao).toLocaleString("pt-BR") : "data não informada"}
                    </p>
                  </div>

                  <button
                    onClick={abrirEri}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
                  >
                    <Bot size={16} />
                    Perguntar para a Eri
                  </button>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Investimento" value={fmtBRL(gasto)} icon={DollarSign} />
                <MetricCard label="Leads" value={leads > 0 ? fmtNum(leads) : "0"} icon={Target} />
                <MetricCard label="CPL" value={cpl > 0 ? fmtBRL(cpl) : "Sem leads"} icon={BarChart3} />
                <MetricCard label="ROAS" value={roas > 0 ? fmtX(roas) : "Sem receita"} icon={TrendingUp} />
              </section>

              <section className={`rounded-2xl border p-5 ${
                diagnostico.tone === "red"
                  ? "border-red-500/25 bg-red-500/[0.05]"
                  : diagnostico.tone === "amber"
                    ? "border-amber-500/25 bg-amber-500/[0.05]"
                    : diagnostico.tone === "emerald"
                      ? "border-emerald-500/25 bg-emerald-500/[0.05]"
                      : "border-sky-500/20 bg-sky-500/[0.04]"
              }`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                      Diagnóstico Erizon
                    </p>
                    <h2 className="text-lg font-bold text-white">{diagnostico.label}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">{diagnostico.text}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-center">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">Score</p>
                    <p className="text-3xl font-black text-white">{diagnostico.score}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-sm text-white/65">
                  <Sparkles size={15} className="text-purple-300" />
                  Próxima ação: <span className="font-semibold text-white">{diagnostico.action}</span>
                </div>
              </section>

              <section className="rounded-2xl border border-sky-500/15 bg-sky-500/[0.035] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/45">
                      <FileText size={13} />
                      Copy contextual
                    </p>
                    <h2 className="text-lg font-bold text-white">Gerar nova copy para esta campanha</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
                      Usa o diagnóstico, CPL, ROAS, CTR e contexto da campanha para criar variações prontas para teste.
                    </p>
                  </div>
                  <button
                    onClick={gerarCopyContextual}
                    disabled={gerandoCopy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-60"
                  >
                    {gerandoCopy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {gerandoCopy ? "Gerando..." : "Gerar copy"}
                  </button>
                </div>

                {copyGerada && (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={copyGerada}
                      onChange={event => {
                        setCopyGerada(event.target.value);
                        setCopySalva(false);
                      }}
                      rows={10}
                      className="w-full resize-y rounded-xl border border-white/[0.08] bg-black/25 p-4 text-[12px] leading-relaxed text-white/70 outline-none transition-colors focus:border-sky-400/40"
                    />
                    <button
                      onClick={salvarCopyContextual}
                      disabled={salvandoCopy || copySalva}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
                    >
                      {salvandoCopy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                      {salvandoCopy ? "Salvando..." : copySalva ? "Salva em creative_assets" : "Salvar copy"}
                    </button>
                  </div>
                )}

                {erroCopy && (
                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-200">
                    {erroCopy}
                  </div>
                )}
              </section>

              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="CTR" value={campanha.ctr ? fmtPct(campanha.ctr) : "—"} icon={MessageSquare} />
                <MetricCard label="CPM" value={campanha.cpm ? fmtBRL(campanha.cpm) : "—"} icon={DollarSign} />
                <MetricCard label="Cliques" value={campanha.cliques ? fmtNum(campanha.cliques) : "—"} icon={BarChart3} />
                <MetricCard label="Dias ativo" value={campanha.dias_ativo ? `${campanha.dias_ativo}d` : "—"} icon={Clock} />
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
