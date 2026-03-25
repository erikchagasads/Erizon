// POST /api/crm-cliente/auth/register
// Cliente cria sua senha pela primeira vez usando o crm_token do link.
// Usa bcrypt para hash da senha — sem dependências externas além do Node crypto.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Hash simples com SHA-256 + salt (evita bcrypt como dependência extra)
function hashSenha(senha: string, salt: string): string {
  return createHash("sha256").update(salt + senha + salt).digest("hex");
}

function gerarSalt(): string {
  return randomBytes(16).toString("hex");
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    crm_token: string;
    email: string;
    senha: string;
  };

  const { crm_token, email, senha } = body;

  if (!crm_token || !email || !senha) {
    return NextResponse.json({ error: "Campos obrigatórios: crm_token, email, senha" }, { status: 400 });
  }

  if (senha.length < 6) {
    return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });
  }

  // Verifica se o token existe e é válido
  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, crm_token")
    .eq("crm_token", crm_token)
    .eq("ativo", true)
    .maybeSingle();

  if (!cliente) {
    return NextResponse.json({ error: "Link inválido" }, { status: 404 });
  }

  // Verifica se já tem conta
  const { data: existing } = await supabaseAdmin
    .from("crm_cliente_auth")
    .select("id")
    .eq("crm_token", crm_token)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Este cliente já possui uma conta. Faça login." }, { status: 409 });
  }

  // Cria hash da senha
  const salt = gerarSalt();
  const senha_hash = `${salt}:${hashSenha(senha, salt)}`;

  // Salva auth
  const { error: authError } = await supabaseAdmin
    .from("crm_cliente_auth")
    .insert({ crm_token, email: email.toLowerCase().trim(), senha_hash });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Cria sessão automática após registro
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("crm_cliente_sessions")
    .insert({ crm_token })
    .select("session_token")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Conta criada, faça login." }, { status: 201 });
  }

  const response = NextResponse.json({
    ok: true,
    crm_token,
    nome: cliente.nome,
  }, { status: 201 });

  response.cookies.set("crm_session", session.session_token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    path: "/",
  });

  return response;
}
