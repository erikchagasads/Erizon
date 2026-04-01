// middleware.ts — v8
// White label por domínio custom:
// Se o host bater com um domínio cadastrado em white_label_configs,
// injeta o tema via cookie wl_theme + redireciona clientes para /cliente.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { WL_COOKIE } from "@/lib/white-label";

const ROTAS_PUBLICAS = [
  "/share", "/", "/login", "/register", "/signup",
  "/billing", "/blog", "/sobre", "/privacidade", "/termos",
  "/api", "/_next", "/lp", "/admin", "/crm/cliente",
];

// Rotas que clientes white label podem ver
const ROTAS_CLIENTE = ["/cliente", "/login", "/signup", "/api"];

// Domínios próprios do Erizon — não tratados como white label
const ERIZON_HOSTS = [
  "erizonai.com.br",
  "www.erizonai.com.br",
  "onboarding.erizonai.com.br",
  "erizon.vercel.app",
  "localhost",
  "127.0.0.1",
];

function isErizonHost(host: string) {
  return ERIZON_HOSTS.some(h => host === h || host.startsWith(h + ":"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── White label por domínio custom ────────────────────────────────────────
  if (!isErizonHost(host)) {
    const { data: wlConfig } = await supabase
      .from("white_label_configs")
      .select("id, user_id, nome_plataforma, logo_url, favicon_url, cor_primaria, cor_secundaria, cor_fundo, cor_superficie")
      .eq("dominio_custom", host)
      .eq("ativo", true)
      .maybeSingle();

    if (wlConfig) {
      // Injeta tema no cookie
      response.cookies.set(WL_COOKIE, JSON.stringify(wlConfig), {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      });

      // Clientes externos só podem acessar /cliente e rotas públicas
      const isRotaCliente = ROTAS_CLIENTE.some(r => pathname === r || pathname.startsWith(r + "/"));
      const isRotaPublica = ROTAS_PUBLICAS.some(r => pathname === r || pathname.startsWith(r + "/"));

      // Se está tentando acessar rota interna do Erizon → redireciona para /cliente
      if (!isRotaCliente && !isRotaPublica) {
        const url = new URL("/cliente", request.url);
        const redirect = NextResponse.redirect(url);
        redirect.cookies.set(WL_COOKIE, JSON.stringify(wlConfig), {
          httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60,
        });
        return redirect;
      }
    } else {
      // Host desconhecido — limpa cookie
      response.cookies.delete(WL_COOKIE);
    }
  }

  // ── Rotas públicas ─────────────────────────────────────────────────────────
  if (ROTAS_PUBLICAS.some(r => pathname === r || pathname.startsWith(r + "/"))) {
    return response;
  }

  // ── Autenticação ───────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── Verificação de plano ativo (billing) ───────────────────────────────────
  // Rotas que passam mesmo sem plano ativo
  const ROTAS_SEM_BILLING = [
    "/billing", "/settings", "/onboarding", "/sucesso",
    "/api/billing", "/api/agente",
  ];
  const passaSemBilling = ROTAS_SEM_BILLING.some(
    r => pathname === r || pathname.startsWith(r + "/")
  );

  if (!passaSemBilling) {
    const { data: assinatura } = await supabase
      .from("subscriptions")
      .select("status, trial_end, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    const agora = new Date();
    const ativo = assinatura && (
      assinatura.status === "active" ||
      assinatura.status === "trialing" ||
      (assinatura.trial_end && new Date(assinatura.trial_end) > agora) ||
      (assinatura.current_period_end && new Date(assinatura.current_period_end) > agora)
    );

    if (!ativo) {
      const url = new URL("/billing", request.url);
      url.searchParams.set("reason", assinatura ? "expired" : "no_plan");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
