'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log silencioso do erro para serviços como Sentry (sem vazar para a UI)
    console.error('Erro interno Erizon:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0D17] text-white p-4 font-sans">
      <div className="max-w-md w-full bg-[#15182B] border border-red-500/20 rounded-2xl p-8 text-center shadow-2xl shadow-red-500/10">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-white">Ops! Tivemos um contratempo</h2>
        <p className="text-gray-400 mb-8 text-sm">
          Nossos sistemas detectaram uma instabilidade temporária. Nossa equipe de engenharia já foi notificada e estamos estabilizando as conexões.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Tentar novamente
          </button>
          <Link href="/cliente" className="w-full py-3 px-4 bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-lg font-medium transition-colors">
            Voltar para o Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}