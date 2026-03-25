/**
 * POST /api/2fa-otp/send
 * Envia código OTP de 6 dígitos via SMS ou WhatsApp (Twilio).
 *
 * Body: { telefone: string; canal: "sms" | "whatsapp"; userId: string }
 * Salva o hash do OTP + expiração em `mfa_otp_pending` no Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_FROM  = process.env.TWILIO_FROM_NUMBER!; // ex: +15551234567

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function gerarOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizarTelefone(tel: string): string {
  const digits = tel.replace(/\D/g, "");
  // Garante DDI +55 se não tiver
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  if (digits.length >= 10) return `+55${digits}`;
  return `+${digits}`;
}

export async function POST(req: NextRequest) {
  try {
    const { telefone, canal, userId } = await req.json() as {
      telefone: string;
      canal: "sms" | "whatsapp";
      userId: string;
    };

    if (!telefone || !canal || !userId) {
      return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
    }

    const numero = normalizarTelefone(telefone);
    const otp    = gerarOTP();
    const expira = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Persiste OTP (em produção use bcrypt; aqui SHA-256 simples p/ demo)
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(otp + userId));
    const hash    = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { error: dbErr } = await supabaseAdmin
      .from("mfa_otp_pending")
      .upsert({
        user_id:   userId,
        telefone:  numero,
        canal,
        otp_hash:  hash,
        expira_em: expira,
        tentativas: 0,
      }, { onConflict: "user_id" });

    if (dbErr) throw new Error(dbErr.message);

    // Monta destino Twilio (WhatsApp usa prefixo "whatsapp:")
    const to   = canal === "whatsapp" ? `whatsapp:${numero}` : numero;
    const from = canal === "whatsapp" ? `whatsapp:${TWILIO_FROM}` : TWILIO_FROM;

    const mensagem = canal === "whatsapp"
      ? `🔐 *Erizon* — Seu código de verificação é: *${otp}*\nVálido por 10 minutos. Não compartilhe com ninguém.`
      : `Erizon: seu código de verificação é ${otp}. Válido por 10 minutos.`;

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64")}`,
        },
        body: new URLSearchParams({ To: to, From: from, Body: mensagem }),
      }
    );

    if (!twilioRes.ok) {
      const err = await twilioRes.json();
      throw new Error(err.message ?? "Falha ao enviar mensagem.");
    }

    // Retorna apenas os últimos 4 dígitos do número para exibição
    const sufixo = numero.slice(-4);

    return NextResponse.json({ ok: true, sufixo, canal });
  } catch (e: unknown) {
    console.error("[2fa-otp/send]", e);
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Erro interno." },
      { status: 500 }
    );
  }
}
