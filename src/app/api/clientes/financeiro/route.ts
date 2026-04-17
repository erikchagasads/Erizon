// src/app/api/clientes/financeiro/route.ts
// Registra faturamento real do cliente, conectando tráfego ao negócio.
// POST { cliente_id, receita_gerada, leads_fechados }

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createServerSupabase } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  cliente_id: z.string().uuid(),
  receita_gerada: z.number().min(0),
  leads_fechados: z.number().int().min(0),
  periodo_referencia: z.string().optional(), // "2025-01" — opcional
  observacao: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  try {
    const body = await request.json();
    const data = schema.parse(body);
    const db = createServerSupabase();

    const { data: result, error } = await db
      .from("cliente_financeiro")
      .insert({
        workspace_user_id: auth.user.id,
        cliente_id: data.cliente_id,
        receita_gerada: data.receita_gerada,
        leads_fechados: data.leads_fechados,
        periodo_referencia: data.periodo_referencia ?? new Date().toISOString().slice(0, 7),
        observacao: data.observacao ?? null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("POST /api/clientes/financeiro", error);
      return NextResponse.json({ error: "Erro ao salvar faturamento" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("cliente_id");
  if (!clienteId) return NextResponse.json({ error: "cliente_id obrigatório" }, { status: 400 });

  const db = createServerSupabase();
  const { data, error } = await db
    .from("cliente_financeiro")
    .select("*")
    .eq("workspace_user_id", auth.user.id)
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 });

  const totalReceita = (data ?? []).reduce((s, r) => s + (Number(r.receita_gerada) || 0), 0);
  const totalFechados = (data ?? []).reduce((s, r) => s + (Number(r.leads_fechados) || 0), 0);

  return NextResponse.json({ ok: true, historico: data, totalReceita, totalFechados });
}
