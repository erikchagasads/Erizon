// src/app/api/agente/memoria-cliente/route.ts
// GET   — retorna perfil de memória de um cliente
// PATCH — atualiza campos do perfil (nicho, CPL histórico, etc.)

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) { values.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ── GET — busca perfil do cliente ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabase();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const cliente_id = searchParams.get("cliente_id");
    if (!cliente_id) return NextResponse.json({ error: "cliente_id obrigatório." }, { status: 400 });

    const { data: mem } = await supabase
      .from("agente_memoria_cliente")
      .select("*")
      .eq("user_id", user.id)
      .eq("cliente_id", cliente_id)
      .maybeSingle();

    return NextResponse.json({ memoria: mem ?? null });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── PATCH — atualiza perfil do cliente ────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabase();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await req.json();
    const { cliente_id, ...updates } = body;

    if (!cliente_id) return NextResponse.json({ error: "cliente_id obrigatório." }, { status: 400 });

    const camposPermitidos = [
      "nicho", "descricao", "publico_alvo",
      "cpl_historico", "cpl_alvo", "roas_historico", "roas_alvo",
      "ticket_medio", "budget_mensal",
      "formatos_que_convertem", "angulos_que_funcionam", "padroes_observados",
    ];

    const payload: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
    for (const campo of camposPermitidos) {
      if (campo in updates) payload[campo] = updates[campo];
    }

    if (Object.keys(payload).length === 1) {
      return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 });
    }

    // Upsert — cria se não existir
    const { data: existe } = await supabase
      .from("agente_memoria_cliente")
      .select("id")
      .eq("user_id", user.id)
      .eq("cliente_id", cliente_id)
      .maybeSingle();

    if (existe) {
      await supabase.from("agente_memoria_cliente")
        .update(payload)
        .eq("user_id", user.id)
        .eq("cliente_id", cliente_id);
    } else {
      await supabase.from("agente_memoria_cliente")
        .insert({ user_id: user.id, cliente_id, ...payload });
    }

    return NextResponse.json({ ok: true });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
