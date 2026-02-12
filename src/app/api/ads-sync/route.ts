import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const adAccountId = process.env.FB_AD_ACCOUNT_ID;
  const accessToken = process.env.FB_ACCESS_TOKEN;

  try {
    // Buscamos apenas campos seguros que não dão erro
    const fbUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=spend,cpc,ctr,actions&date_preset=today&access_token=${accessToken}`;
    
    const fbRes = await fetch(fbUrl);
    const fbData = await fbRes.json();

    if (fbData.error) {
      return NextResponse.json({ error: fbData.error.message }, { status: 400 });
    }

    // Se não houver dados hoje, retornamos valores zerados
    const insight = fbData.data?.[0] || { spend: 0, ctr: 0 };
    
    // Filtramos as compras (purchase) dentro do array de ações
    const conversions = insight.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
    const spend = parseFloat(insight.spend || 0);
    
    // Calculamos o CPA aqui no código para evitar o erro do Facebook
    const calculatedCpa = conversions > 0 ? (spend / conversions).toFixed(2) : "0.00";

    const payload = {
      nome_campanha: "Geral (Conta)",
      gasto_total: spend,
      cpa: parseFloat(calculatedCpa),
      ctr: parseFloat(insight.ctr || 0),
      conversoes: parseInt(conversions),
      plataforma: 'meta'
    };

    const { error } = await supabase.from('metricas_ads').insert([payload]);
    if (error) throw error;

    return NextResponse.json({ status: "Sincronizado", data: payload });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}