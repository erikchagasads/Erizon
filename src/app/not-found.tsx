"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#060609] text-white flex items-center justify-center p-6">
      {/* Glows */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-fuchsia-700/5 blur-[200px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-violet-900/5 blur-[160px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[440px] text-center">
        {/* 404 grande */}
        <p className="text-[120px] font-black italic uppercase tracking-tighter leading-none text-white/[0.04] select-none mb-2">
          404
        </p>

        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-fuchsia-400/60 mb-3 -mt-4">
          Página não encontrada
        </p>
        <h1 className="text-[28px] font-black italic uppercase tracking-tighter leading-tight mb-3">
          Rota fora<br /><span className="text-fuchsia-500">do mapa.</span>
        </h1>
        <p className="text-[13px] text-white/30 leading-relaxed mb-8 max-w-xs mx-auto">
          A página que você procura não existe ou foi movida. Volte para o painel e continue operando.
        </p>

        {/* Ações */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[13px] font-semibold text-white/50 hover:text-white hover:bg-white/[0.07] transition-all"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <Link
            href="/pulse"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 hover:from-fuchsia-500 hover:to-violet-600 text-[13px] font-semibold text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)]"
          >
            <Home size={14} /> Ir para o Pulse
          </Link>
        </div>
      </div>
    </div>
  );
}
