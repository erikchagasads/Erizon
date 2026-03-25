/**
 * src/lib/auth-guard.ts
 *
 * Helper de autenticação para rotas de API.
 * Extrai e valida o usuário Supabase a partir dos cookies da requisição.
 * Retorna o user ou um NextResponse de erro 401 pronto para retornar.
 *
 * Uso:
 *   const auth = await requireAuth(request);
 *   if (!auth.user) return auth.response;
 *   // auth.user está disponível e autenticado
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

export type AuthResult =
  | { user: User; response: null }
  | { user: null; response: NextResponse };

/**
 * Valida autenticação via cookie de sessão Supabase.
 * Usar em Server-side API routes (não em Client Components).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requireAuth(_request?: NextRequest): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        response: NextResponse.json(
          { error: "Não autenticado. Faça login para continuar." },
          { status: 401 }
        ),
      };
    }

    return { user, response: null };
  } catch {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Erro ao validar autenticação." },
        { status: 401 }
      ),
    };
  }
}

/**
 * Verifica se a requisição vem de um cron job autorizado pelo Vercel
 * ou de um header interno de automação.
 * Usar nas rotas de cron (/api/check-alerts, /api/snapshot-diario).
 */
export function requireCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // Vercel injeta este header em cron jobs
  const vercelCron = request.headers.get("x-vercel-cron");
  if (vercelCron === "1" || vercelCron === "true") return true;

  return false;
}
