// src/app/api/clientes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabaseUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: clientes, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false }); // FIX: era created_at, coluna inexistente

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const clientesComMetricas = await Promise.all(
      (clientes ?? []).map(async (c) => {
        const { data: campanhas } = await supabase
          .from("campanhas")
          .select("gasto_total, total_leads, ativo")
          .eq("cliente_id", c.id);

        const total_campanhas  = campanhas?.length ?? 0;
        const campanhas_ativas = campanhas?.filter(x => x.ativo).length ?? 0;
        const gasto_total      = campanhas?.reduce((s, x) => s + (x.gasto_total ?? 0), 0) ?? 0;
        const total_leads      = campanhas?.reduce((s, x) => s + (x.total_leads ?? 0), 0) ?? 0;
        const cpl_medio        = total_leads > 0 ? gasto_total / total_leads : 0;

        return {
          id:                 c.id,
          nome:               c.nome,
          cor:                c.cor ?? "#6366f1",
          logo_url:           c.logo_url,
          meta_account_id:    c.meta_account_id,
          ticket_medio:       c.ticket_medio,
          ativo:              c.ativo ?? true,
          ultima_atualizacao: c.ultima_atualizacao,
          total_campanhas,
          campanhas_ativas,
          gasto_total,
          total_leads,
          cpl_medio,
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

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await req.json();
    const { nome, meta_account_id, ticket_medio, cor } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert({
        user_id:         user.id,
        nome:            nome.trim(),
        meta_account_id: meta_account_id || null,
        ticket_medio:    ticket_medio || null,
        cor:             cor ?? "#6366f1",
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