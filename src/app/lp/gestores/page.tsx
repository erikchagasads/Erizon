"use client";

import { useState } from "react";
import { ArrowRight, Zap, CheckCircle2, AlertTriangle, BarChart2, Clock, Brain, TrendingUp } from "lucide-react";

// ── Quiz ───────────────────────────────────────────────────────────────────────
const PERGUNTAS = [
  {
    campo: "campanhas",
    titulo: "Quantas campanhas ativas você gerencia hoje?",
    sub: "Volume de trabalho",
    opcoes: [
      { label: "1 a 5", emoji: "🌱" },
      { label: "6 a 20", emoji: "📊" },
      { label: "21 a 50", emoji: "🚀" },
      { label: "Mais de 50", emoji: "🔥" },
    ],
  },
  {
    campo: "dor",
    titulo: "Qual seu maior problema no dia a dia?",
    sub: "Desafio principal",
    opcoes: [
      { label: "Perco horas analisando dados manualmente", emoji: "⏳" },
      { label: "Não consigo escalar sem perder ROAS", emoji: "📉" },
      { label: "Tomo decisões no feeling, sem dados claros", emoji: "🎲" },
      { label: "Clientes cobrando e não sei o que mudar", emoji: "😤" },
    ],
  },
  {
    campo: "tempo",
    titulo: "Quanto tempo você gasta por dia só analisando campanhas?",
    sub: "Tempo gasto em análise",
    opcoes: [
      { label: "Menos de 1 hora", emoji: "⚡" },
      { label: "1 a 2 horas", emoji: "🕐" },
      { label: "2 a 4 horas", emoji: "🕓" },
      { label: "Mais de 4 horas", emoji: "😰" },
    ],
  },
  {
    campo: "investimento",
    titulo: "Qual o investimento mensal total que você gerencia em ads?",
    sub: "Volume de verba",
    opcoes: [
      { label: "Até R$5.000", emoji: "💵" },
      { label: "R$5.000 – R$30.000", emoji: "💰" },
      { label: "R$30.000 – R$100.000", emoji: "🚀" },
      { label: "Acima de R$100.000", emoji: "👑" },
    ],
  },
  {
    campo: "ia",
    titulo: "Você usa IA para otimizar campanhas hoje?",
    sub: "Ferramentas atuais",
    opcoes: [
      { label: "Não uso nenhuma ferramenta", emoji: "❌" },
      { label: "Uso só o Meta AI padrão", emoji: "😐" },
      { label: "Já tentei outras, não funcionou", emoji: "😕" },
      { label: "Uso outras ferramentas de IA", emoji: "🤖" },
    ],
  },
];

const DORES: Record<string, string> = {
  "Perco horas analisando dados manualmente": "análise manual",
  "Não consigo escalar sem perder ROAS": "escalar sem perder ROAS",
  "Tomo decisões no feeling, sem dados claros": "decisões no feeling",
  "Clientes cobrando e não sei o que mudar": "pressão de clientes sem clareza",
};

