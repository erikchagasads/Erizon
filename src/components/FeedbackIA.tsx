"use client";

// src/components/FeedbackIA.tsx
// Componente de feedback reutilizável para todos os agentes da Erizon
// Uso: <FeedbackIA agente="copywriter" contexto={{ tipoCopy, resultado }} clienteId={id} />

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";

interface FeedbackIAProps {
  agente: "agente" | "analista" | "copywriter" | "roteirista" | "geral";
  contexto?: Record<string, unknown>;
  clienteId?: string;
  sessaoId?: string;
  className?: string;
}

const MOTIVOS_POR_AGENTE: Record<string, { positivo: string[]; negativo: string[] }> = {
  analista: {
    positivo: ["Análise precisa", "CPL melhorou", "Ação funcionou", "Diagnóstico correto"],
    negativo: ["Análise errada", "Ação não funcionou", "Dados incorretos", "Muito genérico"],
  },
  copywriter: {
    positivo: ["Copy aprovada", "Criativo converteu", "Cliente gostou", "Alta taxa de clique"],
    negativo: ["Copy rejeitada", "Não converteu", "Tom errado", "Muito genérico"],
  },
  roteirista: {
    positivo: ["Roteiro aprovado", "Vídeo performou", "Tom humanizado", "Gancho forte"],
    negativo: ["Roteiro rejeitado", "Tom robótico", "Gancho fraco", "Muito longo"],
  },
  agente: {
    positivo: ["Resposta útil", "Sugestão funcionou", "Análise correta", "Salvou tempo"],
    negativo: ["Resposta inútil", "Sugestão errada", "Muito genérico", "Não entendeu"],
  },
  geral: {
    positivo: ["Útil", "Correto", "Acionável", "Economizou tempo"],
    negativo: ["Inútil", "Incorreto", "Genérico demais", "Não aplicável"],
  },
};

export default function FeedbackIA({
  agente,
  contexto = {},
  clienteId,
  sessaoId,
  className = "",
}: FeedbackIAProps) {
  const [estado, setEstado] = useState<"idle" | "escolhendo_motivo" | "enviado">("idle");
  const [avaliacao, setAvaliacao] = useState<"positivo" | "negativo" | null>(null);
  const [, setMotivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const motivos = MOTIVOS_POR_AGENTE[agente] ?? MOTIVOS_POR_AGENTE.geral;

  async function enviar(av: "positivo" | "negativo", mot?: string) {
    setEnviando(true);
    try {
      await fetch("/api/agente/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agente,
          avaliacao: av,
          motivo: mot ?? null,
          contexto,
          cliente_id: clienteId ?? null,
          sessao_id: sessaoId ?? null,
        }),
      });
      setEstado("enviado");
    } catch {
      // silencioso — feedback não deve quebrar o fluxo
    } finally {
      setEnviando(false);
    }
  }

  function handleAvaliacao(av: "positivo" | "negativo") {
    setAvaliacao(av);
    setEstado("escolhendo_motivo");
  }

  function handleMotivo(mot: string) {
    setMotivo(mot);
    enviar(avaliacao!, mot);
  }

  function handlePularMotivo() {
    enviar(avaliacao!);
  }

  if (estado === "enviado") {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] text-white/25 ${className}`}>
        <Check size={11} className="text-emerald-400" />
        <span>Feedback registrado</span>
      </div>
    );
  }

  if (estado === "escolhendo_motivo") {
    const lista = avaliacao === "positivo" ? motivos.positivo : motivos.negativo;
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
          <span>O que aconteceu?</span>
          <button onClick={handlePularMotivo} className="text-white/20 hover:text-white/50 transition-all ml-auto">
            pular
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {lista.map(m => (
            <button
              key={m}
              onClick={() => handleMotivo(m)}
              disabled={enviando}
              className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all disabled:opacity-40 ${
                avaliacao === "positivo"
                  ? "border-emerald-500/20 text-emerald-400/70 hover:bg-emerald-500/10 hover:text-emerald-400"
                  : "border-red-500/20 text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[10px] text-white/20">Útil?</span>
      <button
        onClick={() => handleAvaliacao("positivo")}
        className="p-1.5 rounded-lg text-white/20 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
        title="Sim, foi útil"
      >
        <ThumbsUp size={12} />
      </button>
      <button
        onClick={() => handleAvaliacao("negativo")}
        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
        title="Não foi útil"
      >
        <ThumbsDown size={12} />
      </button>
    </div>
  );
}
