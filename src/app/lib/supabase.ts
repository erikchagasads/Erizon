/**
 * DEPRECATED: src/app/lib/supabase.ts
 *
 * Este arquivo existe apenas para não quebrar imports legados.
 * Use `@/lib/supabase` (getSupabase / supabase) em todos os novos arquivos.
 *
 * A instância aqui usa `getSupabase()` — o singleton canônico —
 * em vez de criar um novo createBrowserClient() a cada import.
 */
export { getSupabase, supabase } from "@/lib/supabase";
