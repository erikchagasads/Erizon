import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const accessToken = process.env.FB_ACCESS_TOKEN;
    const adAccountId = process.env.FB_AD_ACCOUNT_ID;

    // Buscamos adsets para garantir que o orçamento (Budget) não venha zerado
    const fbUrl = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=name,effective_status,start_time,stop_time,daily_budget,lifetime_budget,adsets{daily_budget,lifetime_budget},insights{spend,actions}&date_preset=maximum&limit=500&access_token=${accessToken}`;
    
    const fbRes = await fetch(fbUrl);
    const fbData = await fbRes.json();

    if (fbData.error) throw new Error(fbData.error.message);

    const agora = new Date();
    const campanhasUnicas = new Map();

    fbData.data.forEach((camp: any) => {
      const insights = camp.insights?.data[0] || {};
      const statusMeta = camp.effective_status;
      const dataTermino = camp.stop_time ? new Date(camp.stop_time) : null;

      // Classificação de Status
      let statusFinal = "DESATIVADO";
      if (statusMeta === "ACTIVE") {
        statusFinal = (dataTermino && dataTermino < agora) ? "CONCLUIDO" : "ATIVO";
      } else {
        statusFinal = "DESATIVADO";
      }

      // Lógica de Orçamento (CBO ou ABO)
      let budgetRaw = parseFloat(camp.daily_budget || camp.lifetime_budget || "0");
      if (budgetRaw === 0 && camp.adsets?.data) {
        budgetRaw = camp.adsets.data.reduce((acc: number, a: any) => acc + parseFloat(a.daily_budget || a.lifetime_budget || "0"), 0);
      }

      const leads = insights.actions?.reduce((acc: number, a: any) => 
        (['lead', 'conversation', 'contact'].some(t => a.action_type.includes(t))) ? acc + parseInt(a.value) : acc, 0) || 0;

      campanhasUnicas.set(camp.name, {
        nome_campanha: camp.name,
        status: statusFinal,
        orcamento: budgetRaw / 100,
        gasto_total: parseFloat(insights.spend || "0"),
        contatos: leads,
        data_inicio: camp.start_time,
        data_atualizacao: new Date().toISOString()
      });
    });

    const payload = Array.from(campanhasUnicas.values());

    // Limpa para evitar erro de duplicata e sobe os novos
    await supabase.from("metricas_ads").delete().neq("nome_campanha", "vazio");
    if (payload.length > 0) {
      const { error } = await supabase.from("metricas_ads").insert(payload);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, count: payload.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}