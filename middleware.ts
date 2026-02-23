// middleware.ts — v3
// Checagens em cascata:
//   1. Rota pública → passa
//   2. Não autenticado → /login
//   3. Onboarding incompleto → /onboarding
//   4. Assinatura inativa (após trial) → /billing (nova rota de paywall)
//
// ROTAS DE PAYWALL que passam sem assinatura:
//   /billing, /settings (para poder gerenciar plano)

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas que nunca exigem checagem
const ROTAS_PUBLICAS = [
  "/",          // landing page
  "/login",
  "/register",
  "/signup",
  "/onboarding",
  "/billing",
  "/api",
  "/_next",
];

// Rotas autenticadas mas sem exigir assinatura ativa
// (para que o usuário possa ver settings e gerenciar plano)
const ROTAS_SEM_BILLING = ["/settings", "/billing"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rota pública — não faz nada
  if (ROTAS_PUBLICAS.some(r => pathname === r || pathname.startsWith(r + "/"))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value; },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // 2. Autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 3. Onboarding
  const { data: config } = await supabase
    .from("user_configs")
    .select("onboarding_completo")
    .eq("user_id", user.id)
    .maybeSingle();

  const onboardingCompleto = config?.onboarding_completo === true;
  if (!onboardingCompleto && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // 4. Billing — pula para rotas que não precisam
  if (ROTAS_SEM_BILLING.some(r => pathname.startsWith(r))) {
    return response;
  }

  // Checa assinatura ativa
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, trial_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const statusAtivo = ["active", "trialing"].includes(sub?.status ?? "");

  // Sem assinatura OU expirada → paywall
  if (!statusAtivo) {
    const url = new URL("/billing", request.url);
    url.searchParams.set("reason", sub ? "expired" : "no_plan");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};