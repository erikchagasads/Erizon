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

export async function POST(req: NextRequest) {
  const { supabase, user } = await getSupabaseUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { campanha_id, corretor_id, nome_campanha } = await req.json();
  if (!campanha_id || !corretor_id) return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });

  const codigo = `camp_${campanha_id.slice(0, 8)}`;

  const { data: exist } = await supabase
    .from("campanhas")
    .select("id")
    .eq("id", campanha_id)
    .single();

  let result;
  if (exist) {
    const { data, error } = await supabase
      .from("campanhas")
      .update({ corretor_id, codigo_unico: codigo })
      .eq("id", campanha_id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await supabase
      .from("campanhas")
      .insert({
        id: campanha_id,
        corretor_id,
        codigo_unico: codigo,
        nome: nome_campanha ?? campanha_id,
        status: "ativa",
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  return NextResponse.json({ ok: true, campanha: result, codigo });
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await getSupabaseUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campanha_id = searchParams.get("campanha_id");

  let query = supabase
    .from("campanhas")
    .select("*, corretores(id, nome, telefone)");

  if (campanha_id) query = query.eq("id", campanha_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campanhas: data });
}