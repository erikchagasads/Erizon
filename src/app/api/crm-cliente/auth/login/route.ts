// POST /api/crm-cliente/auth/login
// Cliente faz login com email + senha.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashSenha(senha: string, salt: string): string {
  return createHash("sha256").update(salt + senha + salt).digest("hex");
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    email: string;
    senha: string;
  };

  const { email, senha } = body;

  if (!email || !senha) {
    return NextResponse.json({ error: "Email e senha obrigatórios" }, { status: 400 });
  }

  // Busca auth pelo email
  const { data: auth } = await supabaseAdmin
    .from("crm_cliente_auth")
    .select("id, crm_token, senha_hash")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (!auth) {
    return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });
  }

  // Verifica senha
  const [salt, hash] = auth.senha_hash.split(":");
  const hashTentativa = hashSenha(senha, salt);

  if (hashTentativa !== hash) {
    return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });
  }

  // Verifica se o cliente ainda está ativo
  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, crm_token")
    .eq("crm_token", auth.crm_token)
    .eq("ativo", true)
    .maybeSingle();

  if (!cliente) {
    return NextResponse.json({ error: "Conta desativada. Contate seu gestor." }, { status: 403 });
  }

  // Cria sessão
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("crm_cliente_sessions")
    .insert({ crm_token: auth.crm_token })
    .select("session_token")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Erro ao criar sessão" }, { status: 500 });
  }

  const response = NextResponse.json({
    ok: true,
    crm_token: auth.crm_token,
    nome: cliente.nome,
  });

  response.cookies.set("crm_session", session.session_token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
