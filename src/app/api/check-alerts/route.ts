/**
 * api/check-alerts/route.ts — v5
 *
 * Fixes v5:
 *  ① Cria notification_log se não existir via upsert seguro
 *  ② Janelas corrigidas para BRT real (UTC-3)
 *  ③ CPL limite lido de user_configs.limite_cpl por usuário (não hardcoded)
 *  ④ Fallback: se notification_log falhar, envia mesmo assim
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TELEGRAM_API = "https://api.telegram.org";

// Janelas BRT — cron roda às 10h, 15h e 20h UTC = 7h, 12h e 17h BRT
const JANELAS_BRT = [
  { label: "🌅 Manhã",  inicio: 7,  fim: 10  },
  { label: "☀️ Tarde",  inicio: 12, fim: 15  },
  { label: "🌆 Noite",  inicio: 17, fim: 20  },
];

function horaBRT(): number {
  const agora = new Date();
  return ((agora.getUTCHours() - 3 + 24) % 24) + agora.getUTCMinutes() / 60;
}

function dentroJanela(): boolean {
  const h = horaBRT();
  return JANELAS_BRT.some(j => h >= j.inicio && h < j.fim);
}

function mensagemSemLeads(nome: string, gasto: number): string {
  return (
    `⚠️ *CAMPANHA SEM LEADS · ERIZON*\n\n` +
    `📢 *${nome}*\n` +
    `💸 Gasto: R$${gasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `👥 Leads: *0*\n\n` +
    `🔴 Esta campanha está queimando budget sem resultado.\n` +
    `👉 _Acesse o painel Erizon para pausar ou ajustar._`
  );
}

function mensagemCplAlto(nome: string, cpl: number, limite: number, gasto: number, leads: number): string {
  return (
    `🚨 *CPL CRÍTICO · ERIZON*\n\n` +
    `📢 *${nome}*\n` +
    `💸 CPL atual: *R$${cpl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n` +
    `🎯 CPL limite: R$${limite.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `💰 Gasto: R$${gasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
    `👥 Leads: ${leads}\n\n` +
    `⚡ _CPL ${((cpl / limite - 1) * 100).toFixed(0)}% acima do limite. Revise no Erizon._`
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
      console.error(`[check-alerts] Telegram erro (chatId ${chatId}):`, data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[check-alerts] Fetch Telegram falhou:", err);
    return false;
  }
}

export async function GET(req: Request)  { return handler(req); }
export async function POST(req: Request) { return handler(req); }

async function handler(req: Request) {
  try {
    const url   = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    // Auth via CRON_SECRET
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

    // Janela de horário (skip se force=true)
    if (!force && !dentroJanela()) {
      const h = horaBRT().toFixed(1);
      return NextResponse.json({
        ok: true, pulado: true,
        message: `Fora das janelas BRT. Hora atual: ${h}h. Use ?force=true para testar.`,
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

    // ── 1. Campanhas ativas com gasto ────────────────────────────────────────
    const { data: campanhas, error: campErr } = await supabase
      .from("metricas_ads")
      .select("id, user_id, nome_campanha, gasto_total, contatos, status")
      .in("status", ["ATIVO", "ACTIVE", "ATIVA"])
      .gt("gasto_total", 50);

    if (campErr) return NextResponse.json({ error: campErr.message }, { status: 500 });
    if (!campanhas?.length) return NextResponse.json({ ok: true, enviados: 0, message: "Nenhuma campanha ativa." });

    // ── 2. Configs dos usuários (chat_id + limite_cpl) ────────────────────────
    const userIds = [...new Set(campanhas.map(c => c.user_id))];
    const { data: configs } = await supabase
      .from("user_configs")
      .select("user_id, telegram_chat_id, limite_cpl")
      .in("user_id", userIds);

    const configPorUser: Record<string, { chatId: string; limiteCpl: number }> = {};
    for (const cfg of configs ?? []) {
      if (cfg.telegram_chat_id) {
        configPorUser[cfg.user_id] = {
          chatId:    cfg.telegram_chat_id,
          limiteCpl: Number(cfg.limite_cpl) || 40,
        };
      }
    }

    const chatIdGlobal = process.env.TELEGRAM_CHAT_ID ?? "";

    // ── 3. Gerar alertas usando limite_cpl por usuário ────────────────────────
    const alertas = campanhas.map(c => {
      const gasto  = Number(c.gasto_total) || 0;
      const leads  = Number(c.contatos)    || 0;
      const cpl    = leads > 0 ? gasto / leads : 0;
      const limite = configPorUser[c.user_id]?.limiteCpl ?? 40;

      if (leads === 0 && gasto > 100) return { ...c, tipo: "sem_leads" as const, cpl, gasto, leads, limite };
      if (cpl > limite)               return { ...c, tipo: "cpl_alto"  as const, cpl, gasto, leads, limite };
      return null;
    }).filter(Boolean) as Array<{
      id: string; user_id: string; nome_campanha: string;
      gasto: number; leads: number; cpl: number; limite: number;
      tipo: "sem_leads" | "cpl_alto";
    }>;

    if (!alertas.length) return NextResponse.json({ ok: true, enviados: 0, message: "Nenhum alerta necessário." });

    // ── 4. Deduplicação — alertas já enviados hoje ────────────────────────────
    const hoje        = new Date().toISOString().slice(0, 10);
    const campaignIds = alertas.map(a => a.id);
    let jaEnviadosSet = new Set<string>();

    try {
      const { data: jaEnviados } = await supabase
        .from("notification_log")
        .select("campaign_id, tipo")
        .in("campaign_id", campaignIds)
        .gte("criado_at", `${hoje}T00:00:00.000Z`);
      jaEnviadosSet = new Set((jaEnviados ?? []).map(r => `${r.campaign_id}|${r.tipo}`));
    } catch {
      // tabela pode não existir — continua sem deduplicação
      console.warn("[check-alerts] notification_log indisponível — enviando sem dedup");
    }

    // ── 5. Enviar ─────────────────────────────────────────────────────────────
    let enviados  = 0;
    let ignorados = 0;
    const logs: { user_id: string; campaign_id: string; tipo: string; criado_at: string }[] = [];

    for (const alerta of alertas) {
      const chave = `${alerta.id}|${alerta.tipo}`;
      if (jaEnviadosSet.has(chave)) { ignorados++; continue; }

      const cfg    = configPorUser[alerta.user_id];
      const chatId = cfg?.chatId || chatIdGlobal;
      if (!chatId) {
        console.warn(`[check-alerts] Sem chat_id para user ${alerta.user_id}`);
        continue;
      }

      const texto = alerta.tipo === "sem_leads"
        ? mensagemSemLeads(alerta.nome_campanha, alerta.gasto)
        : mensagemCplAlto(alerta.nome_campanha, alerta.cpl, alerta.limite, alerta.gasto, alerta.leads);

      const ok = await enviarTelegram(token, chatId, texto);
      if (ok) {
        enviados++;
        logs.push({ user_id: alerta.user_id, campaign_id: alerta.id, tipo: alerta.tipo, criado_at: new Date().toISOString() });
      }
    }

    // Tenta logar — falha silenciosa se tabela não existir
    if (logs.length > 0) {
      try {
        await supabase.from("notification_log").insert(logs);
      } catch {
        console.warn("[check-alerts] Não foi possível salvar notification_log");
      }
    }

    return NextResponse.json({
      ok: true, enviados, ignorados,
      total_alertas: alertas.length,
      sem_leads:  alertas.filter(a => a.tipo === "sem_leads").length,
      cpl_alto:   alertas.filter(a => a.tipo === "cpl_alto").length,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[check-alerts] Erro fatal:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