// ── Componente ─────────────────────────────────────────────────────────────────
export default function GestoresPage() {
  const [tela, setTela] = useState<"hero" | "quiz" | "captura" | "resultado">("hero");
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [form, setForm] = useState<Record<string, string>>({
    nome: "",
    whatsapp: "",
    campanhas: "",
    dor: "",
    tempo: "",
    investimento: "",
    ia: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErro("");
  }

  function selecionarEAvancar(campo: string, valor: string) {
    const novoForm = { ...form, [campo]: valor };
    setForm(novoForm);
    if (passo < PERGUNTAS.length - 1) {
      setTimeout(() => setPasso((p) => p + 1), 160);
    } else {
      setTimeout(() => setTela("captura"), 160);
    }
  }

  async function finalizar() {
    if (!form.nome.trim()) { setErro("Coloca seu nome pra continuar."); return; }
    if (!form.whatsapp.trim()) { setErro("Coloca seu WhatsApp pra continuar."); return; }
    setErro("");
    setEnviando(true);
    try {
      await fetch("/api/lead-gestor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch { /* silencioso */ }
    setEnviando(false);
    setTela("resultado");
  }

  const progresso = Math.round(((passo + 1) / PERGUNTAS.length) * 100);
  const primeiroNome = form.nome.trim().split(" ")[0];
  const dor = DORES[form.dor] ?? "otimização de campanhas";

  // ── Hero ──────────────────────────────────────────────────────────────────────
  if (tela === "hero") {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col">
        {/* Nav */}
        <div className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
          <span className="text-white font-black text-lg tracking-tight">erizon<span className="text-purple-400">.</span></span>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center pb-16">
          <div className="inline-flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 rounded-full px-4 py-1.5 mb-8">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-300 text-xs font-medium">IA para gestores de tráfego · Meta Ads</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight max-w-3xl mb-6">
            Pare de gastar horas<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              fazendo o que a IA<br />deveria fazer por você.
            </span>
          </h1>

          <p className="text-white/50 text-lg max-w-xl mb-10 leading-relaxed">
            A Erizon analisa suas campanhas no Meta Ads em tempo real, detecta riscos, toma decisões e executa — enquanto você foca no que importa.
          </p>

          {/* Prova social rápida */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {[
              { icon: Clock, label: "3h/dia economizadas em média" },
              { icon: TrendingUp, label: "ROAS monitorado 24/7" },
              { icon: Brain, label: "Decisões baseadas em dados reais" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-white/40 text-sm">
                <Icon className="w-4 h-4 text-purple-400" />
                {label}
              </div>
            ))}
          </div>

          <button
            onClick={() => setTela("quiz")}
            className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl px-8 py-5 text-lg transition-all shadow-2xl shadow-purple-900/40"
          >
            Ver como a Erizon resolve isso <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-white/20 text-xs mt-4">Diagnóstico gratuito · 2 minutos</p>
        </div>

        {/* Dores */}
        <div className="border-t border-white/[0.06] py-12 px-4">
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { emoji: "⏳", titulo: "Análise manual que consome seu dia", desc: "Horas olhando para dashboards sem saber exatamente o que mudar." },
              { emoji: "🎲", titulo: "Decisões no feeling", desc: "Pausar campanha ou deixar rodar? Sem dados claros, é sempre um chute." },
              { emoji: "📉", titulo: "ROAS caindo sem aviso", desc: "Você descobre que a campanha quebrou horas depois — já jogou dinheiro fora." },
              { emoji: "😤", titulo: "Cliente cobrando, você sem resposta", desc: "Resultado ruim e sem clareza de onde está o problema real." },
            ].map(({ emoji, titulo, desc }) => (
              <div key={titulo} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <span className="text-2xl mb-3 block">{emoji}</span>
                <p className="text-white/70 font-semibold text-sm mb-1">{titulo}</p>
                <p className="text-white/30 text-sm">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button
              onClick={() => setTela("quiz")}
              className="flex items-center gap-2 mx-auto text-purple-400 hover:text-purple-300 font-semibold transition-colors"
            >
              Fazer diagnóstico grátis <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────────
  if (tela === "quiz") {
    const perguntaAtual = PERGUNTAS[passo];
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col">
        <div className="pt-8 px-4 max-w-lg mx-auto w-full">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/30 text-xs">{passo + 1} de {PERGUNTAS.length}</span>
            <span className="text-purple-400 text-xs font-medium">{progresso}%</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center px-4 py-10">
          <div className="w-full max-w-lg">
            <div className="mb-8">
              <p className="text-purple-400/60 text-xs uppercase tracking-widest mb-2">{perguntaAtual.sub}</p>
              <h2 className="text-2xl font-black text-white">{perguntaAtual.titulo}</h2>
            </div>

            <div className="space-y-2">
              {perguntaAtual.opcoes.map(({ label, emoji }) => (
                <button
                  key={label}
                  onClick={() => selecionarEAvancar(perguntaAtual.campo, label)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${
                    form[perguntaAtual.campo] === label
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-white/80 text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>

            {passo > 0 && (
              <button
                onClick={() => setPasso((p) => p - 1)}
                className="mt-6 w-full text-white/25 text-sm hover:text-white/40 transition-colors"
              >
                ← Voltar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Captura ───────────────────────────────────────────────────────────────────
  if (tela === "captura") {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center mx-auto mb-5">
              <BarChart2 className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Quase lá.</h2>
            <p className="text-white/40 text-sm">
              Coloca seus dados para receber o diagnóstico e ver como a Erizon resolve exatamente o seu caso.
            </p>
          </div>

          <div className="space-y-3">
            <input
              autoFocus
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && finalizar()}
              placeholder="Seu nome"
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
            />
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 text-sm select-none">🇧🇷 +55</span>
              <input
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && finalizar()}
                placeholder="WhatsApp"
                inputMode="tel"
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-20 pr-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {erro && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />{erro}
            </p>
          )}

          <button
            onClick={finalizar}
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold rounded-2xl py-4 transition-all shadow-xl shadow-purple-900/30"
          >
            {enviando
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><span>Ver meu diagnóstico</span> <ArrowRight className="w-4 h-4" /></>
            }
          </button>

          <p className="text-white/20 text-xs text-center">
            Sem spam. Seus dados são usados apenas para personalizar o diagnóstico.
          </p>
        </div>
      </div>
    );
  }

  // ── Resultado ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-purple-400" />
        </div>

        <div className="space-y-3">
          <p className="text-white/40 text-sm uppercase tracking-widest">Diagnóstico pronto</p>
          <h2 className="text-3xl font-black text-white">{primeiroNome}, identificamos o problema.</h2>
          <p className="text-white/60 text-base leading-relaxed">
            Com base nas suas respostas, o principal gargalo é{" "}
            <span className="text-purple-400 font-semibold">{dor}</span>.
            A Erizon resolve isso com IA que age em tempo real nas suas campanhas.
          </p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 text-left space-y-3">
          {[
            "Monitoramento 24/7 das suas campanhas no Meta",
            "Alertas automáticos antes do ROAS cair",
            "Decisões executadas pela IA sem você precisar agir",
            "Relatórios claros para apresentar aos seus clientes",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              </div>
              <span className="text-white/60 text-sm">{item}</span>
            </div>
          ))}
        </div>

        <a
          href={`https://wa.me/5511999999999?text=${encodeURIComponent(`Olá! Fiz o diagnóstico da Erizon e quero saber mais.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl py-4 transition-all shadow-xl shadow-purple-900/30"
        >
          Quero conhecer a Erizon <ArrowRight className="w-4 h-4" />
        </a>

        <p className="text-white/20 text-xs">
          Nossa equipe vai entrar em contato via WhatsApp em breve.
        </p>
      </div>
    </div>
  );
}
