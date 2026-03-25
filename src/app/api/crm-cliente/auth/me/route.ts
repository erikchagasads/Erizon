// GET /api/crm-cliente/auth/me
// Verifica se há sessão ativa e retorna o crm_token e nome do cliente.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get("crm_session")?.value;

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Busca sessão válida
  const { data: session } = await supabaseAdmin
    .from("crm_cliente_sessions")
    .select("crm_token, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.cookies.set("crm_session", "", { maxAge: 0, path: "/" });
    return response;
  }

  // Busca nome do cliente
  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("nome, nome_cliente")
    .eq("crm_token", session.crm_token)
    .maybeSingle();

  return NextResponse.json({
    authenticated: true,
    crm_token: session.crm_token,
    nome: cliente?.nome_cliente ?? cliente?.nome ?? "Cliente",
  });
}
