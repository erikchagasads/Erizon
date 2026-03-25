// src/app/api/clientes/vincular-campanhas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabaseUser() {
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

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await req.json();
    const { cliente_id, campanha_ids, auto } = body;
    if (!cliente_id) return NextResponse.json({ error: "cliente_id obrigatório." }, { status: 400 });

    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, meta_account_id")
      .eq("id", cliente_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    let ids: string[] = [];

    if (auto) {
      if (!cliente.meta_account_id)
        return NextResponse.json({ error: "Cliente não tem meta_account_id configurado." }, { status: 400 });
      const { data: ads } = await supabase
        .from("metricas_ads")
        .select("id")
        .eq("user_id", user.id)
        .eq("meta_account_id", cliente.meta_account_id)
        .or("cliente_id.is.null,cliente_id.eq.");
      ids = (ads ?? []).map(a => a.id);
    } else {
      ids = campanha_ids ?? [];
    }

    if (ids.length === 0)
      return NextResponse.json({ ok: true, vinculadas: 0 });

    // Atualiza em lotes de 50 para evitar timeout
    let vinculadas = 0;
    const BATCH = 50;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const { error } = await supabase
        .from("metricas_ads")
        .update({ cliente_id })
        .in("id", batch)
        .eq("user_id", user.id);
      if (!error) vinculadas += batch.length;
    }

    return NextResponse.json({ ok: true, vinculadas });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { campanha_ids } = await req.json();
    if (!campanha_ids?.length) return NextResponse.json({ error: "campanha_ids obrigatório." }, { status: 400 });

    const { error } = await supabase
      .from("metricas_ads")
      .update({ cliente_id: null })
      .in("id", campanha_ids)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
