"use client";

// src/app/funil-publico/page.tsx
// Funil de Público — geração de público detalhado para campanhas Meta Ads

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Users, Target, Zap, ChevronDown, ChevronUp,
  Loader2, Sparkles, AlertTriangle, TrendingUp,
  Copy, CheckCheck, BarChart2, Layers, Brain,
  ArrowRight, RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Demografico { idade: string; genero: string; renda: string; escolaridade: string; }
interface Publico {
  nome: string; prioridade: "principal" | "secundario" | "teste";
  demografico: Demografico;
  comportamentos: string[]; interesses: string[];
  dores: string[]; desejos: string[]; objecoes: string[];
  onde_encontrar: string[];
}
interface Nicho { nome: string; tamanho_estimado: string; potencial: string; descricao: string; subnichos: string[]; }
interface AngloCopy { angulo: string; publico_alvo: string; headline: string; descricao: string; exemplo_hook: string; }
interface Conjunto { nome: string; publico: string; tipo: string; orcamento_percentual: string; observacao: string; }
interface EstruturaCampanha {
  objetivo_meta: string; orcamento_sugerido: string;
  conjuntos: Conjunto[];
  estrategia_teste: string;
  metricas_alvo: { cpl_ideal: string; ctr_minimo: string; frequencia_max: string; roas_alvo: string };
}
interface Resultado {
  resumo: string; nichos: Nicho[]; publicos: Publico[];
  angulos_copy: AngloCopy[]; estrutura_campanha: EstruturaCampanha; alertas: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Badge({ label, cor }: { label: string; cor: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cor}`}>{label}</span>;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg text-white/20 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all">
      {copied ? <CheckCheck size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

function Collapse({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2.5">
          <Icon size={14} className="text-fuchsia-400" />
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-white/[0.04]">{children}</div>}
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function NichosSection({ nichos }: { nichos: Nicho[] }) {
  const cor = (p: string) =>
    p === "alto" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
    p === "medio" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
    "bg-white/5 text-white/40 border border-white/10";

  return (
    <Collapse title={`Nichos Identificados (${nichos.length})`} icon={Layers} defaultOpen>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
        {nichos.map((n, i) => (
          <div key={i} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-white leading-tight">{n.nome}</p>
              <Badge label={n.potencial} cor={cor(n.potencial)} />
            </div>
            <p className="text-[12px] text-white/40">{n.descricao}</p>
            <p className="text-[11px] text-fuchsia-400/70">📊 {n.tamanho_estimado}</p>
            <div className="flex flex-wrap gap-1.5">
              {n.subnichos.map((s, j) => (
                <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/50">{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Collapse>
  );
}

function PublicosSection({ publicos }: { publicos: Publico[] }) {
  const priorCor = (p: string) =>
    p === "principal" ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20" :
    p === "secundario" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
    "bg-white/5 text-white/40 border border-white/10";

  return (
    <Collapse title={`Públicos Detalhados (${publicos.length})`} icon={Users} defaultOpen>
      <div className="space-y-4 mt-4">
        {publicos.map((p, i) => (
          <div key={i} className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">{p.nome}</h3>
              <Badge label={p.prioridade} cor={priorCor(p.prioridade)} />
            </div>

            {/* Demográfico */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Idade", val: p.demografico.idade },
                { label: "Gênero", val: p.demografico.genero },
                { label: "Renda", val: p.demografico.renda },
                { label: "Escolaridade", val: p.demografico.escolaridade },
              ].map((item, j) => (
                <div key={j} className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">{item.label}</p>
                  <p className="text-[12px] text-white/70 font-medium">{item.val}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Interesses */}
              <div>
                <p className="text-[11px] text-fuchsia-400 uppercase tracking-wide font-semibold mb-2">Interesses</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.interesses.map((item, j) => (
                    <span key={j} className="text-[11px] px-2 py-1 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300">{item}</span>
                  ))}
                </div>
              </div>
              {/* Comportamentos */}
              <div>
                <p className="text-[11px] text-blue-400 uppercase tracking-wide font-semibold mb-2">Comportamentos</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.comportamentos.map((item, j) => (
                    <span key={j} className="text-[11px] px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">{item}</span>
                  ))}
                </div>
              </div>
              {/* Dores */}
              <div>
                <p className="text-[11px] text-red-400 uppercase tracking-wide font-semibold mb-2">Dores</p>
                <ul className="space-y-1">
                  {p.dores.map((d, j) => (
                    <li key={j} className="text-[12px] text-white/50 flex items-start gap-1.5"><span className="text-red-400 mt-0.5">·</span>{d}</li>
                  ))}
                </ul>
              </div>
              {/* Desejos */}
              <div>
                <p className="text-[11px] text-green-400 uppercase tracking-wide font-semibold mb-2">Desejos</p>
                <ul className="space-y-1">
                  {p.desejos.map((d, j) => (
                    <li key={j} className="text-[12px] text-white/50 flex items-start gap-1.5"><span className="text-green-400 mt-0.5">·</span>{d}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Objeções */}
            <div>
              <p className="text-[11px] text-amber-400 uppercase tracking-wide font-semibold mb-2">Objeções a quebrar</p>
              <div className="flex flex-wrap gap-1.5">
                {p.objecoes.map((o, j) => (
                  <span key={j} className="text-[11px] px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">{o}</span>
                ))}
              </div>
            </div>

            {/* Onde encontrar no Meta */}
            <div>
              <p className="text-[11px] text-white/30 uppercase tracking-wide font-semibold mb-2">Segmentação no Meta Ads</p>
              <div className="flex flex-wrap gap-1.5">
                {p.onde_encontrar.map((o, j) => (
                  <span key={j} className="text-[11px] px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50">{o}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Collapse>
  );
}

function AngulosSection({ angulos }: { angulos: AngloCopy[] }) {
  return (
    <Collapse title={`Ângulos de Copy (${angulos.length})`} icon={Brain}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {angulos.map((a, i) => (
          <div key={i} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-white">{a.angulo}</p>
              <span className="text-[10px] text-fuchsia-400/70 shrink-0">{a.publico_alvo}</span>
            </div>
            <div className="flex items-start justify-between gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[13px] font-semibold text-white/80 italic">&quot;{a.headline}&quot;</p>
              <CopyBtn text={a.headline} />
            </div>
            <p className="text-[12px] text-white/40">{a.descricao}</p>
            <div className="pt-2 border-t border-white/[0.04]">
              <p className="text-[10px] text-white/25 uppercase tracking-wide mb-1.5">Hook de exemplo</p>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] text-white/50">{a.exemplo_hook}</p>
                <CopyBtn text={a.exemplo_hook} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Collapse>
  );
}

function EstruturaSection({ estrutura }: { estrutura: EstruturaCampanha }) {
  const tipoCor = (t: string) =>
    t === "interesse" ? "bg-fuchsia-500/10 text-fuchsia-400" :
    t === "lookalike" ? "bg-blue-500/10 text-blue-400" :
    t === "remarketing" ? "bg-green-500/10 text-green-400" :
    "bg-white/5 text-white/40";

  return (
    <Collapse title="Estrutura de Campanha" icon={BarChart2}>
      <div className="space-y-4 mt-4">
        {/* Métricas alvo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "CPL Ideal", val: estrutura.metricas_alvo.cpl_ideal },
            { label: "CTR Mínimo", val: estrutura.metricas_alvo.ctr_minimo },
            { label: "Frequência Máx", val: estrutura.metricas_alvo.frequencia_max },
            { label: "ROAS Alvo", val: estrutura.metricas_alvo.roas_alvo },
          ].map((m, i) => (
            <div key={i} className="p-3 rounded-xl border border-fuchsia-500/15 bg-fuchsia-500/[0.05] text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-wide mb-1">{m.label}</p>
              <p className="text-sm font-bold text-fuchsia-300">{m.val}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <Target size={14} className="text-fuchsia-400 shrink-0" />
          <div>
            <span className="text-[11px] text-white/30 uppercase tracking-wide">Objetivo Meta: </span>
            <span className="text-[13px] text-white font-semibold">{estrutura.objetivo_meta}</span>
            <span className="text-[11px] text-white/30 ml-3">· Budget sugerido: </span>
            <span className="text-[13px] text-fuchsia-300 font-semibold">{estrutura.orcamento_sugerido}</span>
          </div>
        </div>

        {/* Conjuntos */}
        <div className="space-y-2">
          <p className="text-[11px] text-white/30 uppercase tracking-wide font-semibold">Conjuntos de Anúncios</p>
          {estrutura.conjuntos.map((c, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${tipoCor(c.tipo)}`}>{c.tipo}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[13px] font-semibold text-white">{c.nome}</p>
                  <p className="text-[11px] text-fuchsia-400">{c.orcamento_percentual}</p>
                </div>
                <p className="text-[12px] text-white/40 mt-0.5">{c.publico}</p>
                <p className="text-[11px] text-white/25 mt-1">{c.observacao}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Estratégia de teste */}
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <p className="text-[11px] text-white/30 uppercase tracking-wide font-semibold mb-2">Estratégia de Teste e Escala</p>
          <p className="text-[13px] text-white/60 leading-relaxed">{estrutura.estrategia_teste}</p>
        </div>
      </div>
    </Collapse>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function FunilPublicoPage() {
  const [form, setForm] = useState({
    produto: "", descricao: "", objetivo: "leads" as const,
    ticket: "", segmento: "", regiao: "Brasil", diferencial: "",
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function gerar() {
    if (!form.produto.trim()) { setErro("Informe o produto ou serviço."); return; }
    setLoading(true);
    setErro(null);
    setResultado(null);

    try {
      const res = await fetch("/api/funil-publico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ticket: Number(form.ticket) || 0 }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Erro ao gerar funil.");
      setResultado(data.resultado);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0b0b0d] to-[#0a0a0a] text-white">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-24 px-5 md:px-10 xl:px-14 py-10 max-w-[1200px] mx-auto w-full">

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-fuchsia-400" />
            <p className="text-[11px] text-fuchsia-400 font-semibold uppercase tracking-wider">IA & Criativos</p>
          </div>
          <h1 className="text-[1.9rem] font-bold text-white tracking-tight">Funil de Público</h1>
          <p className="text-[13px] text-white/30 mt-1">Preencha o produto e a IA mapeia nichos, públicos, ângulos de copy e estrutura de campanha.</p>
        </header>

        {/* Formulário */}
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Produto */}
            <div className="md:col-span-2">
              <label className="block text-[11px] text-white/40 uppercase tracking-wide font-semibold mb-1.5">Produto / Serviço *</label>
              <input
                value={form.produto}
                onChange={e => set("produto", e.target.value)}
                placeholder="Ex: Curso de inglês online para adultos"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-fuchsia-500/50 px-4 py-3 rounded-xl outline-none text-sm text-white placeholder-white/20 transition-colors"
              />
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-[11px] text-white/40 uppercase tracking-wide font-semibold mb-1.5">Descrição / Contexto</label>
              <textarea
                value={form.descricao}
                onChange={e => set("descricao", e.target.value)}
                placeholder="Descreva o produto, para quem serve, problema que resolve..."
                rows={3}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-fuchsia-500/50 px-4 py-3 rounded-xl outline-none text-sm text-white placeholder-white/20 transition-colors resize-none"
              />
            </div>

            {/* Objetivo */}
            <div>
              <label className="block text-[11px] text-white/40 uppercase tracking-wide font-semibold mb-1.5">Objetivo da Campanha</label>
              <select
                value={form.objetivo}
                onChange={e => set("objetivo", e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-fuchsia-500/50 px-4 py-3 rounded-xl outline-none text-sm text-white transition-colors"
              >
                <option value="leads">Captação de Leads</option>
                <option value="vendas">Vendas Diretas</option>
                <option value="trafego">Tráfego para Site</option>
                <option value="reconhecimento">Reconhecimento de Marca</option>
              </select>
            </div>

            {/* Ticket */}
            <div>
              <label className="block text-[11px] text-white/40 uppercase tracking-wide font-semibold mb-1.5">Ticket Médio (R$)</label>
              <input
                type="number"
                value={form.ticket}
                onChange={e => set("ticket", e.target.value)}
                placeholder="Ex: 297"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-fuchsia-500/50 px-4 py-3 rounded-xl outline-none text-sm text-white placeholder-white/20 transition-colors"
              />
            </div>

            {/* Segmento */}
            <div>
              <label className="block text-[11px] text-white/40 uppercase tracking-wide font-semibold mb-1.5">Segmento / Nicho</label>
              <input
                value={form.segmento}
                onChange={e => set("segmento", e.target.value)}
                placeholder="Ex: Educação, Saúde, Finanças..."
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-fuchsia-500/50 px-4 py-3 rounded-xl outline-none text-sm text-white placeholder-white/20 transition-colors"
              />
            </div>

            {/* Região */}
            <div>
              <label className="block text-[11px] text-white/40 uppercase tracking-wide font-semibold mb-1.5">Região Alvo</label>
              <input
                value={form.regiao}
                onChange={e => set("regiao", e.target.value)}
                placeholder="Ex: Brasil, São Paulo, Sul do Brasil..."
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-fuchsia-500/50 px-4 py-3 rounded-xl outline-none text-sm text-white placeholder-white/20 transition-colors"
              />
            </div>

            {/* Diferencial */}
            <div className="md:col-span-2">
              <label className="block text-[11px] text-white/40 uppercase tracking-wide font-semibold mb-1.5">Diferencial / Proposta de Valor</label>
              <input
                value={form.diferencial}
                onChange={e => set("diferencial", e.target.value)}
                placeholder="O que torna esse produto único? Ex: Método próprio, garantia de resultado, suporte vitalício..."
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-fuchsia-500/50 px-4 py-3 rounded-xl outline-none text-sm text-white placeholder-white/20 transition-colors"
              />
            </div>
          </div>

          {erro && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/[0.07]">
              <AlertTriangle size={13} className="text-red-400 shrink-0" />
              <p className="text-[13px] text-red-300">{erro}</p>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={gerar}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 hover:from-fuchsia-500 hover:to-violet-600 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-fuchsia-500/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loading ? "Analisando público..." : "Gerar Funil de Público"}
              {!loading && <ArrowRight size={13} />}
            </button>
            {resultado && (
              <button onClick={() => { setResultado(null); setForm({ produto: "", descricao: "", objetivo: "leads", ticket: "", segmento: "", regiao: "Brasil", diferencial: "" }); }}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-white/[0.08] text-white/40 hover:text-white text-sm transition-colors">
                <RefreshCw size={13} /> Novo funil
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-fuchsia-400" />
            <p className="text-white/40 text-sm">A IA está mapeando nichos, públicos e ângulos de copy...</p>
            <p className="text-white/20 text-xs">Isso pode levar 15-30 segundos</p>
          </div>
        )}

        {/* Resultado */}
        {resultado && !loading && (
          <div className="space-y-4">

            {/* Resumo */}
            <div className="flex items-start gap-3 p-5 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/[0.05]">
              <TrendingUp size={16} className="text-fuchsia-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-fuchsia-400 uppercase tracking-wide font-semibold mb-1">Análise Estratégica</p>
                <p className="text-[14px] text-white/70 leading-relaxed">{resultado.resumo}</p>
              </div>
            </div>

            {/* Alertas */}
            {resultado.alertas?.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05]">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {resultado.alertas.map((a, i) => (
                    <p key={i} className="text-[13px] text-amber-300/80">{a}</p>
                  ))}
                </div>
              </div>
            )}

            <NichosSection nichos={resultado.nichos ?? []} />
            <PublicosSection publicos={resultado.publicos ?? []} />
            <AngulosSection angulos={resultado.angulos_copy ?? []} />
            <EstruturaSection estrutura={resultado.estrutura_campanha} />

            {/* CTA final */}
            <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-white/20">
              <Zap size={11} className="text-fuchsia-400/50" />
              <span>Funil gerado pela Erizon IA · Use os públicos direto no Meta Ads Manager</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
