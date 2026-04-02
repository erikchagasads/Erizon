"use client";

import { useState } from "react";
import { ArrowRight, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";

// ── Perguntas ──────────────────────────────────────────────────────────────────
const PASSOS = [
  {
    campo: "desafio",
    titulo: "Qual é o maior desafio hoje?",
    sub: "Contexto atual",
    opcoes: [
      { label: "Gerar mais leads", emoji: "📈" },
      { label: "Melhorar qualidade dos leads", emoji: "🎯" },
      { label: "Aumentar taxa de conversão", emoji: "⚡" },
      { label: "Construir autoridade e posicionamento", emoji: "🧲" },
    ],
  },
  {
    campo: "captacao",
    titulo: "Como vocês captam clientes hoje?",
    sub: "Canal principal",
    opcoes: [
      { label: "Indicações", emoji: "🤝" },
      { label: "Redes sociais (orgânico)", emoji: "📲" },
      { label: "Tráfego pago (ads)", emoji: "🚀" },
      { label: "Misto de canais", emoji: "🔀" },
    ],
  },
  {
    campo: "maturidade",
    titulo: "Há quanto tempo investem em marketing digital?",
    sub: "Maturidade",
    opcoes: [
      { label: "Estamos começando agora", emoji: "🌱" },
      { label: "Menos de 1 ano", emoji: "📅" },
      { label: "1 a 3 anos", emoji: "📊" },
      { label: "Mais de 3 anos", emoji: "🏆" },
    ],
  },
  {
    campo: "ticket",
    titulo: "Qual o ticket médio do produto ou serviço?",
    sub: "Valor por cliente",
    opcoes: [
      { label: "Até R$500", emoji: "💵" },
      { label: "R$500 – R$2.000", emoji: "💰" },
      { label: "R$2.000 – R$10.000", emoji: "🚀" },
      { label: "Acima de R$10.000", emoji: "👑" },
    ],
  },
  {
    campo: "investimento",
    titulo: "Quanto pretendem investir em tráfego pago?",
    sub: "Orçamento mensal",
    opcoes: [
      { label: "Até R$1.000/mês", emoji: "💵" },
      { label: "R$1.000 – R$3.000/mês", emoji: "💰" },
      { label: "R$3.000 – R$10.000/mês", emoji: "🚀" },
      { label: "Acima de R$10.000/mês", emoji: "⚡" },
    ],
  },
  {
    campo: "presenca",
    titulo: "Qual é a presença digital atual?",
    sub: "Estrutura online",
    opcoes: [
      { label: "Só Instagram", emoji: "📸" },
      { label: "Instagram + Site", emoji: "✅" },
      { label: "Só site", emoji: "🌐" },
      { label: "Nenhum ainda", emoji: "⚠️" },
    ],
  },
];

// ── Componente principal ───────────────────────────────────────────────────────
export default function DiagnosticoPage() {
  const [tela, setTela] = useState<"lead" | "form" | "extra" | "resultado">("lead");
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [form, setForm] = useState<Record<string, string>>({
    nome: "",
    empresa: "",
    instagram: "",
    nicho: "",
    desafio: "",
    captacao: "",
    maturidade: "",
    ticket: "",
    investimento: "",
    presenca: "",
    observacoes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErro("");
  }

  function avancarLead() {
    if (!form.nome.trim()) { setErro("Coloca seu nome pra continuar."); return; }
    if (!form.instagram.trim()) { setErro("Coloca o @ do Instagram pra continuar."); return; }
    if (!form.nicho.trim()) { setErro("Nos conta o nicho do negócio."); return; }
    setErro("");
    setTela("form");
    setPasso(0);
  }

  async function finalizarDiagnostico(novoForm: Record<string, string>) {
    setEnviando(true);
    try {
      await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoForm),
      });
    } catch {
      // falha silenciosa — o lead já viu a tela de resultado
    } finally {
      setEnviando(false);
      setTela("resultado");
    }
  }

  function selecionarEAvancar(campo: string, valor: string) {
    const novoForm = { ...form, [campo]: valor };
    setForm(novoForm);
    if (passo < PASSOS.length - 1) {
      setTimeout(() => setPasso((p) => p + 1), 160);
    } else {
      setTimeout(() => setTela("extra"), 160);
    }
  }

  const progresso = Math.round(((passo + 1) / PASSOS.length) * 100);

  // ── Lead ─────────────────────────────────────────────────────────────────────
  if (tela === "lead") {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-purple-300 text-xs font-medium">Diagnóstico estratégico · 2 minutos</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2 leading-tight">
              Antes da reunião,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                precisamos entender seu negócio.
              </span>
            </h1>
            <p className="text-white/40 text-sm mt-3">
              Responda 6 perguntas rápidas para que possamos apresentar um diagnóstico estratégico personalizado.
            </p>
          </div>

          <div className="space-y-3">
            <input
              autoFocus
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && avancarLead()}
              placeholder="Seu nome"
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
            />
            <input
              value={form.empresa}
              onChange={(e) => set("empresa", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && avancarLead()}
              placeholder="Nome da empresa (opcional)"
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
            />
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 text-base select-none">@</span>
              <input
                value={form.instagram}
                onChange={(e) => set("instagram", e.target.value.replace(/^@/, ""))}
                onKeyDown={(e) => e.key === "Enter" && avancarLead()}
                placeholder="Instagram"
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-9 pr-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <input
              value={form.nicho}
              onChange={(e) => set("nicho", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && avancarLead()}
              placeholder="Qual é o nicho? (ex: imóveis, clínica, e-commerce)"
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {erro && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />{erro}
            </p>
          )}

          <button
            onClick={avancarLead}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl py-4 transition-all shadow-xl shadow-purple-900/30"
          >
            Continuar <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Resultado ────────────────────────────────────────────────────────────────
  if (tela === "resultado") {
    const primeiroNome = form.nome.trim().split(" ")[0];
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-sm w-full space-y-8">

          <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-purple-400" />
          </div>

          <div className="space-y-4">
            <p className="text-white/40 text-sm uppercase tracking-widest">Respostas recebidas</p>
            <h2 className="text-3xl font-black text-white leading-tight">
              {primeiroNome},
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Com base nas suas respostas, iremos apresentar um{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-bold">
                diagnóstico estratégico personalizado
              </span>{" "}
              na reunião.
            </p>
          </div>

          <div className="h-px bg-white/[0.06]" />

          <p className="text-white/25 text-xs leading-relaxed">
            Esse diagnóstico faz parte da metodologia utilizada para estruturar operações previsíveis de aquisição de clientes.
          </p>

        </div>
      </div>
    );
  }

  // ── Extra ─────────────────────────────────────────────────────────────────────
  if (tela === "extra") {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6">
          <div>
            <p className="text-purple-400/60 text-xs uppercase tracking-widest mb-2">Opcional</p>
            <h2 className="text-2xl font-black text-white">Tem algo mais que queira nos contar?</h2>
            <p className="text-white/30 text-sm mt-2">Contexto extra, dúvidas, expectativas — o que achar relevante.</p>
          </div>
          <textarea
            autoFocus
            value={form.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            placeholder="Escreva aqui..."
            rows={5}
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-base focus:outline-none focus:border-purple-500 transition-colors resize-none"
          />
          <button
            onClick={() => finalizarDiagnostico(form)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl py-4 transition-all shadow-xl shadow-purple-900/30"
          >
            Enviar diagnóstico <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setPasso(PASSOS.length - 1); setTela("form"); }}
            className="w-full text-white/25 text-sm hover:text-white/40 transition-colors"
          >
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  // ── Loading (enviando) ────────────────────────────────────────────────────────
  if (enviando) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────────
  const passoAtual = PASSOS[passo];

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

      <div className="flex-1 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <p className="text-purple-400/60 text-xs uppercase tracking-widest mb-2">{passoAtual.sub}</p>
            <h2 className="text-2xl font-black text-white">{passoAtual.titulo}</h2>
          </div>

          <div className="space-y-2">
            {passoAtual.opcoes.map(({ label, emoji }) => (
              <button
                key={label}
                onClick={() => selecionarEAvancar(passoAtual.campo, label)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${
                  form[passoAtual.campo] === label
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
