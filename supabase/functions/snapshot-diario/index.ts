// supabase/functions/snapshot-diario/index.ts
// Roda todo dia à meia-noite via cron e grava o estado atual de cada usuário
// Isso alimenta a comparação temporal real na Pulse

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const hoje     = new Date().toISOString().split("T")[0];

  // Busca todos os usuários com campanhas ativas
  const { data: usuarios, error: errUsuarios } = await supabase
    .from("metricas_ads")
    .select("user_id")
    .in("status", ["ATIVO", "ACTIVE", "ATIVA"]);

  if (errUsuarios) {
    return new Response(JSON.stringify({ error: errUsuarios.message }), { status: 500 });
  }

  // Deduplica user_ids
  const userIds = [...new Set((usuarios || []).map((u: any) => u.user_id))];

  const TICKET_MEDIO     = 450;
  const TAXA_CONVERSAO   = 0.04;
  let snapshotsGravados  = 0;

  for (const userId of userIds) {
    const { data: campanhas } = await supabase
      .from("metricas_ads")
      .select("gasto_total, contatos, orcamento")
      .eq("user_id", userId)
      .in("status", ["ATIVO", "ACTIVE", "ATIVA"]);

    if (!campanhas || campanhas.length === 0) continue;

    const totalGasto   = campanhas.reduce((a: number, c: any) => a + (c.gasto_total || 0), 0);
    const totalLeads   = campanhas.reduce((a: number, c: any) => a + (c.contatos || 0), 0);
    const totalReceita = totalLeads * TAXA_CONVERSAO * TICKET_MEDIO;
    const lucroTotal   = totalReceita - totalGasto;
    const roasGlobal   = totalGasto > 0 ? totalReceita / totalGasto : 0;
    const margemGlobal = totalReceita > 0 ? lucroTotal / totalReceita : 0;
    const cplMedio     = totalLeads  > 0 ? totalGasto  / totalLeads  : 0;

    // Upsert — se já rodou hoje, atualiza; não duplica
    const { error: errSnap } = await supabase
      .from("metricas_snapshot_diario")
      .upsert({
        user_id:        userId,
        data_snapshot:  hoje,
        gasto_total:    totalGasto,
        receita_total:  totalReceita,
        lucro_total:    lucroTotal,
        roas_global:    roasGlobal,
        margem_global:  margemGlobal,
        cpl_medio:      cplMedio,
        total_leads:    totalLeads,
        total_campanhas: campanhas.length,
        criado_at:      new Date().toISOString(),
      }, { onConflict: "user_id,data_snapshot" });

    if (!errSnap) snapshotsGravados++;
  }

  console.log(`✅ Snapshot diário concluído — ${hoje} — ${snapshotsGravados} usuários processados`);

  return new Response(
    JSON.stringify({
      status:    "ok",
      data:      hoje,
      usuarios:  userIds.length,
      snapshots: snapshotsGravados,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
