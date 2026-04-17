// src/app/api/clientes/[id]/financeiro/route.ts
// Registra faturamento real vinculado a um cliente específico (usado pelo portal).

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createServerSupabase } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  receita_gerada: z.number().min(0),
  leads_fechados: z.number().int().min(0),
  periodo_referencia: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  try {
    const body = await request.json();
    const data = schema.parse(body);
    const db = createServerSupabase();

    const { error } = await db.from("cliente_financeiro").insert({
      workspace_user_id: auth.user.id,
      cliente_id: params.id,
      receita_gerada: data.receita_gerada,
      leads_fechados: data.leads_fechados,
      periodo_referencia: data.periodo_referencia ?? new Date().toISOString().slice(0, 7),
      created_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
