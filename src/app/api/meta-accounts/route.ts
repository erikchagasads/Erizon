// src/app/api/meta-accounts/route.ts
// Busca todas as Ad Accounts acessíveis pelo token Meta do usuário

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const META_API = "https://graph.facebook.com/v19.0";

const ACCOUNT_STATUS: Record<number, string> = {
  1: "Ativa",
  2: "Desativada",
  3: "Não confirmada",
  7: "Pendente",
  8: "Encerrada",
  9: "Em aprovação",
  100: "Pendente revisão",
  101: "Em revisão",
  201: "Sem pagamento",
  202: "Limite atingido",
};

// Limpa o token: remove espaços, quebras de linha e duplicações
// Token Meta sempre começa com "EAA" — extrai apenas o primeiro token válido
function limparToken(raw: string): string {
  const sem_espacos = raw.trim().replace(/\s+/g, "");
  // Se o token foi salvo duplicado (ex: "EAA...EAA..."), pega só o primeiro
  const match = sem_espacos.match(/EAA[A-Za-z0-9]+/);
  return match ? match[0] : sem_espacos;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // Busca o token Meta salvo nas configurações do usuário
    const { data: config } = await supabase
      .from("user_configs")
      .select("meta_access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    const rawToken = config?.meta_access_token;
    if (!rawToken) {
      return NextResponse.json(
        { error: "Token Meta não configurado. Vá em Configurações e adicione seu Access Token." },
        { status: 400 }
      );
    }

    const token = limparToken(String(rawToken));

    // Valida formato mínimo do token
    if (!token.startsWith("EAA") || token.length < 50) {
      return NextResponse.json(
        { error: "Token Meta inválido. Copie o token completo em Configurações → Meta Ads." },
        { status: 400 }
      );
    }

    // Busca todas as contas acessíveis pelo token
    const url = new URL(`${META_API}/me/adaccounts`);
    url.searchParams.set("fields", "id,name,account_status,currency,business{name}");
    url.searchParams.set("limit", "100");
    url.searchParams.set("access_token", token);

    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = await res.json();

    if (json.error) {
      console.error("Meta API error:", json.error);
      if (json.error.code === 190) {
        return NextResponse.json(
          { error: "Token Meta expirado ou inválido. Gere um novo token em Configurações." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `Erro Meta API: ${json.error.message}` },
        { status: 400 }
      );
    }

    // Garante array mesmo se a Meta retornar formato inesperado
    const raw = Array.isArray(json.data) ? json.data : [];

    const accounts = raw.map((acc: {
      id: string;
      name: string;
      account_status: number;
      currency: string;
      business?: { name: string };
    }) => ({
      id:            acc.id,
      name:          acc.name,
      status:        acc.account_status,
      status_label:  ACCOUNT_STATUS[acc.account_status] ?? "Desconhecido",
      ativo:         acc.account_status === 1,
      currency:      acc.currency ?? "BRL",
      business_name: acc.business?.name ?? null,
    }));

    // Ordena: ativas primeiro, depois por nome
    accounts.sort((a: { ativo: boolean; name: string }, b: { ativo: boolean; name: string }) => {
      if (a.ativo && !b.ativo) return -1;
      if (!a.ativo && b.ativo) return 1;
      return a.name.localeCompare(b.name, "pt-BR");
    });

    return NextResponse.json({ accounts, total: accounts.length });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("GET /api/meta-accounts:", msg);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}