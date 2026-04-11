// src/app/api/referral/route.ts
// GET  → retorna código e stats do usuário
// POST → registra conversão (usuário indicado se inscreveu e pagou)

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) { values.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); },
      },
    }
  );
}

// Gera código único de referral baseado no userId
function generateCode(userId: string): string {
  const short = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `ERZ-${short}`;
}

// GET /api/referral — retorna código + stats do usuário autenticado
export async function GET() {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const code = generateCode(user.id);

    // Upsert do referral record do usuário
    const { data: referral } = await supabase
      .from("referrals")
      .upsert({ user_id: user.id, code, created_at: new Date().toISOString() }, { onConflict: "user_id" })
      .select()
      .single();

    // Stats: quantos clicaram, quantos se inscreveram, quantos converteram
    const { data: clicks } = await supabase
      .from("referral_events").select("id", { count: "exact", head: true })
      .eq("referrer_code", code).eq("event", "click");

    const { data: signups } = await supabase
      .from("referral_events").select("id", { count: "exact", head: true })
      .eq("referrer_code", code).eq("event", "signup");

    const { data: conversions } = await supabase
      .from("referral_events").select("id", { count: "exact", head: true })
      .eq("referrer_code", code).eq("event", "paid");

    // Créditos acumulados: R$97 por conversão paga (valor do plano Core)
    const creditPerConversion = 97;
    const totalCredit = ((conversions as unknown as { count: number })?.count ?? 0) * creditPerConversion;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.erizonai.com.br";
    const referralLink = `${appUrl}?ref=${code}`;

    return NextResponse.json({
      code,
      referralLink,
      stats: {
        clicks: (clicks as unknown as { count: number })?.count ?? 0,
        signups: (signups as unknown as { count: number })?.count ?? 0,
        conversions: (conversions as unknown as { count: number })?.count ?? 0,
        creditBRL: totalCredit,
      },
      referral,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro" }, { status: 500 });
  }
}

// POST /api/referral — registra um evento de referral
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { referrerCode?: string; event?: string; referredUserId?: string };
    const { referrerCode, event, referredUserId } = body;

    if (!referrerCode || !event) {
      return NextResponse.json({ error: "referrerCode e event obrigatórios" }, { status: 400 });
    }

    if (!["click", "signup", "paid"].includes(event)) {
      return NextResponse.json({ error: "event deve ser: click | signup | paid" }, { status: 400 });
    }

    const supabase = await getSupabase();

    // Verifica se o código existe
    const { data: referrer } = await supabase
      .from("referrals").select("user_id").eq("code", referrerCode).maybeSingle();

    if (!referrer) {
      return NextResponse.json({ error: "Código de referral inválido" }, { status: 404 });
    }

    // Impede auto-referral
    if (referredUserId && referrer.user_id === referredUserId) {
      return NextResponse.json({ error: "Auto-referral não permitido" }, { status: 400 });
    }

    await supabase.from("referral_events").insert({
      referrer_code: referrerCode,
      referrer_user_id: referrer.user_id,
      referred_user_id: referredUserId ?? null,
      event,
      created_at: new Date().toISOString(),
    });

    // Se evento é "paid", aplica crédito no billing do referrer
    if (event === "paid") {
      await supabase.from("referral_credits").insert({
        user_id: referrer.user_id,
        amount_brl: 97,
        reason: `Indicação convertida — código ${referrerCode}`,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      // Notifica via Telegram se configurado
      const { data: settings } = await supabase
        .from("user_settings").select("telegram_chat_id").eq("user_id", referrer.user_id).maybeSingle();

      if (settings?.telegram_chat_id && process.env.TELEGRAM_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: settings.telegram_chat_id,
            text: `🎉 *Indicação convertida!*\nUm usuário que você indicou assinou o Erizon. R$97 de crédito adicionado à sua conta.`,
            parse_mode: "Markdown",
          }),
        }).catch(() => {}); // não bloqueia
      }
    }

    return NextResponse.json({ ok: true, event, referrerCode });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro" }, { status: 500 });
  }
}
