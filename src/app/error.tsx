"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção, logar aqui para Sentry, Datadog etc.
    console.error("[Erizon Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#060609] text-white flex items-center justify-center p-6">
      {/* Glow */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-red-700/5 blur-[180px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[440px] text-center">
        {/* Ícone */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={26} className="text-red-400" />
        </div>

        {/* Título */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-red-400/60 mb-3">
          Erro inesperado
        </p>
        <h1 className="text-[28px] font-black italic uppercase tracking-tighter leading-tight mb-3">
          Algo deu<br /><span className="text-red-400">errado.</span>
        </h1>
        <p className="text-[13px] text-white/30 leading-relaxed mb-8 max-w-xs mx-auto">
          Ocorreu um erro inesperado. Nossa equipe foi notificada.
          {error.digest && (
            <span className="block mt-2 font-mono text-[11px] text-white/15">
              ref: {error.digest}
            </span>
          )}
        </p>

        {/* Ações */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] font-semibold text-white/50 hover:text-white hover:bg-white/[0.07] transition-all"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[13px] font-semibold text-red-400 hover:bg-red-500/15 transition-all"
          >
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}
