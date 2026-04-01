"use client";

import { useState } from "react";
import {
  ArrowRight, Loader2, ChevronRight, TrendingUp, Zap,
  Target, AlertTriangle, CheckCircle2, BarChart3, Lightbulb,
  Clock, Megaphone, Star,
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Alavanca {
  titulo: string;
  descricao: string;
  impacto: string;
  prazo: string;
  como_comecar: string;
}
interface CanalRec {
  canal: string;
  por_que_para_este_nicho: string;
  como_usar: string;
}
interface Diagnostico {
  titulo_diagnostico: string;
  resumo_executivo: string;
  score_growth: number;
  principais_alavancas: Alavanca[];
  plano_30_dias: string[];
  canais_recomendados: CanalRec[];
  alerta_critico: string;
  proximos_passos: string[];
  frase_motivacional: string;
}

// ── Opções ─────────────────────────────────────────────────────────────────────
const NICHOS = [
  { label: "E-commerce", emoji: "🛍️" },
  { label: "Imobiliária / Corretor", emoji: "🏠" },
  { label: "Clínica / Saúde", emoji: "🏥" },
  { label: "Restaurante / Food", emoji: "🍽️" },
  { label: "Infoproduto / Curso", emoji: "🎓" },
  { label: "SaaS / Software", emoji: "💻" },
  { label: "Serviço local", emoji: "📍" },
  { label: "Consultoria / Agência", emoji: "📊" },
  { label: "Varejo físico", emoji: "🏪" },
  { label: "Educação / Escola", emoji: "📚" },
  { label: "Indústria / B2B", emoji: "🏭" },
  { label: "Outro", emoji: "✳️" },
];

const FATURAMENTOS = [
  { label: "Ainda não faturando", emoji: "🌱" },
  { label: "Até R$ 10k/mês", emoji: "📈" },
  { label: "R$ 10k – R$ 50k/mês", emoji: "💰" },
  { label: "R$ 50k – R$ 150k/mês", emoji: "🚀" },
  { label: "R$ 150k – R$ 500k/mês", emoji: "⚡" },
  { label: "Acima de R$ 500k/mês", emoji: "🏆" },
];

const CANAIS = [
  { label: "Instagram orgânico", emoji: "📸" },
  { label: "Meta Ads", emoji: "🎯" },
  { label: "Google Ads", emoji: "🔍" },
  { label: "WhatsApp", emoji: "💬" },
  { label: "TikTok", emoji: "🎵" },
  { label: "SEO / Blog", emoji: "✍️" },
  { label: "E-mail marketing", emoji: "📧" },
  { label: "Indicação", emoji: "🤝" },
  { label: "LinkedIn", emoji: "💼" },
  { label: "Nenhum ainda", emoji: "🚫" },
];

const DESAFIOS = [
  { label: "Gerar mais leads", emoji: "🎣" },
  { label: "Converter mais vendas", emoji: "💳" },
  { label: "Reduzir custo de aquisição", emoji: "📉" },
  { label: "Fidelizar clientes", emoji: "❤️" },
  { label: "Escalar sem perder qualidade", emoji: "⚖️" },
  { label: "Ter previsibilidade de receita", emoji: "📅" },
  { label: "Construir presença digital", emoji: "🌐" },
  { label: "Lançar um novo produto", emoji: "🚀" },
];

const METAS = [
  { label: "Dobrar o faturamento", emoji: "2️⃣" },
  { label: "Chegar a 100 clientes", emoji: "👥" },
  { label: "Atingir R$ 50k/mês", emoji: "💰" },
  { label: "Lançar meu produto", emoji: "🎯" },
  { label: "Automatizar o marketing", emoji: "🤖" },
  { label: "Montar time de vendas", emoji: "🏆" },
  { label: "Entrar em novo mercado", emoji: "🗺️" },
  { label: "Reduzir o CAC pela metade", emoji: "✂️" },
];

const ORCAMENTOS = [
  { label: "Sem orçamento definido", emoji: "🤔" },
  { label: "Até R$ 500/mês", emoji: "🌱" },
  { label: "R$ 500 – R$ 2k/mês", emoji: "📈" },
  { label: "R$ 2k – R$ 5k/mês", emoji: "💰" },
  { label: "R$ 5k – R$ 15k/mês", emoji: "🚀" },
  { label: "Acima de R$ 15k/mês", emoji: "⚡" },
];

// ── Passos ─────────────────────────────────────────────────────────────────────
const PASSOS = [
  { titulo: "Seu negócio", subtitulo: "Qual é o seu nicho?" },
  { titulo: "Tamanho atual", subtitulo: "Qual é o faturamento mensal?" },
  { titulo: "Marketing hoje", subtitulo: "Quais canais você usa? (pode marcar vários)" },
  { titulo: "Principal desafio", subtitulo: "O que está travando o crescimento?" },
  { titulo: "Sua meta", subtitulo: "Onde quer chegar nos próximos 3 meses?" },
  { titulo: "Investimento", subtitulo: "Quanto investe em marketing por mês?" },
];

// ── Componente principal ───────────────────────────────────────────────────────
export default function DiagnosticoGrowth() {
  const [tela, setTela] = useState<"hero" | "lead" | "form" | "loading" | "resultado">("hero");
  const [passo, setPasso] = useState(0);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    nome: "", email: "",
    nicho: "", faturamento: "",
    canais: [] as string[],
    desafio: "", meta: "", orcamento: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleCanal(c: string) {
    setForm((f) => ({
      ...f,
      canais: f.canais.includes(c) ? f.canais.filter((x) => x !== c) : [...f.canais, c],
    }));
  }

  // Seleciona e avança automaticamente (para campos de escolha única)
  function selecionarEAvancar(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setTimeout(() => setPasso((p) => p + 1), 180);
  }

  async function enviar() {
    setTela("loading");
    setErro("");
    try {
      const res = await fetch("/api/growth-diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, canais: form.canais.join(", ") || "Nenhum" }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Erro ao gerar diagnóstico");
      setDiagnostico(json.diagnostico);
      setTela("resultado");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado");
      setTela("form");
    }
  }

  function avancarLead() {
    if (!form.nome.trim()) { setErro("Coloca seu nome."); return; }
    if (!form.email.includes("@")) { setErro("E-mail inválido."); return; }
    setErro("");
    setTela("form");
    setPasso(0);
  }

  // ── Tela hero ────────────────────────────────────────────────────────────────
  if (tela === "hero") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 rounded-full px-4 py-1.5 mb-8">
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-purple-300 text-xs font-medium">Diagnóstico gratuito em 90 segundos</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight max-w-lg">
          Descubra o que está<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            travando seu crescimento
          </span>
        </h1>
        <p className="text-white/50 text-base max-w-sm mb-10">
          Responda 6 perguntas rápidas e receba um plano de ação personalizado para o seu negócio — gerado por IA.
        </p>
        <button
          onClick={() => setTela("lead")}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl px-10 py-4 text-lg transition-all shadow-lg shadow-purple-900/30"
        >
          Quero meu diagnóstico <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-white/20 text-xs mt-4">Gratuito · Sem cartão · 90 segundos</p>
      </div>
    );
  }

  // ── Tela lead ────────────────────────────────────────────────────────────────
  if (tela === "lead") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center mb-2">
            <h2 className="text-2xl font-bold text-white mb-1">Antes de começar</h2>
            <p className="text-white/40 text-sm">Para onde envio o diagnóstico?</p>
          </div>
          <div className="space-y-3">
            <input
              autoFocus
              value={form.nome}
              onChange={(e) => { set("nome", e.target.value); setErro(""); }}
              onKeyDown={(e) => e.key === "Enter" && avancarLead()}
              placeholder="Seu nome"
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
            />
            <input
              value={form.email}
              onChange={(e) => { set("email", e.target.value); setErro(""); }}
              onKeyDown={(e) => e.key === "Enter" && avancarLead()}
              placeholder="Seu e-mail"
              type="email"
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          {erro && <p className="text-red-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{erro}</p>}
          <button
            onClick={avancarLead}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl py-4 transition-all"
          >
            Começar <ArrowRight className="w-4 h-4" />
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
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-600/20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
        <div>
          <p className="text-white text-xl font-semibold mb-2">Analisando seu negócio…</p>
          <p className="text-white/40 text-sm max-w-xs">Mapeando oportunidades específicas para o seu nicho.</p>
        </div>
      </div>
    );
  }

  // ── Resultado ────────────────────────────────────────────────────────────────
  if (tela === "resultado" && diagnostico) {
    return <ResultadoDiagnostico diagnostico={diagnostico} />;
  }

  // ── Formulário multi-choice ──────────────────────────────────────────────────
  const progresso = Math.round(((passo) / PASSOS.length) * 100);
  const { titulo, subtitulo } = PASSOS[passo];

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Barra de progresso */}
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
            <p className="text-white/40 text-sm">{subtitulo}</p>
          </div>

          {/* Passo 0: Nicho */}
          {passo === 0 && (
            <div className="grid grid-cols-3 gap-2">
              {NICHOS.map(({ label, emoji }) => (
                <button
                  key={label}
                  onClick={() => selecionarEAvancar("nicho", label)}
                  className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border transition-all text-center ${
                    form.nicho === label
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-white/70 text-xs leading-tight">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Passo 1: Faturamento */}
          {passo === 1 && (
            <div className="space-y-2">
              {FATURAMENTOS.map(({ label, emoji }) => (
                <button
                  key={label}
                  onClick={() => selecionarEAvancar("faturamento", label)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${
                    form.faturamento === label
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

          {/* Passo 2: Canais (múltipla escolha) */}
          {passo === 2 && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {CANAIS.map(({ label, emoji }) => (
                  <button
                    key={label}
                    onClick={() => toggleCanal(label)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                      form.canais.includes(label)
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-white/70 text-xs">{label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPasso((p) => p + 1)}
                disabled={form.canais.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl py-4 transition-all disabled:opacity-40"
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Passo 3: Desafio */}
          {passo === 3 && (
            <div className="grid grid-cols-2 gap-2">
              {DESAFIOS.map(({ label, emoji }) => (
                <button
                  key={label}
                  onClick={() => selecionarEAvancar("desafio", label)}
                  className={`flex flex-col items-start gap-2 px-4 py-4 rounded-2xl border transition-all ${
                    form.desafio === label
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-white/70 text-xs leading-snug">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Passo 4: Meta */}
          {passo === 4 && (
            <div className="grid grid-cols-2 gap-2">
              {METAS.map(({ label, emoji }) => (
                <button
                  key={label}
                  onClick={() => selecionarEAvancar("meta", label)}
                  className={`flex flex-col items-start gap-2 px-4 py-4 rounded-2xl border transition-all ${
                    form.meta === label
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-white/70 text-xs leading-snug">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Passo 5: Orçamento + enviar */}
          {passo === 5 && (
            <>
              <div className="space-y-2 mb-5">
                {ORCAMENTOS.map(({ label, emoji }) => (
                  <button
                    key={label}
                    onClick={() => set("orcamento", label)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${
                      form.orcamento === label
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-white/80 text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={enviar}
                disabled={!form.orcamento}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl py-4 transition-all disabled:opacity-40"
              >
                <Zap className="w-4 h-4" /> Gerar meu diagnóstico
              </button>
            </>
          )}

          {erro && (
            <p className="text-red-400 text-sm mt-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {erro}
            </p>
          )}

          {passo > 0 && (
            <button
              onClick={() => setPasso((p) => p - 1)}
              className="mt-4 w-full text-white/25 text-sm hover:text-white/40 transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Resultado ──────────────────────────────────────────────────────────────────
function ResultadoDiagnostico({ diagnostico: d }: { diagnostico: Diagnostico }) {
  const scoreColor =
    d.score_growth >= 70 ? "text-green-400" :
    d.score_growth >= 40 ? "text-yellow-400" : "text-red-400";

  const impactoBadge = (i: string) =>
    i === "alto" ? "bg-green-500/10 text-green-400 border-green-500/20" :
    i === "médio" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
    "bg-white/5 text-white/40 border-white/10";

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20">
      <div className="bg-gradient-to-b from-purple-950/40 to-transparent pt-12 pb-8 px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-4">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-300 text-xs font-medium">Diagnóstico pronto</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{d.titulo_diagnostico}</h1>
        <p className="text-white/50 text-sm max-w-md mx-auto">{d.resumo_executivo}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-5">
        {/* Score */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex items-center gap-6">
          <div className="text-center shrink-0">
            <div className={`text-5xl font-black ${scoreColor}`}>{d.score_growth}</div>
            <div className="text-white/30 text-xs mt-1">Growth Score</div>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  d.score_growth >= 70 ? "bg-green-500" :
                  d.score_growth >= 40 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${d.score_growth}%` }}
              />
            </div>
            <p className="text-white/40 text-xs mt-2">
              {d.score_growth >= 70 ? "Bem estruturado — foco em escalar" :
               d.score_growth >= 40 ? "Base sólida — gaps claros para otimizar" :
               "Momento de estruturar antes de escalar"}
            </p>
          </div>
        </div>

        {/* Alerta */}
        {d.alerta_critico && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex gap-4">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-semibold text-sm mb-1">Alerta crítico</p>
              <p className="text-white/60 text-sm">{d.alerta_critico}</p>
            </div>
          </div>
        )}

        {/* Alavancas */}
        {d.principais_alavancas?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h2 className="text-white font-bold">Principais alavancas</h2>
            </div>
            <div className="space-y-3">
              {d.principais_alavancas.map((a, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-white font-semibold text-sm">{a.titulo}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${impactoBadge(a.impacto)}`}>{a.impacto}</span>
                  </div>
                  <p className="text-white/50 text-sm mb-3">{a.descricao}</p>
                  <div className="flex items-start gap-2 bg-purple-600/10 rounded-xl p-3">
                    <ChevronRight className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <p className="text-white/60 text-xs"><span className="text-purple-300 font-medium">Como começar: </span>{a.como_comecar}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Clock className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-white/30 text-xs">{a.prazo}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Plano 30 dias */}
        {d.plano_30_dias?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-pink-400" />
              <h2 className="text-white font-bold">Plano 30 dias</h2>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
              {d.plano_30_dias.map((acao, i) => (
                <div key={i} className={`flex items-start gap-4 p-4 ${i < d.plano_30_dias.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                  <div className="w-8 h-8 rounded-lg bg-pink-600/10 border border-pink-600/20 flex items-center justify-center shrink-0">
                    <span className="text-pink-400 text-xs font-bold">S{i + 1}</span>
                  </div>
                  <p className="text-white/70 text-sm pt-1">{acao}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Canais */}
        {d.canais_recomendados?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-bold">Canais recomendados</h2>
            </div>
            <div className="space-y-3">
              {d.canais_recomendados.map((c, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-semibold text-sm">{c.canal}</span>
                  </div>
                  <p className="text-white/40 text-xs mb-2">{c.por_que_para_este_nicho}</p>
                  <p className="text-white/60 text-sm">{c.como_usar}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Próximos passos */}
        {d.proximos_passos?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h2 className="text-white font-bold">Próximos passos</h2>
            </div>
            <div className="space-y-2">
              {d.proximos_passos.map((p, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <div className="w-6 h-6 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                    <span className="text-yellow-400 text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-white/70 text-sm">{p}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Frase */}
        {d.frase_motivacional && (
          <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-600/20 rounded-2xl p-6 text-center">
            <Star className="w-6 h-6 text-purple-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg italic">"{d.frase_motivacional}"</p>
          </div>
        )}

        {/* CTA */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
          <p className="text-white font-bold text-lg mb-2">Quer implementar isso com suporte?</p>
          <p className="text-white/40 text-sm mb-5">O Erizon automatiza seu marketing e acelera a execução do plano.</p>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl px-8 py-4 transition-all"
          >
            <Zap className="w-4 h-4" /> Começar no Erizon — grátis
          </a>
        </div>
      </div>
    </div>
  );
}
