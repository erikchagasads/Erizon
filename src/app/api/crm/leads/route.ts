// GET /api/crm/leads — lista leads do usuário
// POST /api/crm/leads — cria novo lead
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const clienteId = searchParams.get("cliente_id");

  let query = supabase
    .from("crm_leads")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (clienteId) query = query.eq("cliente_id", clienteId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json() as {
    nome: string;
    telefone?: string;
    email?: string;
    anotacao?: string;
    cliente_id?: string;
    campanha_nome?: string;
    campanha_id?: string;
    plataforma?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };

  if (!body.nome?.trim()) {
    return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("crm_leads")
    .insert({
      user_id:       user.id,
      nome:          body.nome.trim(),
      telefone:      body.telefone ?? null,
      email:         body.email ?? null,
      anotacao:      body.anotacao ?? null,
      cliente_id:    body.cliente_id ?? null,
      campanha_nome: body.campanha_nome ?? null,
      campanha_id:   body.campanha_id ?? null,
      plataforma:    body.plataforma ?? "manual",
      utm_source:    body.utm_source ?? null,
      utm_medium:    body.utm_medium ?? null,
      utm_campaign:  body.utm_campaign ?? null,
      utm_content:   body.utm_content ?? null,
      utm_term:      body.utm_term ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
