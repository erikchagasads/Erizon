// src/app/api/meta-actions/route.ts
// Pausa, retoma ou atualiza budget de campanhas via Meta Graph API.
// SEMPRE usa o token do usuário autenticado (user_settings), nunca env global.

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { campaignId, action, value } = await req.json();

    if (!campaignId || !action) {
      return NextResponse.json({ error: "campaignId e action são obrigatórios." }, { status: 400 });
    }

    // ── Busca token do usuário autenticado ────────────────────────────────────
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n) => cookieStore.get(n)?.value } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // Busca conta ativa do usuário
    const { data: conta, error: contaError } = await supabase
      .from("user_settings")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .single();

    if (contaError || !conta?.access_token) {
      return NextResponse.json(
        { error: "Nenhuma conta Meta ativa encontrada. Configure em Configurações." },
        { status: 400 }
      );
    }

    const ACCESS_TOKEN = conta.access_token;

    // ── Monta body da ação ────────────────────────────────────────────────────
    let body: Record<string, unknown> = {};

    if (action === "PAUSE") {
      body = { status: "PAUSED" };
    } else if (action === "RESUME") {
      body = { status: "ACTIVE" };
    } else if (action === "UPDATE_BUDGET") {
      if (!value || isNaN(Number(value))) {
        return NextResponse.json({ error: "Valor de budget inválido." }, { status: 400 });
      }
      body = { daily_budget: Math.round(Number(value) * 100) }; // Meta usa centavos
    } else {
      return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
    }

    // ── Chama Meta Graph API ──────────────────────────────────────────────────
    const url = `https://graph.facebook.com/v18.0/${campaignId}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, access_token: ACCESS_TOKEN }),
    });

    const result = await response.json();

    if (result.error) {
      console.error("[meta-actions] Meta API error:", result.error);
      return NextResponse.json(
        { error: result.error.message ?? "Erro na Meta API." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, result });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("[meta-actions]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}