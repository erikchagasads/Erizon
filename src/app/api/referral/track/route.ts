// src/app/api/referral/track/route.ts
// Chamado no middleware quando usuário acessa /?ref=ERZ-XXXXXXXX
// Registra o click e salva o código em cookie para conversão posterior.

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const event = searchParams.get("event") ?? "click";

  if (!code) return NextResponse.json({ error: "code obrigatório" }, { status: 400 });

  // Registra o evento via API interna
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await fetch(`${baseUrl}/api/referral`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ referrerCode: code, event }),
  }).catch(() => {});

  const res = NextResponse.json({ ok: true, code, event });

  // Salva cookie por 30 dias para atribuição na conversão
  if (event === "click") {
    res.cookies.set("erizon_ref", code, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return res;
}
