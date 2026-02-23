// supabase/functions/monitor-campanhas/index.ts
//
// Deploy:
//   supabase functions deploy monitor-campanhas --no-verify-jwt
//
// Cron (supabase/config.toml):
//   [functions.monitor-campanhas]
//   schedule = "0 */0 * * *"   ← roda a cada 6 horas
//
// Variáveis necessárias no Supabase Dashboard → Settings → Edge Functions:
//   OPENAI_API_KEY  ou  GROQ_API_KEY
//   TELEGRAM_BOT_TOKEN

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Campanha {
  id: string;
  user_id: string;
  nome_campanha: string;
  status: string;
  gasto_total: number;
  contatos: number;
  orcamento: number;
  impressoes: number;
  alcance: number;
  data_inicio: string;
}

interface UserConfig {
  user_id: string;
  limite_cpl: number | null;
  telegram_chat_id: string | null;
}

interface Alerta {
  user_id: string;
  campanha_id: string;
  campanha_nome: string;
  tipo: string;
  severidade: "critica" | "alta" | "media";
  titulo: string;
  descricao: string;
  valor_atual: number;
  valor_limite: number | null;
  acao_sugerida: string;
  criado_em: string;
}

// ─── Análise de uma campanha ──────────────────────────────────────────────────
function analisarCampanha(c: Campanha, config: UserConfig): Alerta[] {
  const alertas: Alerta[] = [];
  const agora = new Date().toISOString();
  const cpl   = c.contatos > 0 ? c.gasto_total / c.contatos : 0;
  const freq  = c.alcance  > 0 ? c.impressoes  / c.alcance  : 0;
  const pctGasto = c.orcamento > 0 ? (c.gasto_total / c.orcamento) * 100 : 0;

  // 1. CPL acima do limite definido pelo usuário
  if (config.limite_cpl && cpl > config.limite_cpl && c.contatos > 0) {
    const excesso = (((cpl - config.limite_cpl) / config.limite_cpl) * 100).toFixed(0);
    alertas.push({
      user_id: c.user_id,
      campanha_id: c.id,
      campanha_nome: c.nome_campanha,
      tipo: "cpl_elevado",
      severidade: cpl > config.limite_cpl * 1.5 ? "critica" : "alta",
      titulo: `CPL ${excesso}% acima do limite`,
      descricao: `CPL atual: R$ ${cpl.toFixed(2)} | Limite: R$ ${config.limite_cpl.toFixed(2)}`,
      valor_atual: cpl,
      valor_limite: config.limite_cpl,
      acao_sugerida: "Pausar campanha ou revisar segmentação e criativo.",
      criado_em: agora,
    });
  }

  // 2. Budget quase esgotado (>90%)
  if (pctGasto > 90 && c.status === "ATIVO") {
    alertas.push({
      user_id: c.user_id,
      campanha_id: c.id,
      campanha_nome: c.nome_campanha,
      tipo: "budget_critico",
      severidade: pctGasto > 98 ? "critica" : "alta",
      titulo: `Budget ${pctGasto.toFixed(0)}% consumido`,
      descricao: `Gasto: R$ ${c.gasto_total.toFixed(2)} de R$ ${c.orcamento.toFixed(2)}`,
      valor_atual: pctGasto,
      valor_limite: 90,
      acao_sugerida: "Aumentar budget ou preparar nova campanha.",
      criado_em: agora,
    });
  }

  // 3. Frequência alta (>3.5x) — saturação de audiência
  if (freq > 3.5 && c.status === "ATIVO") {
    alertas.push({
      user_id: c.user_id,
      campanha_id: c.id,
      campanha_nome: c.nome_campanha,
      tipo: "frequencia_alta",
      severidade: freq > 5 ? "alta" : "media",
      titulo: `Frequência ${freq.toFixed(1)}× — audiência saturando`,
      descricao: `Impressões: ${c.impressoes.toLocaleString()} | Alcance: ${c.alcance.toLocaleString()}`,
      valor_atual: freq,
      valor_limite: 3.5,
      acao_sugerida: "Expandir público ou trocar criativo para reduzir fadiga.",
      criado_em: agora,
    });
  }

  // 4. Campanha ativa sem leads (possível problema de pixel/landing)
  const diasAtiva = Math.ceil(
    (Date.now() - new Date(c.data_inicio).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (c.status === "ATIVO" && c.contatos === 0 && diasAtiva >= 3 && c.gasto_total > 50) {
    alertas.push({
      user_id: c.user_id,
      campanha_id: c.id,
      campanha_nome: c.nome_campanha,
      tipo: "zero_leads",
      severidade: "critica",
      titulo: `${diasAtiva} dias ativa sem nenhum lead`,
      descricao: `Gasto acumulado: R$ ${c.gasto_total.toFixed(2)} sem conversão.`,
      valor_atual: 0,
      valor_limite: 1,
      acao_sugerida: "Verificar pixel, landing page e segmentação imediatamente.",
      criado_em: agora,
    });
  }

  return alertas;
}

// ─── Insight IA via Groq ──────────────────────────────────────────────────────
async function gerarInsightIA(alertas: Alerta[]): Promise<string> {
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) return "";

  const prompt = `Você é analista sênior de tráfego pago. Em UMA frase curta e direta (máximo 15 palavras), diga qual é a ação mais urgente baseada nesses alertas. Sem introdução, sem formatação, só a frase.

ALERTAS:
${alertas.map(a => `${a.campanha_nome}: ${a.titulo} (${a.severidade})`).join("\n")}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 60,
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch (e) {
    console.error("Erro Groq:", e);
    return "";
  }
}

// ─── Formata mensagem HTML para Telegram ──────────────────────────────────────
async function formatarMensagemTelegram(alertas: Alerta[]): Promise<string> {
  const criticos = alertas.filter(a => a.severidade === "critica");
  const altos    = alertas.filter(a => a.severidade === "alta");
  const medios   = alertas.filter(a => a.severidade === "media");
  const insight  = await gerarInsightIA(alertas);

  const linhas: string[] = [];

  linhas.push(`📊 <b>Erizon Growth OS</b>`);
  linhas.push(`<i>${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</i>`);
  linhas.push(``);

  if (insight) {
    linhas.push(`💡 <b>Ação urgente:</b> ${insight}`);
    linhas.push(``);
  }

  if (criticos.length > 0) {
    linhas.push(`🔴 <b>CRÍTICO (${criticos.length})</b>`);
    criticos.forEach(a => {
      linhas.push(`├ <b>${a.campanha_nome}</b>`);
      linhas.push(`├ ${a.titulo}`);
      linhas.push(`└ <i>↳ ${a.acao_sugerida}</i>`);
      linhas.push(``);
    });
  }

  if (altos.length > 0) {
    linhas.push(`🟠 <b>ATENÇÃO (${altos.length})</b>`);
    altos.forEach(a => {
      linhas.push(`├ <b>${a.campanha_nome}</b>`);
      linhas.push(`└ ${a.titulo}`);
      linhas.push(``);
    });
  }

  if (medios.length > 0) {
    linhas.push(`🟡 <b>MONITORAR (${medios.length})</b>`);
    medios.forEach(a => {
      linhas.push(`• <b>${a.campanha_nome}</b> — ${a.titulo}`);
    });
    linhas.push(``);
  }

  linhas.push(`<a href="https://erizon.vercel.app/pulse">→ Abrir Pulse Dashboard</a>`);

  return linhas.join("\n");
}

// ─── Telegram ─────────────────────────────────────────────────────────────────
async function enviarTelegram(chatId: string, mensagem: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) { console.warn("TELEGRAM_BOT_TOKEN não configurado"); return; }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: mensagem,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json();
  if (!data.ok) console.error("Erro Telegram:", JSON.stringify(data));
  else console.log("📱 Telegram enviado com sucesso");
}

// ─── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async () => {
  console.log("🔍 Monitor iniciado —", new Date().toISOString());

  try {
    // 1. Busca todos os usuários com configuração ativa
    const { data: configs, error: configError } = await supabase
      .from("user_configs")
      .select("user_id, limite_cpl, telegram_chat_id");

    if (configError) throw configError;
    if (!configs || configs.length === 0) {
      console.log("Nenhum usuário configurado.");
      return new Response("ok — sem usuários", { status: 200 });
    }

    let totalAlertas = 0;

    for (const config of configs as UserConfig[]) {
      // 2. Busca campanhas ativas do usuário
      const { data: campanhas } = await supabase
        .from("metricas_ads")
        .select("*")
        .eq("user_id", config.user_id)
        .in("status", ["ATIVO", "ACTIVE", "ATIVA"]);

      if (!campanhas || campanhas.length === 0) continue;

      // 3. Analisa cada campanha
      const todosAlertas: Alerta[] = [];
      for (const campanha of campanhas as Campanha[]) {
        const alertas = analisarCampanha(campanha, config);
        todosAlertas.push(...alertas);
      }

      if (todosAlertas.length === 0) {
        console.log(`✅ user ${config.user_id} — sem alertas`);
        continue;
      }

      totalAlertas += todosAlertas.length;

      // 4. Persiste alertas no banco (evita duplicatas via upsert)
      const { error: insertError } = await supabase
        .from("alertas_campanhas")
        .insert(
          todosAlertas.map(a => ({
            ...a,
            resolvido: false,
          }))
        );

      if (insertError) console.error("Erro ao inserir alertas:", insertError);

      // 5. Registra no histórico de decisões
      const decisoes = todosAlertas
        .filter(a => a.severidade === "critica" || a.severidade === "alta")
        .map(a => ({
          user_id: config.user_id,
          data: new Date().toLocaleDateString("pt-BR"),
          acao: `Alerta automático: ${a.tipo}`,
          campanha: a.campanha_nome,
          impacto: a.titulo,
        }));

      if (decisoes.length > 0) {
        await supabase.from("decisoes_historico").insert(decisoes);
      }

      // 6. Envia notificação Telegram se configurado
      if (config.telegram_chat_id) {
        const alertasCriticos = todosAlertas.filter(
          a => a.severidade === "critica" || a.severidade === "alta"
        );

        if (alertasCriticos.length > 0) {
          const mensagem = await formatarMensagemTelegram(alertasCriticos);
          await enviarTelegram(config.telegram_chat_id, mensagem);
          console.log(`📱 Telegram enviado para ${config.user_id}`);
        }
      }

      console.log(`⚠️ user ${config.user_id} — ${todosAlertas.length} alerta(s) gerado(s)`);
    }

    return new Response(
      JSON.stringify({ status: "ok", alertas_gerados: totalAlertas, timestamp: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro crítico no monitor:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});