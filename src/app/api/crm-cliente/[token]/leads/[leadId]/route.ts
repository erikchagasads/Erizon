// PATCH /api/crm-cliente/[token]/leads/[leadId]
// Requer sessão autenticada via cookie crm_session.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verificarSessaoCliente } from "@/lib/crm-cliente-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ESTAGIOS_VALIDOS = ["novo", "contato", "proposta", "fechado", "perdido"] as const;
type Estagio = typeof ESTAGIOS_VALIDOS[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; leadId: string }> }
) {
  const { token, leadId } = await params;

  const sessao = await verificarSessaoCliente(req, token);
  if (sessao.ok === false) {
    return NextResponse.json({ error: sessao.erro }, { status: 401 });
  }

  const body = await req.json() as {
    estagio?: string;
    valor_fechado?: number;
    motivo_perda?: string;
    anotacao?: string;
  };

  if (body.estagio && !ESTAGIOS_VALIDOS.includes(body.estagio as Estagio)) {
    return NextResponse.json({ error: "Estágio inválido" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.estagio)                      update.estagio       = body.estagio;
  if (body.valor_fechado !== undefined)  update.valor_fechado = body.valor_fechado;
  if (body.motivo_perda)                 update.motivo_perda  = body.motivo_perda;
  if (body.anotacao !== undefined)       update.anotacao      = body.anotacao;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("crm_leads")
    .update(update)
    .eq("id", leadId)
    .eq("cliente_id", sessao.clienteId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });

  return NextResponse.json(data);
}
