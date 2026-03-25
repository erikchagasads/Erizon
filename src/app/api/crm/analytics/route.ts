// GET /api/crm/analytics?cliente_id=xxx
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const clienteId = req.nextUrl.searchParams.get("cliente_id");
  const dias = parseInt(req.nextUrl.searchParams.get("dias") ?? "30");

  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  let query = supabase
    .from("crm_leads")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", desde.toISOString());

  if (clienteId) query = query.eq("cliente_id", clienteId);

  const { data: leads, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = leads ?? [];

  // Funil
  const funil = {
    novo:     all.filter(l => l.estagio === "novo").length,
    contato:  all.filter(l => l.estagio === "contato").length,
    proposta: all.filter(l => l.estagio === "proposta").length,
    fechado:  all.filter(l => l.estagio === "fechado").length,
    perdido:  all.filter(l => l.estagio === "perdido").length,
  };

  // Métricas globais
  const total_leads = all.length;
  const total_fechados = funil.fechado;
  const valor_total = all.filter(l => l.estagio === "fechado").reduce((s, l) => s + (l.valor_fechado ?? 0), 0);
  const taxa_conversao = total_leads > 0 ? Math.round((total_fechados / total_leads) * 100) : 0;

  // Ticket médio
  const ticket_medio = total_fechados > 0 ? valor_total / total_fechados : 0;

  // Leads por campanha com ROI
  const campanhaMap: Record<string, {
    campanha_id: string | null;
    campanha_nome: string;
    plataforma: string;
    total: number;
    fechados: number;
    perdidos: number;
    valor: number;
  }> = {};

  for (const lead of all) {
    const key = lead.campanha_id ?? lead.campanha_nome ?? "__sem_campanha__";
    if (!campanhaMap[key]) {
      campanhaMap[key] = {
        campanha_id: lead.campanha_id ?? null,
        campanha_nome: lead.campanha_nome ?? "Sem campanha",
        plataforma: lead.plataforma ?? "manual",
        total: 0, fechados: 0, perdidos: 0, valor: 0,
      };
    }
    campanhaMap[key].total++;
    if (lead.estagio === "fechado") { campanhaMap[key].fechados++; campanhaMap[key].valor += lead.valor_fechado ?? 0; }
    if (lead.estagio === "perdido") campanhaMap[key].perdidos++;
  }

  const por_campanha = Object.values(campanhaMap)
    .map(c => ({
      ...c,
      taxa_conversao: c.total > 0 ? Math.round((c.fechados / c.total) * 100) : 0,
    }))
    .sort((a, b) => b.valor - a.valor);

  // Leads por plataforma
  const plataformaMap: Record<string, number> = {};
  for (const lead of all) {
    const p = lead.plataforma ?? "manual";
    plataformaMap[p] = (plataformaMap[p] ?? 0) + 1;
  }
  const por_plataforma = Object.entries(plataformaMap)
    .map(([plataforma, count]) => ({ plataforma, count }))
    .sort((a, b) => b.count - a.count);

  // Leads atrasados (proposta > 7 dias)
  const limite7dias = new Date();
  limite7dias.setDate(limite7dias.getDate() - 7);
  const leads_atrasados = all.filter(l =>
    l.estagio === "proposta" &&
    new Date(l.updated_at ?? l.created_at) < limite7dias
  ).length;

  // Evolução diária (últimos 14 dias)
  const evolucao: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    evolucao[d.toISOString().split("T")[0]] = 0;
  }
  for (const lead of all) {
    const dia = lead.created_at.split("T")[0];
    if (dia in evolucao) evolucao[dia]++;
  }
  const evolucao_diaria = Object.entries(evolucao).map(([data, leads]) => ({ data, leads }));

  return NextResponse.json({
    periodo_dias: dias,
    total_leads,
    total_fechados,
    valor_total,
    taxa_conversao,
    ticket_medio,
    leads_atrasados,
    funil,
    por_campanha,
    por_plataforma,
    evolucao_diaria,
  });
}
