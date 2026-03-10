import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

async function enviarTelegram(chatId: string, mensagem: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: mensagem,
      parse_mode: "HTML"
    })
  });
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar todos os usuários com limite de CPL e telegram configurado
    const { data: configs } = await supabase
      .from("user_configs")
      .select("user_id, limite_cpl, telegram_chat_id")
      .not("limite_cpl", "is", null)
      .not("telegram_chat_id", "is", null);

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ ok: true, mensagem: "Nenhum usuário configurado" }), { status: 200 });
    }

    for (const config of configs) {
      // Buscar campanhas ATIVAS do usuário
      const { data: campanhas } = await supabase
        .from("metricas_ads")
        .select("nome_campanha, gasto_total, contatos, status")
        .eq("user_id", config.user_id)
        .eq("status", "ATIVO")
        .gt("contatos", 0);

      if (!campanhas) continue;

      // Filtrar campanhas acima do limite
      const alertas = campanhas.filter(c => (c.gasto_total / c.contatos) > config.limite_cpl);

      if (alertas.length === 0) continue;

      // Montar mensagem
      let mensagem = `⚠️ <b>ALERTA DE CPL — GROWTH OS</b>\n\n`;
      mensagem += `${alertas.length} campanha(s) acima do limite de <b>R$ ${config.limite_cpl.toFixed(2)}</b>\n\n`;

      for (const c of alertas) {
        const cplAtual = (c.gasto_total / c.contatos).toFixed(2);
        const excesso = (((c.gasto_total / c.contatos) - config.limite_cpl) / config.limite_cpl * 100).toFixed(0);
        mensagem += `🔴 <b>${c.nome_campanha}</b>\n`;
        mensagem += `   CPL Atual: <b>R$ ${cplAtual}</b> (+${excesso}% acima do limite)\n\n`;
      }

      mensagem += `📊 Acesse o dashboard para mais detalhes.`;

      await enviarTelegram(config.telegram_chat_id, mensagem);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ erro: String(e) }), { status: 500 });
  }
});