/**
 * api/check-alerts/route.ts — v4
 *
 * Correções v4:
 *  ① Deduplica alertas: não reenvia se já foi enviado hoje para a mesma campanha
 *  ② Verifica notification_log antes de enviar
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TELEGRAM_API = "https://api.telegram.org";

const JANELAS_BRT = [
  { label: "🌅 Manhã",  inicio: 7,    fim: 9    },
  { label: "☀️ Almoço", inicio: 12,   fim: 13   },
  { label: "🌆 Tarde",  inicio: 17,   fim: 18.5 },
];

function dentroJanela(): boolean {
  const agora   = new Date();
  const horaBRT = ((agora.getUTCHours() - 3 + 24) % 24) + agora.getUTCMinutes() / 60;
  return JANELAS_BRT.some(j => horaBRT >= j.inicio && horaBRT < j.fim);
}

function mensagemSemLeads(nome: string, gasto: number): string {
  return (
    `⚠️ *CAMPANHA SEM LEADS · ERIZON*\n\n` +
    `📢 *${nome}*\n` +
    `💸 Gasto: R$${gasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `👥 Leads: *0*\n\n` +
    `🔴 Esta campanha está queimando budget sem resultado.\n` +
    `👉 _Acesse Dados no Erizon para pausar ou ajustar._`
  );
}

function mensagemCplAlto(nome: string, cpl: number, gasto: number, leads: number): string {
  return (
    `🚨 *CPL CRÍTICO · ERIZON*\n\n` +
    `📢 *${nome}*\n` +
    `💸 CPL atual: *R$${cpl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n` +
    `💰 Gasto: R$${gasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `👥 Leads: ${leads}\n\n` +
    `⚡ _Score desta campanha é crítico. Revise criativo e segmentação no Erizon._`
  );
}

async function enviarTelegram(token: string, chatId: string, texto: string): Promise<boolean> {
  try {
    const res  = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chat_id: chatId.trim(), text: texto, parse_mode: "Markdown" }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`[check-alerts] Telegram recusou (chatId ${chatId}):`, data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[check-alerts] Erro fetch Telegram:", err);
    return false;
  }
}

export async function GET(req: Request)  { return handler(req); }
export async function POST(req: Request) { return handler(req); }

async function handler(req: Request) {
  try {
    const url   = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (
      cronSecret &&
      authHeader !== `Bearer ${cronSecret}` &&
      process.env.NODE_ENV === "production" &&
      !force
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!force && !dentroJanela()) {
      const horaBRT = ((new Date().getUTCHours() - 3 + 24) % 24).toFixed(1);
      return NextResponse.json({
        ok: true, pulado: true,
        message: `Fora das janelas. Hora BRT: ${horaBRT}h. Use ?force=true para testar.`,
      });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN não configurado." }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: campanhas, error: campErr } = await supabase
      .from("metricas_ads")
      .select("id, user_id, nome_campanha, gasto_total, contatos, status")
      .in("status", ["ATIVO", "ACTIVE", "ATIVA"])
      .gt("gasto_total", 50);

    if (campErr) {
      return NextResponse.json({ error: campErr.message }, { status: 500 });
    }

    if (!campanhas || campanhas.length === 0) {
      return NextResponse.json({ ok: true, enviados: 0, message: "Nenhuma campanha ativa com gasto." });
    }

    const alertas = campanhas
      .map(c => {
        const gasto = Number(c.gasto_total) || 0;
        const leads = Number(c.contatos)    || 0;
        const cpl   = leads > 0 ? gasto / leads : 0;

        if (leads === 0) return { ...c, tipo: "sem_leads" as const, cpl, gasto, leads };
        if (cpl > 80)    return { ...c, tipo: "cpl_alto"  as const, cpl, gasto, leads };
        return null;
      })
      .filter(Boolean) as Array<{
        id: string; user_id: string; nome_campanha: string;
        gasto: number; leads: number; cpl: number;
        tipo: "sem_leads" | "cpl_alto";
      }>;

    if (alertas.length === 0) {
      return NextResponse.json({ ok: true, enviados: 0, message: "Nenhum alerta necessário." });
    }

    // ── Deduplicação: busca alertas já enviados HOJE ──────────────────────────
    const hoje        = new Date().toISOString().slice(0, 10);
    const campaignIds = alertas.map(a => a.id);

    const { data: jaEnviados } = await supabase
      .from("notification_log")
      .select("campaign_id, tipo")
      .in("campaign_id", campaignIds)
      .gte("criado_at", `${hoje}T00:00:00.000Z`);

    // Conjunto de chaves "campaign_id|tipo" já enviadas hoje
    const jaEnviadosSet = new Set(
      (jaEnviados ?? []).map(r => `${r.campaign_id}|${r.tipo}`)
    );

    // ── Busca chat_ids ────────────────────────────────────────────────────────
    const userIds = [...new Set(alertas.map(a => a.user_id))];
    const { data: configs } = await supabase
      .from("user_configs")
      .select("user_id, telegram_chat_id")
      .in("user_id", userIds);

    const chatIdPorUser: Record<string, string> = {};
    for (const cfg of configs ?? []) {
      if (cfg.telegram_chat_id) chatIdPorUser[cfg.user_id] = cfg.telegram_chat_id;
    }

    const chatIdGlobal = process.env.TELEGRAM_CHAT_ID ?? "";

    // ── Envia apenas alertas novos ────────────────────────────────────────────
    let enviados  = 0;
    let ignorados = 0;
    const logs: { user_id: string; campaign_id: string; tipo: string; criado_at: string }[] = [];

    for (const alerta of alertas) {
      const chave = `${alerta.id}|${alerta.tipo}`;

      // Já enviou esse alerta hoje? Pula.
      if (jaEnviadosSet.has(chave)) {
        ignorados++;
        continue;
      }

      const chatId = chatIdPorUser[alerta.user_id] || chatIdGlobal;
      if (!chatId) {
        console.warn(`[check-alerts] Sem chat_id para user ${alerta.user_id}`);
        continue;
      }

      const texto = alerta.tipo === "sem_leads"
        ? mensagemSemLeads(alerta.nome_campanha, alerta.gasto)
        : mensagemCplAlto(alerta.nome_campanha, alerta.cpl, alerta.gasto, alerta.leads);

      const ok = await enviarTelegram(token, chatId, texto);
      if (ok) {
        enviados++;
        logs.push({
          user_id:     alerta.user_id,
          campaign_id: alerta.id,
          tipo:        alerta.tipo,
          criado_at:   new Date().toISOString(),
        });
      }
    }

    if (logs.length > 0) {
      await supabase.from("notification_log").insert(logs);
    }

    return NextResponse.json({
      ok:            true,
      enviados,
      ignorados,
      total_alertas: alertas.length,
      sem_leads:     alertas.filter(a => a.tipo === "sem_leads").length,
      cpl_alto:      alertas.filter(a => a.tipo === "cpl_alto").length,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[check-alerts] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}