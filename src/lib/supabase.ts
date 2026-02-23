// lib/supabase.ts
// Singleton do cliente Supabase para uso em componentes client-side.
// NUNCA instancie createBrowserClient() diretamente nos componentes —
// importe este singleton para evitar múltiplas conexões.

import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

// Alias para compatibilidade com código legado
export const supabase = getSupabase();