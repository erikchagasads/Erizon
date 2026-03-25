// src/app/api/clientes/campanhas/route.ts

import { NextRequest, NextResponse } from "next/server";

type CampanhaRow = {
  id: string;
  nome_campanha: string;
  status: string;
  gasto_total: number | null;
  contatos: number | null;
  ctr: number | null;
  cliente_id: string | null;
};
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

const STATUS_ATIVOS = ["ATIVO", "ACTIVE", "ATIVA"];

// G2CAR → ["G2CAR", "G2 CAR", "G2-CAR", "G2", "CAR"]
// G2 CAR → ["G2 CAR", "G2CAR", "G2", "CAR"]
function gerarTermos(nome: string): string[] {
  const termos = new Set<string>();
  const n = nome.trim();
  if (!n) return [];

  // nome original
  termos.add(n);

  // sem espaços: "G2 CAR" → "G2CAR"
  termos.add(n.replace(/\s+/g, ""));

  // com espaço entre dígito→letra: "G2CAR" → "G2 CAR"
  termos.add(n.replace(/(\d)([A-Za-z])/g, "$1 $2").trim());

  // sem hífen: "G2-CAR" → "G2 CAR"
  termos.add(n.replace(/-/g, " ").replace(/\s+/g, " ").trim());

  // sem acento
  const semAcento = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (semAcento !== n) termos.add(semAcento);

  // cada palavra com 3+ chars
  n.split(/[\s\-_]+/).forEach(p => { if (p.length >= 3) termos.add(p); });

  return [...termos].filter((t, i, arr) => t.length >= 2 && arr.indexOf(t) === i);
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getSupabaseUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const clienteId = req.nextUrl.searchParams.get("cliente_id");
    const isDebug   = req.nextUrl.searchParams.get("debug") === "1";
    if (!clienteId) return NextResponse.json({ error: "cliente_id obrigatório." }, { status: 400 });

    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nome, nome_cliente, campanha_keywords")
      .eq("id", clienteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cliente) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    // ── Busca 1: vinculadas por cliente_id (todos status) ─────────────────────
    const { data: todasVinculadas } = await supabase
      .from("metricas_ads")
      .select("id, nome_campanha, status, gasto_total, contatos, ctr, cliente_id")
      .eq("user_id", user.id)
      .eq("cliente_id", clienteId)
      .order("gasto_total", { ascending: false });

    const ativasVinculadas = (todasVinculadas ?? []).filter(c => STATUS_ATIVOS.includes(c.status));

    if (ativasVinculadas.length > 0 && !isDebug) {
      return NextResponse.json({ campanhas: mapCampanhas(ativasVinculadas), fonte: "vinculo" });
    }

    // ── Busca 2: por nome + keywords (todos status para encontrar, filtra ativo depois) ──
    const nomeCliente = (cliente.nome_cliente ?? cliente.nome ?? "").trim();
    const keywords = (cliente.campanha_keywords ?? "")
      .split(",").map((k: string) => k.trim()).filter(Boolean);

    const todosTermos = [
      ...gerarTermos(nomeCliente),
      ...keywords.flatMap((kw: string) => gerarTermos(kw)),
    ].filter((t, i, arr) => arr.indexOf(t) === i);

    const todasEncontradas: CampanhaRow[] = [];
    const debugInfo: { termo: string; encontradas: number; erro: string | null }[] = [];

    for (const termo of todosTermos) {
      const { data, error } = await supabase
        .from("metricas_ads")
        .select("id, nome_campanha, status, gasto_total, contatos, ctr, cliente_id")
        .eq("user_id", user.id)
        .ilike("nome_campanha", `%${termo}%`);

      if (isDebug) debugInfo.push({ termo, encontradas: data?.length ?? 0, erro: error?.message ?? null });

      if (data) {
        for (const camp of data) {
          if (!todasEncontradas.find(x => x.id === camp.id)) {
            todasEncontradas.push(camp);
          }
        }
      }
    }

    if (isDebug) {
      return NextResponse.json({
        cliente: { nome: nomeCliente, keywords },
        termos_buscados: todosTermos,
        busca_detalhada: debugInfo,
        vinculadas_existentes: todasVinculadas?.length ?? 0,
        ativas_vinculadas: ativasVinculadas.length,
        encontradas_por_nome: todasEncontradas.length,
        ativas_encontradas: todasEncontradas.filter(c => STATUS_ATIVOS.includes(c.status)).length,
        encontradas: todasEncontradas.map(c => ({ nome: c.nome_campanha, status: c.status, cliente_id: c.cliente_id })),
      });
    }

    // Filtra só ativas das encontradas
    const ativasEncontradas = todasEncontradas.filter(c => STATUS_ATIVOS.includes(c.status));

    // ── Auto-vínculo: vincula as ativas sem cliente_id ────────────────────────
    const semVinculo = ativasEncontradas.filter(c => !c.cliente_id);
    if (semVinculo.length > 0) {
      await supabase
        .from("metricas_ads")
        .update({ cliente_id: clienteId })
        .in("id", semVinculo.map(c => c.id))
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      campanhas: mapCampanhas(ativasEncontradas),
      vinculadas_agora: semVinculo.length,
      fonte: "nome",
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function mapCampanhas(ads: CampanhaRow[]) {
  return ads.map(c => {
    const leads = c.contatos ?? 0;
    const gasto = c.gasto_total ?? 0;
    const cpl   = leads > 0 ? Math.round((gasto / leads) * 100) / 100 : 0;
    return { id: c.id, nome_campanha: c.nome_campanha, status: c.status, gasto_total: gasto, total_leads: leads, cpl, ctr: c.ctr ?? 0 };
  });
}
