// GET /api/crm-cliente/auth/check?token=[crm_token]
// Verifica se o token é válido e se já existe conta criada.
// Retorna o nome do cliente para exibir na tela de login.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });
  }

  // Busca cliente pelo token
  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, nome_cliente")
    .eq("crm_token", token)
    .eq("ativo", true)
    .maybeSingle();

  if (!cliente) {
    return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  }

  // Verifica se já tem conta de auth
  const { data: auth } = await supabaseAdmin
    .from("crm_cliente_auth")
    .select("id")
    .eq("crm_token", token)
    .maybeSingle();

  return NextResponse.json({
    temConta: !!auth,
    nome: cliente.nome_cliente ?? cliente.nome,
  });
}
