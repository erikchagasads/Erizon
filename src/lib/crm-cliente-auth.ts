// src/lib/crm-cliente-auth.ts
// Helper reutilizável para verificar sessão do cliente CRM

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function verificarSessaoCliente(
  req: NextRequest,
  crmTokenParam: string
): Promise<{ ok: true; clienteId: string } | { ok: false; erro: string }> {
  const sessionToken = req.cookies.get("crm_session")?.value;

  if (!sessionToken) {
    return { ok: false, erro: "Não autenticado" };
  }

  const { data: session } = await supabaseAdmin
    .from("crm_cliente_sessions")
    .select("crm_token, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) {
    return { ok: false, erro: "Sessão expirada" };
  }

  // Garante que a sessão pertence ao token da URL
  if (session.crm_token !== crmTokenParam) {
    return { ok: false, erro: "Acesso negado" };
  }

  // Busca cliente
  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .eq("crm_token", session.crm_token)
    .eq("ativo", true)
    .maybeSingle();

  if (!cliente) {
    return { ok: false, erro: "Cliente não encontrado" };
  }

  return { ok: true, clienteId: cliente.id };
}
