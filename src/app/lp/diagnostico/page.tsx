"use client";

import { useState } from "react";
import {
  ArrowRight, Loader2, AlertTriangle, Zap,
  TrendingUp, Target, ChevronRight, Calendar,
  AlertCircle, CheckCircle2, BarChart3,
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Panorama {
  titulo: string;
  status_operacao: string;
  score: number;
  ponto_critico: string;
  oportunidades: string[];
  recomendacao_comercial: string;
  recomendacao_residencial?: string;
  risco_atual: string;
  frase_fechamento: string;
  cta_label: string;
}

// ── Opções ─────────────────────────────────────────────────────────────────────
const NICHOS = [
  { label: "Imobiliária / Incorporadora", emoji: "🏢" },
  { label: "Corretor de imóveis", emoji: "🏠" },
  { label: "Arquitetura / Design", emoji: "📐" },
  { label: "Clínica / Saúde", emoji: "🏥" },
  { label: "E-commerce", emoji: "🛍️" },
  { label: "Restaurante / Food", emoji: "🍽️" },
  { label: "Consultoria / Serviço B2B", emoji: "📊" },
  { label: "Infoproduto / Curso", emoji: "🎓" },
  { label: "Varejo / Loja física", emoji: "🏪" },
  { label: "Outro", emoji: "✳️" },
];

const FOCOS = [
  { label: "Comercial (empresas, salas, galpões)", emoji: "🏗️" },
  { label: "Residencial alto padrão", emoji: "✨" },
  { label: "Residencial popular / médio", emoji: "🏡" },
  { label: "Misto (comercial + residencial)", emoji: "⚖️" },
  { label: "Produto / serviço único", emoji: "🎯" },
];

const TICKETS = [
  { label: "Até R$ 5 mil", emoji: "💵" },
  { label: "R$ 5k – R$ 20k", emoji: "💰" },
  { label: "R$ 20k – R$ 50k", emoji: "💎" },
  { label: "R$ 50k – R$ 200k", emoji: "🏆" },
  { label: "Acima de R$ 200k", emoji: "👑" },
];

const OBJETIVOS = [
  { label: "Aumentar volume de leads", emoji: "📈" },
  { label: "Atrair clientes mais qualificados", emoji: "🎯" },
  { label: "Fortalecer posicionamento", emoji: "🧲" },
  { label: "Recuperar clientes inativos", emoji: "🔄" },
  { label: "Lançar novo produto ou unidade", emoji: "🚀" },
];

const QUALIDADE_LEADS = [
  { label: "Qualificados — fecham bem", emoji: "✅" },
  { label: "Mistos — alguns fecham", emoji: "🔀" },
  { label: "Desqualificados — perco tempo", emoji: "❌" },
  { label: "Quase não recebo leads", emoji: "🔇" },
];

const DORES = [
  { label: "Pouco volume de leads", emoji: "📉" },
  { label: "Lead errado / desalinhado", emoji: "🎭" },
  { label: "Demora pra fechar", emoji: "⏳" },
  { label: "Alto custo por lead", emoji: "💸" },
  { label: "Dependência de indicação", emoji: "🤝" },
  { label: "Não consigo escalar", emoji: "🧱" },
];

const ESTRUTURAS = [
  { label: "Site + Instagram ativos", emoji: "✅" },
  { label: "Só Instagram", emoji: "📸" },
  { label: "Só site", emoji: "🌐" },
  { label: "Nenhum dos dois", emoji: "⚠️" },
  { label: "Em construção", emoji: "🔨" },
];

const INVESTIMENTOS = [
  { label: "Ainda não invisto em ads", emoji: "🌱" },
  { label: "Até R$ 1.000/mês", emoji: "📈" },
  { label: "R$ 1k – R$ 3k/mês", emoji: "💰" },
  { label: "R$ 3k – R$ 10k/mês", emoji: "🚀" },
  { label: "Acima de R$ 10k/mês", emoji: "⚡" },
];

const PASSOS = [
  { titulo: "Seu segmento", sub: "Em qual nicho você atua?" },
  { titulo: "Foco do negócio", sub: "Qual é o perfil do seu produto ou serviço?" },
  { titulo: "Ticket médio", sub: "Qual é o valor médio por venda ou contrato?" },
  { titulo: "Objetivo agora", sub: "O que você mais precisa hoje?" },
  { titulo: "Qualidade dos leads", sub: "Como chegam os leads que você recebe hoje?" },
  { titulo: "Principal dor", sub: "O que mais te travar no crescimento?" },
  { titulo: "Estrutura digital", sub: "O que você tem online hoje?" },
  { titulo: "Investimento em tráfego", sub: "Quanto investe (ou está disposto a investir) por mês?" },
];

// ── Componente principal ───────────────────────────────────────────────────────
export default function DiagnosticoPage() {
  const [tela, setTela] = useState<"hero" | "lead" | "form" | "loading" | "resultado">("hero");
  const [passo, setPasso] = useState(0);
  const [panorama, setPanorama] = useState<Panorama | null>(null);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    nome: "", empresa: "", whatsapp: "", instagram: "",
    nicho: "", foco: "", ticket: "",
    objetivo: "", qualidade_leads: "", dor: "",
    estrutura: "", investimento: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErro("");
  }

  function selecionarEAvancar(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setTimeout(() => setPasso((p) => p + 1), 160);
  }

  function avancarLead() {
    if (!form.nome.trim()) { setErro("Coloca seu nome."); return; }
    if (!form.whatsapp.replace(/\D/g, "") || form.whatsapp.replace(/\D/g, "").length < 10) {
      setErro("WhatsApp inválido."); return;
    }
    setErro("");
    setTela("form");
    setPasso(0);
  }

  async function enviar(ultimoValor: string) {
    const finalForm = { ...form, investimento: ultimoValor };
    setTela("loading");
    setErro("");
    try {
      const res = await fetch("/api/growth-diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...finalForm, modo: "panorama_estrategico" }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Erro ao gerar diagnóstico");
      setPanorama(json.diagnostico ?? json.panorama);
      setTela("resultado");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado");
      setTela("form");
      setPasso(PASSOS.length - 1);
    }
  }

  const progresso = Math.round((passo / PASSOS.length) * 100);

  // ── Hero ─────────────────────────────────────────────────────────────────────
  if (tela === "hero") {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 rounded-full px-4 py-1.5 mb-8">
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-purple-300 text-xs font-medium">Diagnóstico estratégico gratuito · 2 minutos</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-[1.1] max-w-xl">
          Descubra por que seu<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            marketing não converte
          </span>
        </h1>
        <p className="text-white/50 text-base max-w-sm mb-3">
          Responda 8 perguntas rápidas e receba um panorama completo da sua operação — com o que ajustar antes de investir mais.
        </p>
        <p className="text-white/25 text-sm mb-10">
          Diagnóstico personalizado por nicho · Sem enrolação
        </p>
        <button
          onClick={() => setTela("lead")}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl px-10 py-4 text-lg transition-all shadow-xl shadow-purple-900/30"
        >
          Quero meu diagnóstico <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-white/20 text-xs mt-4">Gratuito · Sem compromisso</p>
      </div>
    );
  }

  // ── Lead ─────────────────────────────────────────────────────────────────────
  if (tela === "lead") {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center mb-2">
            <h2 className="text-2xl font-bold text-white mb-1">Antes de começar</h2>
            <p className="text-white/40 text-sm">Para quem eu envio o panorama?</p>
          </div>
          <input
            autoFocus
            value={form.nome}
            onChange={(e) => { set("nome", e.target.value); setErro(""); }}
            placeholder="Seu nome"
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
          />
          <input
            value={form.empresa}
            onChange={(e) => set("empresa", e.target.value)}
            placeholder="Empresa ou marca (opcional)"
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
          />
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 text-base select-none">@</span>
            <input
              value={form.instagram}
              onChange={(e) => set("instagram", e.target.value.replace("@", ""))}
              placeholder="seu.instagram (opcional)"
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-9 pr-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <input
            value={form.whatsapp}
            onChange={(e) => { set("whatsapp", e.target.value); setErro(""); }}
            onKeyDown={(e) => e.key === "Enter" && avancarLead()}
            placeholder="WhatsApp (com DDD)"
            type="tel"
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
          />
          {erro && <p className="text-red-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{erro}</p>}
          <button
            onClick={avancarLead}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl py-4 transition-all"
          >
            Iniciar diagnóstico <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => setTela("hero")} className="w-full text-white/25 text-sm hover:text-white/40 transition-colors">
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (tela === "loading") {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-600/20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
        <div>
          <p className="text-white text-xl font-semibold mb-2">Gerando seu panorama estratégico…</p>
          <p className="text-white/40 text-sm max-w-xs">Analisando seu cenário e identificando os pontos críticos.</p>
        </div>
        <div className="flex flex-col gap-2 mt-2 text-left">
          {["Mapeando nicho e segmento", "Identificando gaps na operação", "Montando recomendação estratégica"].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-white/30">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
              {t}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Resultado ────────────────────────────────────────────────────────────────
  if (tela === "resultado" && panorama) {
    return <PanoramaEstrategico panorama={panorama} nome={form.nome} nicho={form.nicho} />;
  }

  // ── Formulário ───────────────────────────────────────────────────────────────
  const { titulo, sub } = PASSOS[passo];

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col">
      {/* Progresso */}
      <div className="pt-8 px-4 max-w-lg mx-auto w-full">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/30 text-xs">{passo + 1} de {PASSOS.length}</span>
          <span className="text-purple-400 text-xs font-medium">{progresso}%</span>
        </div>
        <div className="h-1 bg-white/[0.06] rounded-full">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">{titulo}</h2>
            <p className="text-white/40 text-sm">{sub}</p>
          </div>

          {/* Passo 0: Nicho */}
          {passo === 0 && (
            <div className="grid grid-cols-2 gap-2">
              {NICHOS.map(({ label, emoji }) => (
                <Opcao key={label} label={label} emoji={emoji} selecionado={form.nicho === label}
                  onClick={() => selecionarEAvancar("nicho", label)} />
              ))}
            </div>
          )}

          {/* Passo 1: Foco */}
          {passo === 1 && (
            <div className="space-y-2">
              {FOCOS.map(({ label, emoji }) => (
                <OpcaoLinha key={label} label={label} emoji={emoji} selecionado={form.foco === label}
                  onClick={() => selecionarEAvancar("foco", label)} />
              ))}
            </div>
          )}

          {/* Passo 2: Ticket */}
          {passo === 2 && (
            <div className="space-y-2">
              {TICKETS.map(({ label, emoji }) => (
                <OpcaoLinha key={label} label={label} emoji={emoji} selecionado={form.ticket === label}
                  onClick={() => selecionarEAvancar("ticket", label)} />
              ))}
            </div>
          )}

          {/* Passo 3: Objetivo */}
          {passo === 3 && (
            <div className="grid grid-cols-1 gap-2">
              {OBJETIVOS.map(({ label, emoji }) => (
                <OpcaoLinha key={label} label={label} emoji={emoji} selecionado={form.objetivo === label}
                  onClick={() => selecionarEAvancar("objetivo", label)} />
              ))}
            </div>
          )}

          {/* Passo 4: Qualidade leads */}
          {passo === 4 && (
            <div className="space-y-2">
              {QUALIDADE_LEADS.map(({ label, emoji }) => (
                <OpcaoLinha key={label} label={label} emoji={emoji} selecionado={form.qualidade_leads === label}
                  onClick={() => selecionarEAvancar("qualidade_leads", label)} />
              ))}
            </div>
          )}

          {/* Passo 5: Dor */}
          {passo === 5 && (
            <div className="grid grid-cols-2 gap-2">
              {DORES.map(({ label, emoji }) => (
                <Opcao key={label} label={label} emoji={emoji} selecionado={form.dor === label}
                  onClick={() => selecionarEAvancar("dor", label)} />
              ))}
            </div>
          )}

          {/* Passo 6: Estrutura */}
          {passo === 6 && (
            <div className="space-y-2">
              {ESTRUTURAS.map(({ label, emoji }) => (
                <OpcaoLinha key={label} label={label} emoji={emoji} selecionado={form.estrutura === label}
                  onClick={() => selecionarEAvancar("estrutura", label)} />
              ))}
            </div>
          )}

          {/* Passo 7: Investimento + enviar */}
          {passo === 7 && (
            <div className="space-y-2">
              {INVESTIMENTOS.map(({ label, emoji }) => (
                <button
                  key={label}
                  onClick={() => enviar(label)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${
                    form.investimento === label
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-white/80 text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          )}

          {erro && (
            <p className="text-red-400 text-sm mt-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {erro}
            </p>
          )}

          {passo > 0 && (
            <button
              onClick={() => setPasso((p) => p - 1)}
              className="mt-5 w-full text-white/25 text-sm hover:text-white/40 transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes de opção ───────────────────────────────────────────────────
function Opcao({ label, emoji, selecionado, onClick }: { label: string; emoji: string; selecionado: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border transition-all text-center ${
        selecionado ? "border-purple-500 bg-purple-500/10" : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-white/70 text-xs leading-tight">{label}</span>
    </button>
  );
}

function OpcaoLinha({ label, emoji, selecionado, onClick }: { label: string; emoji: string; selecionado: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${
        selecionado ? "border-purple-500 bg-purple-500/10" : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-white/80 text-sm font-medium text-left">{label}</span>
    </button>
  );
}

// ── Panorama estratégico ───────────────────────────────────────────────────────
function PanoramaEstrategico({ panorama: p, nome, nicho }: { panorama: Panorama; nome: string; nicho: string }) {
  const scoreColor =
    p.score >= 70 ? "text-green-400" :
    p.score >= 40 ? "text-yellow-400" : "text-red-400";

  const scoreBg =
    p.score >= 70 ? "bg-green-500" :
    p.score >= 40 ? "bg-yellow-500" : "bg-red-500";

  const scoreLabel =
    p.score >= 70 ? "Operação estruturada — hora de escalar" :
    p.score >= 40 ? "Base boa — gaps claros para corrigir" :
    "Estruturar antes de escalar";

  return (
    <div className="min-h-screen bg-[#080810] pb-24">
      {/* Topo */}
      <div className="bg-gradient-to-b from-purple-950/50 to-transparent pt-12 pb-8 px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-4">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-300 text-xs font-medium">Panorama estratégico gerado</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">{p.titulo}</h1>
        <p className="text-white/40 text-sm">Diagnóstico exclusivo para {nome} · {nicho}</p>
      </div>

      <div className="max-w-xl mx-auto px-4 space-y-4">

        {/* Score */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex items-center gap-5">
          <div className="text-center shrink-0">
            <div className={`text-5xl font-black ${scoreColor}`}>{p.score}</div>
            <div className="text-white/30 text-[10px] mt-1 uppercase tracking-wide">Score</div>
          </div>
          <div className="flex-1">
            <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full ${scoreBg}`} style={{ width: `${p.score}%` }} />
            </div>
            <p className="text-white/40 text-xs">{scoreLabel}</p>
          </div>
        </div>

        {/* Status da operação */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-white font-bold text-sm uppercase tracking-wide">Status da operação</span>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">{p.status_operacao}</p>
        </div>

        {/* Ponto crítico */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex gap-4">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-bold text-sm mb-1">Ponto crítico</p>
            <p className="text-white/60 text-sm leading-relaxed">{p.ponto_critico}</p>
          </div>
        </div>

        {/* Oportunidades */}
        {p.oportunidades?.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-white font-bold text-sm uppercase tracking-wide">Oportunidades identificadas</span>
            </div>
            <div className="space-y-3">
              {p.oportunidades.map((o, i) => (
                <div key={i} className="flex items-start gap-3">
                  <ChevronRight className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <p className="text-white/70 text-sm">{o}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recomendação estratégica */}
        <div className="bg-purple-600/5 border border-purple-600/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-white font-bold text-sm uppercase tracking-wide">Recomendação estratégica</span>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">{p.recomendacao_comercial}</p>
          {p.recomendacao_residencial && (
            <p className="text-white/50 text-sm leading-relaxed mt-3 pt-3 border-t border-white/[0.06]">{p.recomendacao_residencial}</p>
          )}
        </div>

        {/* Risco atual */}
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 flex gap-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-bold text-sm mb-1">Risco atual</p>
            <p className="text-white/60 text-sm leading-relaxed">{p.risco_atual}</p>
          </div>
        </div>

        {/* Frase de fechamento */}
        <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-600/20 rounded-2xl p-6 text-center">
          <p className="text-white font-semibold text-base italic leading-relaxed">"{p.frase_fechamento}"</p>
        </div>

        {/* CTA agendar */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
          <Zap className="w-6 h-6 text-purple-400 mx-auto mb-3" />
          <p className="text-white font-bold text-lg mb-2">Próximo passo</p>
          <p className="text-white/40 text-sm mb-5">
            Vamos revisar esse panorama juntos e montar a estrutura certa para o seu negócio.
          </p>
          <a
            href="https://wa.me/5519983308442"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl px-8 py-4 transition-all w-full justify-center"
          >
            <Calendar className="w-4 h-4" />
            {p.cta_label || "Agendar reunião estratégica"}
          </a>
          <p className="text-white/20 text-xs mt-3">Sem compromisso · Diagnóstico aplicado na prática</p>
        </div>

      </div>
    </div>
  );
}
