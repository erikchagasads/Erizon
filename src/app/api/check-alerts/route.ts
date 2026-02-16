import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  // 1. Trava de Segurança para o Cron Job
  const authHeader = req.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Não autorizado', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const hoje = new Date().toISOString().split('T')[0];
    const { data: metricas } = await supabase
      .from("metricas_ads")
      .select("*, clientes_config(nome_cliente)")
      .eq("data_referencia", hoje);

    if (!metricas || metricas.length === 0) return NextResponse.json({ message: "Sem dados." });

    const alertasSalvar = [];
    const mensagensTelegram: string[] = [];

    for (const m of metricas) {
      const nome = m.clientes_config?.nome_cliente || "Cliente";

      // Lógica de Alerta: CPA > 40 ou Frequência > 1.8
      if (m.cpa > 40 || m.frequencia > 1.8) {
        const motivo = m.cpa > 40 ? `CPA ALTO: R$${m.cpa.toFixed(2)}` : `FREQ ALTA: ${m.frequencia}`;
        
        mensagensTelegram.push(`🚨 *ALERTA ERIZON*\nCliente: ${nome}\nCampanha: ${m.nome_campanha}\nMotivo: ${motivo}`);
        
        alertasSalvar.push({
          cliente_id: m.cliente_id,
          tipo: m.cpa > 40 ? 'cpa_alto' : 'frequencia_alta',
          nivel: m.cpa > 40 ? 'critico' : 'atencao',
          mensagem: `${motivo} em ${m.nome_campanha}`
        });
      }
    }

    if (alertasSalvar.length > 0) {
      await supabase.from("alertas_inteligentes").insert(alertasSalvar);
      
      // Envia para o seu Telegram
      for (const msg of mensagensTelegram) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' })
        });
      }
    }

    return NextResponse.json({ alerts_sent: mensagensTelegram.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}