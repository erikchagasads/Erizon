// src/app/api/check-degradacao/route.ts
// Detecta campanhas saudáveis que começaram a degradar rapidamente.
// Dispara alerta Telegram ANTES de virar problema crítico.
// Rodado pelo mesmo cron-job.org que o check-alerts (ou separado).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SECRET        = process.env.CRON_SECRET;

// Janelas BRT (UTC-3) — mesmas do check-alerts para consistência
const JANELAS_BRT = [
  { inicio: 7,  fim: 9  },
  { inicio: 12, fim: 13 },
  { inicio: 17, fim: 18.5 },
];

function dentroJanelaBRT(): boolean {
  const utcHora = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  const brtHora = ((utcHora - 3) + 24) % 24;
  return JANELAS_BRT.some(j => brtHora >= j.inicio && brtHora < j.fim);
}

async function enviarTelegram(chatId: string, msg: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
  });
}

export async function POST(req: NextRequest) {
  // Valida CRON_SECRET
  const auth  = req.headers.get("authorization") ?? "";
  const force = req.nextUrl.searchParams.get("force") === "true";
  const token = auth.replace("Bearer ", "");

  if (CRON_SECRET && token !== CRON_SECRET) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  if (!force && !dentroJanelaBRT()) {
    return NextResponse.json({ pulado: true, motivo: "Fora da janela de alerta" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    // Busca todos os usuários com Telegram configurado
    const { data: configs } = await supabase
      .from("user_configs")
      .select("user_id, telegram_chat_id")
      .not("telegram_chat_id", "is", null);

    if (!configs?.length) {
      return NextResponse.json({ ok: true, alertas: 0 });
    }

    let totalAlertas = 0;

    for (const cfg of configs) {
      if (!cfg.telegram_chat_id) continue;

      // Busca snapshot de ontem e hoje para comparar velocidade de degradação
      const { data: snaps } = await supabase
        .from("metricas_snapshot_diario")
        .select("campanha_id, cpl_ontem, cpl_semana, ctr_ontem, ctr_semana")
        .eq("user_id", cfg.user_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!snaps?.length) continue;

      // Busca nomes das campanhas
      const ids = snaps.map(s => s.campanha_id).filter(Boolean);
      const { data: campanhas } = await supabase
        .from("metricas_ads")
        .select("id, nome_campanha, status")
        .in("id", ids)
        .eq("user_id", cfg.user_id)
        .in("status", ["ATIVO", "ACTIVE", "ATIVA"]);

      const nomeMap: Record<string, string> = {};
      campanhas?.forEach(c => { nomeMap[c.id] = c.nome_campanha; });

      const degradando: string[] = [];

      for (const snap of snaps) {
        const nome   = nomeMap[snap.campanha_id];
        if (!nome) continue;

        const cplOntem  = snap.cpl_ontem  ?? 0;
        const cplSemana = snap.cpl_semana ?? 0;
        const ctrOntem  = snap.ctr_ontem  ?? 0;
        const ctrSemana = snap.ctr_semana ?? 0;

        // Detecta degradação: CPL subiu >40% vs semana OU CTR caiu >40% vs semana
        const cplDegradou = cplSemana > 0 && cplOntem > 0 && (cplOntem / cplSemana) > 1.4;
        const ctrDegradou = ctrSemana > 0 && ctrOntem > 0 && (ctrOntem / ctrSemana) < 0.6;

        if (cplDegradou || ctrDegradou) {
          const motivo = cplDegradou
            ? `CPL R$${cplOntem.toFixed(0)}/d → R$${cplSemana.toFixed(0)}/sem (+${Math.round((cplOntem/cplSemana - 1)*100)}%)`
            : `CTR ${ctrOntem.toFixed(2)}% ontem vs ${ctrSemana.toFixed(2)}% semanal (−${Math.round((1 - ctrOntem/ctrSemana)*100)}%)`;

          degradando.push(`⚡ *${nome}*\n${motivo}`);
        }
      }

      if (degradando.length > 0) {
        const msg = [
          `🔻 *Erizon — Alerta de Degradação Acelerada*`,
          ``,
          `${degradando.length} campanha${degradando.length > 1 ? "s" : ""} saudável${degradando.length > 1 ? "s começaram" : " começou"} a degradar rapidamente:`,
          ``,
          ...degradando,
          ``,
          `Verifique antes de virar crítico → /dados`,
        ].join("\n");

        await enviarTelegram(cfg.telegram_chat_id, msg);
        totalAlertas += degradando.length;
      }
    }

    return NextResponse.json({ ok: true, alertas: totalAlertas });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("check-degradacao:", msg);
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}