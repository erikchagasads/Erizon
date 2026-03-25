"use client";

/**
 * useSessionGuard
 * Escuta mudanças de auth e redireciona para /login se a sessão expirar.
 * Uso: chame este hook uma vez no layout raiz ou em qualquer página autenticada.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { AuthChangeEvent } from "@supabase/supabase-js";

export function useSessionGuard() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        // TOKEN_REFRESHED é ok; SIGNED_OUT significa sessão encerrada/expirada
        if (event === "SIGNED_OUT") {
          router.push("/login");
        }
      }
      if (event === "USER_UPDATED") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);
}
