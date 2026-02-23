// lib/supabase.ts
// ATENÇÃO: Use createBrowserClient() nos componentes client-side
// e createServerClient() nas rotas de API / Server Components.
// Este arquivo existe apenas para compatibilidade com código legado.
// Não use em novos arquivos.

import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);