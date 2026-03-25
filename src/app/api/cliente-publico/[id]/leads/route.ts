// GET /api/cliente-publico/[id]/leads
// Retorna resumo de leads do pipeline para o portal público do cliente.
// Sem auth — apenas dados não sensíveis.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LeadRow {
  estagio: string;
  nome: string;
  campanha_nome: string | null;
  plataforma: string | null;
  valor_fechado: number | null;
  created_at: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: leads, error } = await supabaseAdmin
    .from("crm_leads")
    .select("estagio, nome, campanha_nome, plataforma, valor_fechado, created_at")
    .eq("cliente_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (leads ?? []) as LeadRow[];

  // Contagem por estágio
  const porEstagio = {
    novo:     rows.filter(l => l.estagio === "novo").length,
    contato:  rows.filter(l => l.estagio === "contato").length,
    proposta: rows.filter(l => l.estagio === "proposta").length,
    fechado:  rows.filter(l => l.estagio === "fechado").length,
    perdido:  rows.filter(l => l.estagio === "perdido").length,
  };

  const totalFechado = rows
    .filter(l => l.estagio === "fechado")
    .reduce((acc, l) => acc + (l.valor_fechado ?? 0), 0);

  const taxaFechamento = rows.length > 0
    ? Math.round((porEstagio.fechado / rows.length) * 100)
    : 0;

  // Últimos 10 leads (sem dados sensíveis)
  const recentes = rows.slice(0, 10).map(l => ({
    nome:          l.nome,
    estagio:       l.estagio,
    campanha_nome: l.campanha_nome,
    plataforma:    l.plataforma,
    created_at:    l.created_at,
  }));

  return NextResponse.json({
    total:          rows.length,
    por_estagio:    porEstagio,
    total_fechado:  totalFechado,
    taxa_fechamento: taxaFechamento,
    recentes,
  });
}
