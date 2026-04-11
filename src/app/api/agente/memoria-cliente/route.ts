// src/app/api/agente/memoria-cliente/route.ts
// CORRIGIDO: padronizado para workspace_id (era user_id — inconsistente com ProfitDNAService)
// GET   — retorna perfil de memória de um cliente
// PATCH — atualiza campos do perfil (nicho, CPL histórico, etc.)

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";

async function resolveWorkspaceId(token: string): Promise<string | null> {
  const db = createServerSupabase();
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;

  const { data } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return data?.workspace_id ?? null;
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

// ── GET — busca perfil do cliente ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const workspaceId = await resolveWorkspaceId(token);
    if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });

    const auth = await requireAuth(req, workspaceId);
    if (auth.ok === false) return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });

    const { searchParams } = req.nextUrl;
    const cliente_id = searchParams.get("cliente_id");
    if (!cliente_id) return NextResponse.json({ error: "cliente_id obrigatório." }, { status: 400 });

    const db = createServerSupabase();
    const { data: mem } = await db
      .from("agente_memoria_cliente")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("cliente_id", cliente_id)
      .maybeSingle();

    return NextResponse.json({ memoria: mem ?? null });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── PATCH — atualiza perfil do cliente ────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const workspaceId = await resolveWorkspaceId(token);
    if (!workspaceId) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });

    const auth = await requireAuth(req, workspaceId);
    if (auth.ok === false) return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });

    const body = await req.json();
    const { cliente_id, ...updates } = body;

    if (!cliente_id) return NextResponse.json({ error: "cliente_id obrigatório." }, { status: 400 });

    const camposPermitidos = [
      "nicho", "descricao", "publico_alvo",
      "cpl_historico", "cpl_alvo", "roas_historico", "roas_alvo",
      "ticket_medio", "budget_mensal",
      "formatos_que_convertem", "angulos_que_funcionam", "padroes_observados",
    ];

    const payload: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
    for (const campo of camposPermitidos) {
      if (campo in updates) payload[campo] = updates[campo];
    }

    if (Object.keys(payload).length === 1) {
      return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 });
    }

    const db = createServerSupabase();

    const { data: existe } = await db
      .from("agente_memoria_cliente")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("cliente_id", cliente_id)
      .maybeSingle();

    if (existe) {
      await db
        .from("agente_memoria_cliente")
        .update(payload)
        .eq("workspace_id", workspaceId)
        .eq("cliente_id", cliente_id);
    } else {
      await db
        .from("agente_memoria_cliente")
        .insert({ workspace_id: workspaceId, cliente_id, ...payload });
    }

    return NextResponse.json({ ok: true });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}