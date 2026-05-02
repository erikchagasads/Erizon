"use client";

// app/creative-lab/page.tsx — Creative Lab
// Geração de copy e roteiros com IA a partir do contexto das campanhas reais.

import { useEffect, useState, useMemo, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import PlanGate from "@/components/PlanGate";
import { getSupabase } from "@/lib/supabase";
import {
  Sparkles, Loader2, Copy, Check, ChevronDown,
  FileText, Megaphone, Mail, Layout, Video, Type, Wand2, Map, Save, History,
} from "lucide-react";
import { BriefToCampaign } from "@/components/BriefToCampaign";

interface Campanha {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  ctr: number;
}

interface CreativeAsset {
  id: string;
  campaign_id: string | null;
  name: string | null;
  format: string | null;
  generated_copy: string | null;
  source: string | null;
  created_at: string | null;
}

type CreativeAssetsResponse = {
  data?: CreativeAsset[];
  error?: string | null;
};

const TIPOS_COPY = [
  { id: "headline",     label: "Headlines",     icon: Type,      desc: "8-10 headlines prontas para anúncio" },
  { id: "cta",         label: "CTAs",           icon: Megaphone, desc: "6-8 chamadas para ação" },
  { id: "body_ad",     label: "Body Copy",      icon: FileText,  desc: "3 versões de copy para anúncio" },
  { id: "vsl",         label: "VSL Script",     icon: Video,     desc: "Roteiro completo de vídeo de vendas" },
  { id: "email",       label: "Email",          icon: Mail,      desc: "Email completo com assunto e CTA" },
  { id: "landing_page",label: "Landing Page",   icon: Layout,    desc: "Estrutura completa de LP" },
] as const;

type TipoCopy = typeof TIPOS_COPY[number]["id"];

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function CopyOutput({
  text,
  onSave,
  saving,
  saved,
}: {
  text: string;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
        <p className="text-[11px] text-white/40 font-medium uppercase tracking-wider">Output gerado</p>
        <div className="flex items-center gap-3">
          <button onClick={onSave} disabled={saving || saved}
            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white transition-colors disabled:opacity-40">
            {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} className="text-emerald-400" /> : <Save size={12} />}
            {saving ? "Salvando..." : saved ? "Salvo" : "Salvar"}
          </button>
          <button onClick={copy}
            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white transition-colors">
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? "Copiado!" : "Copiar tudo"}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 text-sm text-white/75 leading-relaxed whitespace-pre-wrap font-mono text-[12px]">
        {text}
      </div>
    </div>
  );
}

