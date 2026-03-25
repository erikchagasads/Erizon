// src/app/api/agente/memoria/route.ts
// GET  — retorna memória + alertas não lidos do usuário
// POST — salva/atualiza memória após conversa
// PATCH — marca alertas como lidos

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

// ─── GET — carrega memória + alertas pendentes ────────────────────────────────
export async function GET() {
  try {
    const { supabase, user } = await getSupabase();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    // Memória
    const { data: memoria } = await supabase
      .from("agente_memoria")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Alertas não lidos (últimas 48h, máx 20)
    const { data: alertas } = await supabase
      .from("agente_alertas")
      .select("*")
      .eq("user_id", user.id)
      .eq("lido", false)
      .gte("created_at", new Date(Date.now() - 48 * 3600 * 1000).toISOString())
      .order("urgencia", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);

    // Contagem total não lidos
    const { count: totalNaoLidos } = await supabase
      .from("agente_alertas")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("lido", false);

    return NextResponse.json({
      memoria: memoria ?? null,
      alertas: alertas ?? [],
      totalNaoLidos: totalNaoLidos ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// ─── POST — salva memória após conversa ──────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabase();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await req.json();
    const {
      resumo_contexto,
      perfil_usuario,
      decisoes,
      metas,
      historico_analises,
      preferencias,
      nova_decisao,
      nova_analise,
    } = body;

    // Busca memória atual
    const { data: atual } = await supabase
      .from("agente_memoria")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Monta payload de update
    const payload: Record<string, unknown> = { user_id: user.id };

    if (resumo_contexto !== undefined) payload.resumo_contexto = resumo_contexto;
    if (perfil_usuario  !== undefined) payload.perfil_usuario  = perfil_usuario;
    if (metas           !== undefined) payload.metas           = metas;
    if (preferencias    !== undefined) payload.preferencias    = preferencias;

    // Append decisão nova ao histórico
    if (nova_decisao) {
      const lista = (atual?.decisoes ?? []) as unknown[];
      lista.unshift({ ...nova_decisao, data: new Date().toISOString() });
      payload.decisoes = lista.slice(0, 100); // máx 100 decisões
    } else if (decisoes !== undefined) {
      payload.decisoes = decisoes;
    }

    // Append análise nova ao histórico
    if (nova_analise) {
      const lista = (atual?.historico_analises ?? []) as unknown[];
      lista.unshift({ ...nova_analise, data: new Date().toISOString() });
      payload.historico_analises = lista.slice(0, 30); // máx 30 análises
    } else if (historico_analises !== undefined) {
      payload.historico_analises = historico_analises;
    }

    // Upsert
    const { data, error } = await supabase
      .from("agente_memoria")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, memoria: data });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// ─── PATCH — marca alertas como lidos ────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabase();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await req.json();
    const { ids, marcar_todos } = body as { ids?: string[]; marcar_todos?: boolean };

    if (marcar_todos) {
      await supabase
        .from("agente_alertas")
        .update({ lido: true })
        .eq("user_id", user.id)
        .eq("lido", false);
    } else if (ids?.length) {
      await supabase
        .from("agente_alertas")
        .update({ lido: true })
        .eq("user_id", user.id)
        .in("id", ids);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}