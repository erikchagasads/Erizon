import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("blog_newsletter_subscribers")
    .upsert({
      email,
      status: "active",
      source: "blog",
      updated_at: now,
      unsubscribed_at: null,
    }, { onConflict: "email" });

  if (error) {
    return NextResponse.json({ error: "Não foi possível entrar na lista agora." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Inscrição confirmada. Você receberá os próximos artigos da Erizon." });
}