export default function CreativeLabPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [abaLab, setAbaLab]            = useState<"copy" | "brief">("copy");
  const [campanhas, setCampanhas]       = useState<Campanha[]>([]);
  const [tipoCopy, setTipoCopy]         = useState<TipoCopy>("headline");
  const [prompt, setPrompt]             = useState("");
  const [campanhaSel, setCampanhaSel]   = useState("");
  const [resultado, setResultado]       = useState("");
  const [assets, setAssets]             = useState<CreativeAsset[]>([]);
  const [gerando, setGerando]           = useState(false);
  const [salvando, setSalvando]         = useState(false);
  const [salvo, setSalvo]               = useState(false);
  const [erro, setErro]                 = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("metricas_ads").select("id,nome_campanha,gasto_total,contatos,receita_estimada,ctr")
        .eq("user_id", user.id).order("gasto_total", { ascending: false }).limit(20);
      setCampanhas((data ?? []) as Campanha[]);
    }
    load();
  }, [supabase]);

  async function carregarAssets() {
    try {
      const res = await fetch("/api/creative-assets", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as CreativeAssetsResponse;
      setAssets(json.data ?? []);
    } catch {
      setAssets([]);
    }
  }

  useEffect(() => {
    void carregarAssets();
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const campanhaSelecionada = campanhas.find(c => c.id === campanhaSel);

  // Monta contexto automático da campanha selecionada
  const contexto = campanhaSelecionada
    ? `Campanha: ${campanhaSelecionada.nome_campanha} | Investimento: ${fmtBRL(campanhaSelecionada.gasto_total)} | Leads: ${campanhaSelecionada.contatos} | CPL: ${campanhaSelecionada.contatos > 0 ? fmtBRL(campanhaSelecionada.gasto_total / campanhaSelecionada.contatos) : "—"} | CTR: ${campanhaSelecionada.ctr?.toFixed(2) ?? "—"}%`
    : "";

  async function gerar() {
    if (!prompt.trim()) return;
    setGerando(true);
    setErro(null);
    setResultado("");
    try {
      const res = await fetch("/api/ai-copywriter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagemUsuario: prompt, tipoCopy, contexto }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro na geração");
      setResultado(json.copy ?? "");
      setSalvo(false);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar copy.");
    } finally {
      setGerando(false);
    }
  }

  async function salvarResultado() {
    if (!resultado.trim()) return;
    setSalvando(true);
    setErro(null);

    try {
      const res = await fetch("/api/creative-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campanhaSelecionada?.id ?? "creative-lab",
          campaign_name: campanhaSelecionada?.nome_campanha ?? "Creative Lab",
          copy: resultado,
          prompt,
          format: tipoCopy,
        }),
      });
      const json = (await res.json()) as { error?: string | null };
      if (!res.ok || json.error) throw new Error(json.error ?? "Erro ao salvar copy.");
      setSalvo(true);
      await carregarAssets();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar copy.");
    } finally {
      setSalvando(false);
    }
  }

  const tipoAtual = TIPOS_COPY.find(t => t.id === tipoCopy)!;

  return (
    <PlanGate minPlan="command" feature="Creative Lab">
      <>
      <Sidebar />
      <div className="md:ml-[60px] pb-20 md:pb-0 min-h-screen bg-[#040406] text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="mb-6">
            <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider mb-1">Creative Lab</p>
            <h1 className="text-2xl font-bold text-white">Creative Lab</h1>
            <p className="text-sm text-white/40 mt-1">
              Geração de copy, roteiros e estruturas completas de campanha com IA.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white/[0.03] rounded-xl p-1 border border-white/[0.05] w-fit">
            <button onClick={() => setAbaLab("copy")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
                abaLab === "copy" ? "bg-purple-600/30 border border-purple-500/30 text-purple-300" : "text-white/30 hover:text-white/60"
              }`}>
              <Wand2 size={12} /> Copy & Roteiro
            </button>
            <button onClick={() => setAbaLab("brief")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
                abaLab === "brief" ? "bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300" : "text-white/30 hover:text-white/60"
              }`}>
              <Map size={12} /> Brief → Campanha
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/20 text-fuchsia-400 font-bold uppercase ml-1">Novo</span>
            </button>
          </div>

          {abaLab === "brief" && (
            <BriefToCampaign />
          )}

          {abaLab === "copy" && (
          <div className="space-y-5">
            {/* Seletor de tipo */}
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wider mb-3 font-medium">Tipo de conteúdo</p>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                {TIPOS_COPY.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTipoCopy(t.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                        tipoCopy === t.id
                          ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                          : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-[10px] font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-white/25 mt-2 pl-1">{tipoAtual.desc}</p>
            </div>

            {/* Campanha opcional */}
            {campanhas.length > 0 && (
              <div ref={dropRef} className="relative">
                <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2 font-medium">
                  Contexto da campanha <span className="text-white/20">(opcional — melhora os resultados)</span>
                </p>
                <button
                  onClick={() => setShowDropdown(o => !o)}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm text-white/60 hover:border-white/15 transition-all"
                >
                  <span>{campanhaSelecionada ? campanhaSelecionada.nome_campanha : "Selecionar campanha..."}</span>
                  <ChevronDown size={14} className={`transition-transform ${showDropdown ? "rotate-180" : ""}`} />
                </button>
                {showDropdown && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl border border-white/[0.08] bg-[#0e0e12] shadow-2xl overflow-hidden">
                    <button
                      onClick={() => { setCampanhaSel(""); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2.5 text-[12px] text-white/30 hover:bg-white/[0.04] transition-colors"
                    >
                      Nenhuma campanha
                    </button>
                    {campanhas.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setCampanhaSel(c.id); setShowDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[12px] transition-colors ${
                          campanhaSel === c.id
                            ? "bg-purple-500/10 text-purple-300"
                            : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <span className="block font-medium">{c.nome_campanha}</span>
                        <span className="text-white/25 text-[10px]">
                          {fmtBRL(c.gasto_total)} investido · {c.contatos} leads
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {campanhaSelecionada && (
                  <p className="text-[10px] text-purple-400/60 mt-1.5 pl-1">
                    ✓ Contexto: {fmtBRL(campanhaSelecionada.gasto_total)} investido · {campanhaSelecionada.contatos} leads · CTR {campanhaSelecionada.ctr?.toFixed(2) ?? "—"}%
                  </p>
                )}
              </div>
            )}

            {/* Prompt */}
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2 font-medium">Descreva o que você precisa</p>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={`Ex: Produto de emagrecimento para mulheres 35-50 anos. Foco em ganhar energia e disposição, não só perder peso. Oferta: 30 dias de acompanhamento online por R$297.`}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/40 focus:bg-purple-500/[0.03] transition-all resize-none"
              />
            </div>

            {/* Botão */}
            <button
              onClick={gerar}
              disabled={gerando || !prompt.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
            >
              {gerando
                ? <><Loader2 size={15} className="animate-spin" /> Gerando...</>
                : <><Sparkles size={15} /> Gerar {tipoAtual.label}</>
              }
            </button>

            {/* Erro */}
            {erro && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                {erro}
              </div>
            )}

            {/* Output */}
            {resultado && (
              <CopyOutput
                text={resultado}
                onSave={salvarResultado}
                saving={salvando}
                saved={salvo}
              />
            )}

            {assets.length > 0 && (
              <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
                  <p className="flex items-center gap-2 text-[11px] text-white/40 font-medium uppercase tracking-wider">
                    <History size={12} className="text-purple-300" />
                    Copies salvas
                  </p>
                  <span className="text-[10px] text-white/20">{assets.length} recentes</span>
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {assets.slice(0, 6).map(asset => (
                    <article key={asset.id} className="px-5 py-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[12px] font-semibold text-white/75">{asset.name ?? "Copy IA"}</p>
                          <p className="text-[10px] text-white/25">
                            {asset.format ?? "copy"} · {asset.created_at ? new Date(asset.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "sem data"}
                          </p>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(asset.generated_copy ?? "")}
                          className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] px-3 py-1.5 text-[10px] text-white/35 transition-colors hover:text-white"
                        >
                          <Copy size={11} />
                          Copiar
                        </button>
                      </div>
                      <p className="line-clamp-3 whitespace-pre-wrap text-[12px] leading-relaxed text-white/45">
                        {asset.generated_copy}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
          )}
        </div>
      </div>
      </>
    </PlanGate>
  );
}
