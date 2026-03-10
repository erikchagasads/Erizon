// middleware.ts — v5
// Corrigido: cookies getAll/setAll para evitar logout aleatório
//
// Checagens ativas:
//   1. Rota pública → passa
//   2. Não autenticado → /login
//   3. Onboarding incompleto → /onboarding

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTAS_PUBLICAS = [
  "/share",
  "/",
  "/login",
  "/register",
  "/signup",
  "/onboarding",
  "/billing",
  "/blog",
  "/privacidade",
  "/termos",
  "/api",
  "/_next",
  "/lp",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rota pública — passa direto
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
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};