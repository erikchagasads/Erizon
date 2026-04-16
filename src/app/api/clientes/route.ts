// src/app/api/clientes/route.ts
// GET    — lista clientes com métricas
// POST   — cria novo cliente
// PATCH  — atualiza meta_account_id (ou outros campos) de um cliente
// DELETE — soft delete (ativo = false)

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

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: clientes, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("id", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const clientesComMetricas = await Promise.all(
      (clientes ?? []).map(async (c) => {
        const { data: ads } = await supabase
          .from("metricas_ads")
          .select("gasto_total, contatos, status, alcance, impressoes")
          .eq("cliente_id", c.id);

        const total_campanhas  = ads?.length ?? 0;
        const campanhas_ativas = ads?.filter(x => ["ATIVO","ACTIVE","ATIVA"].includes(x.status)).length ?? 0;
        const gasto_total      = ads?.reduce((s, x) => s + (x.gasto_total ?? 0), 0) ?? 0;
        const total_leads      = ads?.reduce((s, x) => s + (x.contatos ?? 0), 0) ?? 0;
        const cpl_medio        = total_leads > 0 ? gasto_total / total_leads : 0;

        const total_alcance    = ads?.filter(x => ["ATIVO","ACTIVE","ATIVA"].includes(x.status)).reduce((s, x) => s + (x.alcance ?? 0), 0) ?? 0;
        const total_impressoes  = ads?.filter(x => ["ATIVO","ACTIVE","ATIVA"].includes(x.status)).reduce((s, x) => s + (x.impressoes ?? 0), 0) ?? 0;

        const campanhas_criticas = ads?.filter(x => {
          if (!["ATIVO","ACTIVE","ATIVA"].includes(x.status)) return false;
          if (x.gasto_total > 50 && (!x.contatos || x.contatos === 0)) return true;
          if (x.contatos > 0 && (x.gasto_total / x.contatos) > 60) return true;
          return false;
        }).length ?? 0;

        return {
          id:                  c.id,
          nome:                c.nome,
          nome_cliente:        c.nome_cliente ?? c.nome,
          cor:                 c.cor ?? "#6366f1",
          logo_url:            c.logo_url,
          meta_account_id:     c.meta_account_id,
          ig_user_id:          c.ig_user_id ?? null,
          campanha_keywords:    c.campanha_keywords ?? null,
          whatsapp:           c.whatsapp ?? null,
          whatsapp_mensagem:  c.whatsapp_mensagem ?? null,
          facebook_pixel_id:  c.facebook_pixel_id ?? null,
          ticket_medio:        c.ticket_medio,
          ativo:               c.ativo ?? true,
          ultima_atualizacao:  c.ultima_atualizacao,
          total_campanhas,
          campanhas_ativas,
          campanhas_criticas,
          gasto_total,
          total_leads,
          cpl_medio: Math.round(cpl_medio * 100) / 100,
          total_alcance,
          total_impressoes,
        };
      })
    );

    return NextResponse.json({ clientes: clientesComMetricas });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("GET /api/clientes:", msg);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await req.json();
    const { nome, meta_account_id, ticket_medio, cor, ig_user_id, campanha_keywords, whatsapp, whatsapp_mensagem, facebook_pixel_id } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert({
        user_id:         user.id,
        nome:            nome.trim(),
        meta_account_id: meta_account_id || null,
        ig_user_id:      ig_user_id      || null,
        campanha_keywords:   campanha_keywords    || null,
        ticket_medio:        ticket_medio         || null,
        whatsapp:            whatsapp             || null,
        whatsapp_mensagem:   whatsapp_mensagem    || null,
        facebook_pixel_id:   facebook_pixel_id    || null,
        cor:             cor             ?? "#6366f1",
        ativo:           true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ cliente: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("POST /api/clientes:", msg);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const clienteId = req.nextUrl.searchParams.get("id");
    if (!clienteId) {
      return NextResponse.json({ error: "ID do cliente é obrigatório." }, { status: 400 });
    }

    const body = await req.json();

    // Campos permitidos para atualização via PATCH
    const camposPermitidos = ["meta_account_id", "ticket_medio", "cor", "nome", "nome_cliente", "ig_user_id", "campanha_keywords", "whatsapp", "whatsapp_mensagem", "facebook_pixel_id"];
    const updates: Record<string, unknown> = {};
    for (const campo of camposPermitidos) {
      if (campo in body) updates[campo] = body[campo];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 });
    }

    // Verifica que o cliente pertence ao usuário
    const { data: existe } = await supabase
      .from("clientes")
      .select("id")
      .eq("id", clienteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existe) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("clientes")
      .update(updates)
      .eq("id", clienteId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ cliente: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("PATCH /api/clientes:", msg);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const clienteId = req.nextUrl.searchParams.get("id");
    if (!clienteId) {
      return NextResponse.json({ error: "ID do cliente é obrigatório." }, { status: 400 });
    }

    const { data: cliente, error: checkError } = await supabase
      .from("clientes")
      .select("id")
      .eq("id", clienteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError || !cliente) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const { error } = await supabase
      .from("clientes")
      .update({ ativo: false })
      .eq("id", clienteId)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: clienteId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("DELETE /api/clientes:", msg);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
