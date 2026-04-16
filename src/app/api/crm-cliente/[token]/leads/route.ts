// GET /api/crm-cliente/[token]/leads
// Requer sessão autenticada via cookie crm_session.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verificarSessaoCliente } from "@/lib/crm-cliente-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const sessao = await verificarSessaoCliente(req, token);
  if (sessao.ok === false) {
    return NextResponse.json({ error: sessao.erro, redirect: `/crm/cliente/login/${token}` }, { status: 401 });
  }

  const { data: leads, error } = await supabaseAdmin
    .from("crm_leads")
    .select("id, nome, telefone, email, estagio, valor_fechado, margem_lucro, motivo_perda, campanha_nome, plataforma, anotacao, created_at, updated_at")
    .eq("cliente_id", sessao.clienteId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Garante que valor_fechado seja retornado como número (Supabase retorna como string para numeric)
  const leadsFormatados = (leads ?? []).map(lead => ({
    ...lead,
    valor_fechado: lead.valor_fechado ? Number(lead.valor_fechado) : null,
    margem_lucro: lead.margem_lucro !== null ? Number(lead.margem_lucro) : null,
  }));

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("nome, nome_cliente")
    .eq("crm_token", token)
    .maybeSingle();

  return NextResponse.json({
    cliente: {
      id: sessao.clienteId,
      nome: cliente?.nome_cliente ?? cliente?.nome ?? "Cliente",
    },
    leads: leadsFormatados,
  });
}
