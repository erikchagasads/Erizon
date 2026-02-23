// /api/snapshot-diario/route.ts — v2
// Chamado pelo cron Vercel todo dia às 02:00
// SEGURO: usa service role key (correto para cron server-side)
// Popula metricas_snapshot_diario para habilitar velocidade de degradação

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const maxDuration = 30;

export async function GET(req: Request) {
  // Valida cron secret — obrigatório em produção
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Aviso se rodando sem secret (dev only)
  if (!cronSecret) {
    console.warn("[snapshot-diario] CRON_SECRET não configurado — endpoint público!");
  }

  // Valida variáveis obrigatórias
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[snapshot-diario] Variáveis de ambiente ausentes");
    return NextResponse.json(
      { ok: false, error: "Configuração incompleta — verifique SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  try {
    // Service role: acessa todos os dados sem RLS (correto para cron server-side)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.rpc("inserir_snapshots_diarios");

    if (error) {
      console.error("[snapshot-diario] Erro RPC:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const timestamp = new Date().toISOString();
    console.log("[snapshot-diario] Snapshots inseridos:", timestamp);

    return NextResponse.json({
      ok: true,
      timestamp,
      message: "Snapshots diários inseridos com sucesso",
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[snapshot-diario] Erro inesperado:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}