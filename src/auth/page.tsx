"use client";

// app/auth/page.tsx
// ATENÇÃO: Este arquivo é legado. Para novos usuários, use /signup e /login.
// Mantido apenas por compatibilidade com links antigos.
// Redireciona para /login automaticamente.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center">
      <Loader2 size={24} className="text-purple-500 animate-spin" />
    </div>
  );
}