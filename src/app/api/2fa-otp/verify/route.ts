/**
 * POST /api/2fa-otp/verify
 * Verifica o código OTP digitado pelo usuário.
 *
 * Body: { codigo: string; userId: string }
 * Retorna { ok: true } ou { erro: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { codigo, userId } = await req.json() as {
      codigo: string;
      userId: string;
    };

    if (!codigo || !userId) {
      return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
    }

    // Busca o OTP pendente
    const { data, error } = await supabaseAdmin
      .from("mfa_otp_pending")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ erro: "Nenhum código pendente. Solicite um novo." }, { status: 400 });
    }

    // Verifica expiração
    if (new Date(data.expira_em) < new Date()) {
      await supabaseAdmin.from("mfa_otp_pending").delete().eq("user_id", userId);
      return NextResponse.json({ erro: "Código expirado. Solicite um novo." }, { status: 400 });
    }

    // Limite de tentativas (máx. 5)
    if (data.tentativas >= 5) {
      await supabaseAdmin.from("mfa_otp_pending").delete().eq("user_id", userId);
      return NextResponse.json({ erro: "Muitas tentativas incorretas. Solicite um novo código." }, { status: 429 });
    }

    // Verifica hash
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(codigo.trim() + userId));
    const hash    = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    if (hash !== data.otp_hash) {
      // Incrementa tentativas
      await supabaseAdmin
        .from("mfa_otp_pending")
        .update({ tentativas: data.tentativas + 1 })
        .eq("user_id", userId);

      const restam = 5 - (data.tentativas + 1);
      return NextResponse.json(
        { erro: `Código incorreto. ${restam > 0 ? `${restam} tentativa${restam !== 1 ? "s" : ""} restante${restam !== 1 ? "s" : ""}.` : ""}` },
        { status: 400 }
      );
    }

    // Sucesso — marca 2FA como ativo na tabela de configurações do usuário
    await supabaseAdmin
      .from("mfa_otp_pending")
      .delete()
      .eq("user_id", userId);

    await supabaseAdmin
      .from("user_mfa_config")
      .upsert({
        user_id:  userId,
        canal:    data.canal,
        telefone: data.telefone,
        ativo:    true,
        ativado_em: new Date().toISOString(),
      }, { onConflict: "user_id" });

    return NextResponse.json({ ok: true, canal: data.canal, telefone: data.telefone });
  } catch (e: unknown) {
    console.error("[2fa-otp/verify]", e);
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Erro interno." },
      { status: 500 }
    );
  }
}
