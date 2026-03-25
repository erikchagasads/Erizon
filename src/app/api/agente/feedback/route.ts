// src/app/api/agente/feedback/route.ts
// POST — salva feedback de qualquer agente (avaliação + motivo + contexto)
// GET  — retorna estatísticas de feedback por agente/cliente

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) { values.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ── POST — salva feedback ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabase();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const {
      agente,       // 'agente' | 'analista' | 'copywriter' | 'roteirista' | 'geral'
      avaliacao,    // 'positivo' | 'negativo'
      motivo,       // texto livre ou categoria
      contexto,     // objeto com o que foi avaliado
      cliente_id,   // opcional
      sessao_id,    // opcional
    } = await req.json();

    if (!agente || !avaliacao) {
      return NextResponse.json({ error: "agente e avaliacao são obrigatórios." }, { status: 400 });
    }

    // 1. Salvar feedback
    const { error: fbErr } = await supabase.from("agente_feedback").insert({
      user_id: user.id,
      agente,
      avaliacao,
      motivo: motivo ?? null,
      contexto: contexto ?? null,
      cliente_id: cliente_id ?? null,
      sessao_id: sessao_id ?? null,
    });

    if (fbErr) throw fbErr;

    // 2. Atualizar memória global do usuário
    const { data: memoria } = await supabase
      .from("agente_memoria")
      .select("feedback_positivos, feedback_negativos")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memoria) {
      await supabase.from("agente_memoria").update({
        feedback_positivos: (memoria.feedback_positivos ?? 0) + (avaliacao === "positivo" ? 1 : 0),
        feedback_negativos: (memoria.feedback_negativos ?? 0) + (avaliacao === "negativo" ? 1 : 0),
        ultimo_feedback_em: new Date().toISOString(),
      }).eq("user_id", user.id);
    }

    // 3. Se tem cliente_id, atualizar memória do cliente
    if (cliente_id && contexto) {
      await atualizarMemoriaCliente(supabase, user.id, cliente_id, agente, avaliacao, motivo, contexto);
    }

    return NextResponse.json({ ok: true });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    console.error("[feedback] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── GET — estatísticas de feedback ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabase();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const cliente_id = searchParams.get("cliente_id");
    const agente     = searchParams.get("agente");

    let query = supabase
      .from("agente_feedback")
      .select("agente, avaliacao, motivo, criado_em")
      .eq("user_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(50);

    if (cliente_id) query = query.eq("cliente_id", cliente_id);
    if (agente)     query = query.eq("agente", agente);

    const { data: feedbacks } = await query;

    // Agregar por agente
    const stats: Record<string, { positivos: number; negativos: number; total: number }> = {};
    for (const fb of (feedbacks ?? [])) {
      if (!stats[fb.agente]) stats[fb.agente] = { positivos: 0, negativos: 0, total: 0 };
      stats[fb.agente].total++;
      if (fb.avaliacao === "positivo") stats[fb.agente].positivos++;
      else stats[fb.agente].negativos++;
    }

    return NextResponse.json({ feedbacks, stats });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Helper: atualiza memória do cliente com base no feedback ──────────────────

async function atualizarMemoriaCliente(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  clienteId: string,
  agente: string,
  avaliacao: string,
  motivo: string | null,
  contexto: Record<string, unknown>
) {
  try {
    const { data: mem } = await supabase
      .from("agente_memoria_cliente")
      .select("*")
      .eq("user_id", userId)
      .eq("cliente_id", clienteId)
      .maybeSingle();

    const agora = new Date().toISOString();
    const entrada = { motivo, data: agora, contexto: Object.keys(contexto).slice(0, 3) };

    // Copywriter — aprende quais copies/ganchos funcionam
    if (agente === "copywriter") {
      const tipo = (contexto.tipoCopy as string) ?? "geral";
      const texto = (contexto.resultado as string)?.slice(0, 200) ?? "";

      if (avaliacao === "positivo") {
        const copies = (mem?.copies_aprovadas as unknown[]) ?? [];
        copies.unshift({ texto, tipo, ...entrada });
        await upsertMemoria(supabase, userId, clienteId, mem, {
          copies_aprovadas: copies.slice(0, 10),
          total_feedbacks: (mem?.total_feedbacks ?? 0) + 1,
          ultima_interacao: agora,
          atualizado_em: agora,
        });
      } else {
        const copies = (mem?.copies_reprovadas as unknown[]) ?? [];
        copies.unshift({ texto, tipo, ...entrada });
        await upsertMemoria(supabase, userId, clienteId, mem, {
          copies_reprovadas: copies.slice(0, 10),
          total_feedbacks: (mem?.total_feedbacks ?? 0) + 1,
          ultima_interacao: agora,
          atualizado_em: agora,
        });
      }
    }

    // Roteirista — aprende quais ganchos e formatos convertem
    if (agente === "roteirista") {
      const gancho = (contexto.gancho as string)?.slice(0, 100) ?? "";
      if (avaliacao === "positivo" && gancho) {
        const ganchos = (mem?.ganchos_aprovados as unknown[]) ?? [];
        ganchos.unshift({ gancho, ...entrada });
        await upsertMemoria(supabase, userId, clienteId, mem, {
          ganchos_aprovados: ganchos.slice(0, 10),
          total_feedbacks: (mem?.total_feedbacks ?? 0) + 1,
          ultima_interacao: agora,
          atualizado_em: agora,
        });
      }
    }

    // Analista / Agente — aprende quais ações funcionam
    if (agente === "analista" || agente === "agente") {
      const acao = (contexto.acao as string)?.slice(0, 200) ?? "";
      if (avaliacao === "positivo" && acao) {
        const acoes = (mem?.acoes_aprovadas as unknown[]) ?? [];
        acoes.unshift({ acao, ...entrada });
        await upsertMemoria(supabase, userId, clienteId, mem, {
          acoes_aprovadas: acoes.slice(0, 10),
          total_feedbacks: (mem?.total_feedbacks ?? 0) + 1,
          ultima_interacao: agora,
          atualizado_em: agora,
        });
      } else if (avaliacao === "negativo" && acao) {
        const acoes = (mem?.acoes_reprovadas as unknown[]) ?? [];
        acoes.unshift({ acao, ...entrada });
        await upsertMemoria(supabase, userId, clienteId, mem, {
          acoes_reprovadas: acoes.slice(0, 10),
          total_feedbacks: (mem?.total_feedbacks ?? 0) + 1,
          ultima_interacao: agora,
          atualizado_em: agora,
        });
      }
    }
  } catch (e) {
    console.error("[feedback] atualizarMemoriaCliente:", e);
  }
}

async function upsertMemoria(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  clienteId: string,
  mem: Record<string, unknown> | null,
  updates: Record<string, unknown>
) {
  if (mem) {
    await supabase.from("agente_memoria_cliente")
      .update(updates)
      .eq("user_id", userId)
      .eq("cliente_id", clienteId);
  } else {
    await supabase.from("agente_memoria_cliente")
      .insert({ user_id: userId, cliente_id: clienteId, ...updates });
  }
}
