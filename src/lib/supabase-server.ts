
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getRequiredServerEnv, missingRequiredEnv } from "@/config/env";

/**
 * Singleton do cliente Supabase server-side (service role).
 * Reutilizado entre chamadas no mesmo processo Node.js para evitar
 * acumulação de conexões em rotas de alta frequência e Edge Functions.
 *
 * NUNCA exponha este cliente no browser — ele usa a service role key
 * que bypassa RLS. Use apenas em Server Components e API routes.
 */
let _serverClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  // Em Edge Runtime cada request é isolado, então o singleton é seguro.
  // Em Node.js, reutilizamos o mesmo cliente entre chamadas do mesmo processo.
  if (_serverClient) return _serverClient;

  const missing = missingRequiredEnv([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);

  if (missing.length > 0) {
    throw new Error(`Supabase env ausente: ${missing.join(", ")}`);
  }

  const env = getRequiredServerEnv();
  _serverClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _serverClient;
}

/**
 * Força recriação do singleton (útil em testes ou após rotação de credenciais).
 */
export function resetSupabaseServerClient(): void {
  _serverClient = null;
}
