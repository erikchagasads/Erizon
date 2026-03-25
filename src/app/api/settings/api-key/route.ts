// POST — gera ou regera API key do usuário
// GET  — retorna a API key atual (mascarada)
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (v) => v.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }) } }
  );
}

export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase.from("user_settings").select("api_key").eq("user_id", user.id).maybeSingle();
  const key = data?.api_key ?? null;

  return NextResponse.json({
    has_key: !!key,
    // Mostra apenas os últimos 4 caracteres para segurança
    masked: key ? `erizon_${"•".repeat(20)}${key.slice(-4)}` : null,
  });
}

export async function POST() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gera token seguro: prefixo + 32 bytes hex
  const newKey = `erizon_${crypto.randomBytes(32).toString("hex")}`;

  await supabase.from("user_settings").upsert(
    { user_id: user.id, api_key: newKey },
    { onConflict: "user_id" }
  );

  // Retorna a key completa APENAS neste momento (única vez)
  return NextResponse.json({ api_key: newKey, message: "Copie agora — não será exibida novamente." });
}
