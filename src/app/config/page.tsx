"use client";

// /app/configuracoes/page.tsx
// Redireciona para /settings — elimina duplicata de configurações

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConfiguracoesPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings"); }, [router]);
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}