"use client";

// src/components/CookieBanner.tsx
// Banner de consentimento de cookies — LGPD
// Adicione no layout.tsx: <CookieBanner />

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Cookie } from "lucide-react";

export default function CookieBanner() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    // Só mostra se ainda não aceitou
    const aceito = localStorage.getItem("erizon_cookies_aceito");
    if (!aceito) {
      // Pequeno delay para não aparecer imediatamente
      const t = setTimeout(() => setVisivel(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  function aceitar() {
    localStorage.setItem("erizon_cookies_aceito", "true");
    setVisivel(false);
  }

  function recusar() {
    localStorage.setItem("erizon_cookies_aceito", "false");
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#0e0e11] border border-white/[0.08] rounded-[20px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-start gap-4">

          {/* Ícone */}
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Cookie size={16} className="text-purple-400" />
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white mb-1">
              Seus dados, sua escolha.
            </p>
            <p className="text-[12px] text-white/40 leading-relaxed">
              Usamos cookies essenciais para o funcionamento da plataforma e cookies analíticos para melhorar sua experiência. Nenhum dado é vendido a terceiros.{" "}
              <Link href="/privacidade" className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors">
                Política de Privacidade
              </Link>
            </p>
          </div>

          {/* Fechar */}
          <button
            onClick={recusar}
            className="p-1.5 text-white/20 hover:text-white/50 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-3 mt-4 pl-[52px]">
          <button
            onClick={aceitar}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[12px] font-bold transition-all shadow-[0_0_20px_rgba(147,51,234,0.25)]"
          >
            Aceitar todos
          </button>
          <button
            onClick={recusar}
            className="px-5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-white/50 hover:text-white text-[12px] font-semibold transition-all"
          >
            Somente essenciais
          </button>
          <Link
            href="/privacidade"
            className="text-[12px] text-white/25 hover:text-white/50 transition-colors ml-auto hidden sm:block"
          >
            Saiba mais
          </Link>
        </div>
      </div>
    </div>
  );
}
