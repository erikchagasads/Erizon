// src/app/api/cliente-publico/[id]/route.ts
// API pública — retorna dados operacionais do cliente (sem margem/lucro/receita)
// Acessível sem autenticação via link compartilhado

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15: params é uma Promise e precisa ser aguardada
    const { id: clienteId } = await params;

    if (!clienteId) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Busca cliente — só retorna se ativo
    const { data: cliente, error: clienteErr } = await supabase
      .from("clientes")
      .select("id, nome, nome_cliente, cor, ativo, ultima_atualizacao")
      .eq("id", clienteId)
      .eq("ativo", true)
      .maybeSingle();

    if (clienteErr || !cliente) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    // Busca campanhas ativas do cliente (sem dados financeiros sensíveis)
    const { data: ads } = await supabase
      .from("metricas_ads")
      .select("nome_campanha, status, gasto_total, contatos, impressoes, cliques, ctr")
      .eq("cliente_id", clienteId)
      .in("status", ["ATIVO", "ACTIVE", "ATIVA"])
      .order("gasto_total", { ascending: false });

    const campanhas = (ads ?? []).map(c => {
      const leads = c.contatos ?? 0;
      const gasto = c.gasto_total ?? 0;
      const cpl   = leads > 0 ? gasto / leads : 0;
      const ctr   = c.ctr ?? (c.cliques && c.impressoes
        ? (c.cliques / c.impressoes) * 100
        : 0);

      // Score simplificado público (sem dados financeiros internos)
      let score = 70;
      if (leads === 0 && gasto > 50)       score = 20;
      else if (cpl > 80)                   score = 35;
      else if (cpl > 50)                   score = 55;
      else if (cpl < 20 && leads > 5)      score = 90;

      let recomendacao = "Manter";
      if (score >= 80)        recomendacao = "Escalar";
      else if (score < 40)    recomendacao = "Pausar";
      else if (score < 60)    recomendacao = "Otimizar";
      else if (gasto < 30)    recomendacao = "Maturando";

      return {
        nome_campanha: c.nome_campanha,
        status:        c.status,
        gasto_total:   gasto,
        total_leads:   leads,
        cpl:           Math.round(cpl * 100) / 100,
        impressoes:    c.impressoes ?? 0,
        cliques:       c.cliques    ?? 0,
        ctr:           Math.round(ctr * 100) / 100,
        score,
        recomendacao,
      };
    });

    const totalLeads = campanhas.reduce((s, c) => s + c.total_leads, 0);
    const totalGasto = campanhas.reduce((s, c) => s + c.gasto_total, 0);
    const cplMedio   = totalLeads > 0 ? totalGasto / totalLeads : 0;

    return NextResponse.json({
      nome:               cliente.nome_cliente ?? cliente.nome,
      cor:                cliente.cor          ?? "#6366f1",
      campanhas,
      total_leads:        totalLeads,
      gasto_total:        totalGasto,
      cpl_medio:          Math.round(cplMedio * 100) / 100,
      campanhas_ativas:   campanhas.length,
      ultima_atualizacao: cliente.ultima_atualizacao,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("GET /api/cliente-publico/[id]:", msg);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}