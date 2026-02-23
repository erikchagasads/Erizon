/**
 * src/app/api/check-alerts/route.ts
 *
 * FIX: Adicionado tratamento seguro de body para evitar
 * "Unexpected end of JSON input" quando chamado sem body (GET ou POST vazio).
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const TELEGRAM_API = "https://api.telegram.org";

function formatarMensagem(alerta: {
  nome_campanha: string;
  tipo_alerta: string;
  cpl: number;
  gasto_total: number;
  contatos: number;
}): string {
  const { nome_campanha, tipo_alerta, cpl, gasto_total, contatos } = alerta;
  const gastoBRL = Number(gasto_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const cplBRL   = Number(cpl).toLocaleString("pt-BR",         { minimumFractionDigits: 2 });

  if (tipo_alerta === "cpl_alto") {
    return (
      `🚨 *ALERTA: CPL CRÍTICO*\n\n` +
      `📢 *Campanha:* ${nome_campanha}\n` +
      `💸 *CPL Atual:* R$ ${cplBRL}\n` +
      `💰 *Gasto Total:* R$ ${gastoBRL}\n` +
      `👥 *Leads:* ${contatos}\n\n` +
      `⚡ _Acesse o Pulse para otimizar ou pausar esta campanha._`
    );
  }
  if (tipo_alerta === "sem_leads") {
    return (
      `⚠️ *ALERTA: CAMPANHA SEM LEADS*\n\n` +
      `📢 *Campanha:* ${nome_campanha}\n` +
      `💰 *Gasto Total:* R$ ${gastoBRL}\n` +
      `👥 *Leads:* 0\n\n` +
      `⚡ _Esta campanha está gastando sem gerar resultados._`
    );
  }
  return (
    `🔔 *ALERTA ERIZON*\n\n` +
    `📢 *Campanha:* ${nome_campanha}\n` +
    `💰 *Gasto:* R$ ${gastoBRL} | *Leads:* ${contatos}\n\n` +
    `⚡ _Verifique o painel Pulse._`
  );
}

async function enviarTelegram(token: string, chatId: string, texto: string): Promise<boolean> {
  try {
    const res  = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "Markdown" }),
    });
    const data = await res.json();
    if (!data.ok) { console.error("Telegram erro:", data.description); return false; }
    return true;
  } catch (err: unknown) {
    console.error("Telegram fetch erro:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function GET(req: Request)  { return handler(req); }
export async function POST(req: Request) { return handler(req); }

async function handler(req: Request) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN não configurado." }, { status: 500 });
    }

    // ── Determina se é cron ou frontend ──────────────────────────────────
    const isCron = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

    let userId: string | null = null;

    if (!isCron) {
      const cookieStore = await cookies();
      const supabaseAuth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
      );
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
      }
      userId = user.id;
    }

    // ── Service role para buscar dados ────────────────────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const rpc = supabase.rpc(
      "get_campanhas_em_alerta",
      userId ? { p_user_id: userId } : {}
    );
    const { data: alertas, error: rpcError } = await rpc;

    if (rpcError) {
      console.error("Erro RPC alertas:", rpcError.message);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (!alertas || alertas.length === 0) {
      return NextResponse.json({ success: true, enviados: 0, message: "Nenhum alerta pendente." });
    }

    let enviados = 0;
    const logsParaInserir: { user_id: string; campaign_id: string; tipo: string }[] = [];

    for (const alerta of alertas) {
      const chatId = alerta.chat_id || process.env.TELEGRAM_CHAT_ID;
      if (!chatId) {
        console.warn(`Usuário ${alerta.user_id} sem chat_id configurado — alerta ignorado.`);
        continue;
      }

      const mensagem = formatarMensagem(alerta);
      const ok       = await enviarTelegram(token, chatId, mensagem);

      if (ok) {
        enviados++;
        logsParaInserir.push({
          user_id:     alerta.user_id,
          campaign_id: alerta.campaign_id,
          tipo:        alerta.tipo_alerta,
        });
      }
    }

    if (logsParaInserir.length > 0) {
      const { error: logError } = await supabase.from("notification_log").insert(logsParaInserir);
      if (logError) console.error("Erro ao salvar notification_log:", logError.message);
    }

    return NextResponse.json({ success: true, enviados, total_alertas: alertas.length });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno.";
    console.error("Erro em check-alerts:", msg);
    return NextResponse.json({ error: "Erro interno ao verificar alertas." }, { status: 500 });
  }
}