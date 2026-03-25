// src/app/api/relatorio-pdf/route.ts
// Gera PDF formatado com métricas das campanhas de um cliente ou busca por nome

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabaseUser() {
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

function calcScore(gasto: number, leads: number, roas: number): number {
  if (gasto === 0) return 0;
  if (leads === 0 && gasto > 50) return 20;
  const cpl = leads > 0 ? gasto / leads : 999;
  let score = 50;
  if (roas >= 3)   score += 25;
  else if (roas >= 2) score += 10;
  else if (roas < 1)  score -= 20;
  if (cpl < 30)  score += 15;
  else if (cpl < 60) score += 5;
  else if (cpl > 120) score -= 15;
  return Math.min(100, Math.max(0, score));
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const clienteId = req.nextUrl.searchParams.get("cliente_id");
    const busca     = req.nextUrl.searchParams.get("busca") ?? "";

    // Busca campanhas
    let query = supabase
      .from("metricas_ads")
      .select("*")
      .eq("user_id", user.id)
      .order("gasto_total", { ascending: false });

    if (clienteId) query = query.eq("cliente_id", clienteId);
    if (busca)     query = query.ilike("nome_campanha", `%${busca}%`);

    const { data: campanhas, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Busca nome do cliente se tiver ID
    let nomeCliente = busca ? `Busca: "${busca}"` : "Todas as campanhas";
    if (clienteId) {
      const { data: cl } = await supabase
        .from("clientes").select("nome, nome_cliente")
        .eq("id", clienteId).eq("user_id", user.id).maybeSingle();
      if (cl) nomeCliente = cl.nome_cliente ?? cl.nome ?? nomeCliente;
    }

    const lista = campanhas ?? [];
    const totalInvest  = lista.reduce((s, c) => s + (c.gasto_total ?? 0), 0);
    const totalLeads   = lista.reduce((s, c) => s + (c.contatos ?? 0), 0);
    const totalReceita = lista.reduce((s, c) => s + (c.receita_estimada ?? 0), 0);
    const cplMedio     = totalLeads > 0 ? totalInvest / totalLeads : 0;
    const roasMedio    = totalInvest > 0 ? totalReceita / totalInvest : 0;
    const dataHoje     = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    // Gera HTML que será convertido para PDF no frontend
    // Retornamos JSON com os dados estruturados para o frontend gerar o PDF
    return NextResponse.json({
      ok: true,
      relatorio: {
        titulo:      `Relatório de Campanhas — ${nomeCliente}`,
        cliente:     nomeCliente,
        dataGeracao: dataHoje,
        totais: {
          campanhas:     lista.length,
          investimento:  totalInvest,
          leads:         totalLeads,
          receita:       totalReceita,
          cplMedio,
          roasMedio,
        },
        campanhas: lista.map(c => ({
          id:              c.id,
          cliente_id:      c.cliente_id ?? null,
          nome:            c.nome_campanha ?? "—",
          status:          c.status ?? "—",
          gasto:           c.gasto_total ?? 0,
          leads:           c.contatos ?? 0,
          receita:         c.receita_estimada ?? 0,
          cpl:             c.contatos > 0 ? (c.gasto_total / c.contatos) : 0,
          roas:            c.gasto_total > 0 ? (c.receita_estimada / c.gasto_total) : 0,
          ctr:             c.ctr ?? 0,
          cpm:             c.cpm ?? 0,
          impressoes:      c.impressoes ?? 0,
          meta_account_id:  c.meta_account_id ?? null,
          meta_campaign_id: c.meta_campaign_id ?? null,
          analise_criativo: c.analise_criativo ?? null,
          score:           calcScore(c.gasto_total ?? 0, c.contatos ?? 0, c.gasto_total > 0 ? (c.receita_estimada ?? 0) / c.gasto_total : 0),
          diasAtivo:       c.dias_ativo ?? 0,
          dataInicio:      c.data_inicio ?? null,
        })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}