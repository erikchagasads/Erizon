// src/lib/agente-memoria.ts
// CORRIGIDO: busca por workspace_id (era user_id — nunca encontrava os dados)

import { createServerClient } from "@supabase/ssr";

type Supabase = ReturnType<typeof createServerClient>;

interface MemoriaCliente {
  nicho?: string | null;
  descricao?: string | null;
  publico_alvo?: string | null;
  cpl_historico?: number | null;
  cpl_alvo?: number | null;
  roas_historico?: number | null;
  roas_alvo?: number | null;
  ticket_medio?: number | null;
  budget_mensal?: number | null;
  copies_aprovadas?: unknown[];
  copies_reprovadas?: unknown[];
  ganchos_aprovados?: unknown[];
  acoes_aprovadas?: unknown[];
  acoes_reprovadas?: unknown[];
  formatos_que_convertem?: string | null;
  angulos_que_funcionam?: string | null;
  padroes_observados?: string | null;
  total_feedbacks?: number;
}

// ── Resolve workspaceId a partir do userId ────────────────────────────────────

async function resolveWorkspaceId(supabase: Supabase, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.workspace_id ?? null;
}

// ── Busca memória do cliente ──────────────────────────────────────────────────

export async function buscarMemoriaCliente(
  supabase: Supabase,
  userId: string,
  clienteId: string
): Promise<MemoriaCliente | null> {
  try {
    const workspaceId = await resolveWorkspaceId(supabase, userId);
    if (!workspaceId) return null;

    const { data } = await supabase
      .from("agente_memoria_cliente")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("cliente_id", clienteId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

// ── Formata contexto para injetar no system prompt ────────────────────────────

export function buildContextoCliente(mem: MemoriaCliente | null, agente: string): string {
  if (!mem || mem.total_feedbacks === 0) return "";

  const linhas: string[] = ["", "── MEMÓRIA DO CLIENTE ──"];

  if (mem.nicho)        linhas.push(`Nicho: ${mem.nicho}`);
  if (mem.descricao)    linhas.push(`Negócio: ${mem.descricao}`);
  if (mem.publico_alvo) linhas.push(`Público-alvo: ${mem.publico_alvo}`);

  const benchmarks: string[] = [];
  if (mem.cpl_alvo)      benchmarks.push(`CPL alvo: R$${mem.cpl_alvo}`);
  if (mem.cpl_historico) benchmarks.push(`CPL histórico: R$${mem.cpl_historico}`);
  if (mem.roas_alvo)     benchmarks.push(`ROAS alvo: ${mem.roas_alvo}×`);
  if (mem.ticket_medio)  benchmarks.push(`Ticket médio: R$${mem.ticket_medio}`);
  if (benchmarks.length) linhas.push(`Benchmarks: ${benchmarks.join(" | ")}`);

  if (agente === "copywriter") {
    const aprovadas = (mem.copies_aprovadas ?? []) as Array<Record<string, string>>;
    if (aprovadas.length > 0) {
      linhas.push("\nCopies que funcionaram para este cliente:");
      aprovadas.slice(0, 3).forEach(c => {
        linhas.push(`  ✓ [${c.tipo ?? "copy"}] ${c.texto?.slice(0, 80) ?? ""}${c.motivo ? ` — ${c.motivo}` : ""}`);
      });
    }
    const reprovadas = (mem.copies_reprovadas ?? []) as Array<Record<string, string>>;
    if (reprovadas.length > 0) {
      linhas.push("\nCopies que NÃO funcionaram:");
      reprovadas.slice(0, 2).forEach(c => {
        linhas.push(`  ✗ [${c.tipo ?? "copy"}] ${c.motivo ?? "rejeitada"}`);
      });
    }
    if (mem.formatos_que_convertem) linhas.push(`Formatos que convertem: ${mem.formatos_que_convertem}`);
    if (mem.angulos_que_funcionam)  linhas.push(`Ângulos que funcionam: ${mem.angulos_que_funcionam}`);
  }

  if (agente === "roteirista") {
    const ganchos = (mem.ganchos_aprovados ?? []) as Array<Record<string, string>>;
    if (ganchos.length > 0) {
      linhas.push("\nGanchos aprovados para este cliente:");
      ganchos.slice(0, 3).forEach(g => {
        linhas.push(`  ✓ "${g.gancho ?? ""}"${g.motivo ? ` — ${g.motivo}` : ""}`);
      });
    }
    if (mem.formatos_que_convertem) linhas.push(`Formatos que convertem: ${mem.formatos_que_convertem}`);
  }

  if (agente === "analista" || agente === "agente") {
    const aprovadas = (mem.acoes_aprovadas ?? []) as Array<Record<string, string>>;
    if (aprovadas.length > 0) {
      linhas.push("\nAções que funcionaram neste cliente:");
      aprovadas.slice(0, 3).forEach(a => {
        linhas.push(`  ✓ ${a.acao?.slice(0, 100) ?? ""}${a.motivo ? ` — ${a.motivo}` : ""}`);
      });
    }
    const reprovadas = (mem.acoes_reprovadas ?? []) as Array<Record<string, string>>;
    if (reprovadas.length > 0) {
      linhas.push("\nAções que NÃO funcionaram:");
      reprovadas.slice(0, 2).forEach(a => {
        linhas.push(`  ✗ ${a.acao?.slice(0, 100) ?? ""}${a.motivo ? ` — ${a.motivo}` : ""}`);
      });
    }
    if (mem.padroes_observados) linhas.push(`Padrões observados: ${mem.padroes_observados}`);
  }

  linhas.push("\nUse este histórico para personalizar sua resposta a este cliente.");
  return linhas.join("\n");
}

// ── Helper completo: busca + formata ─────────────────────────────────────────

export async function getContextoCliente(
  supabase: Supabase,
  userId: string,
  clienteId: string | undefined | null,
  agente: string
): Promise<string> {
  if (!clienteId) return "";
  const mem = await buscarMemoriaCliente(supabase, userId, clienteId);
  return buildContextoCliente(mem, agente);
}