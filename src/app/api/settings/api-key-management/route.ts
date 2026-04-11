// src/app/api/settings/api-key-management/route.ts
// CRUD de API Keys para o Benchmark API externo.
// POST → cria nova key (retorna plain text UMA VEZ, depois só hash)
// GET  → lista keys do usuário (sem revelar o valor)

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";

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

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const key = `erzk_live_${raw}`;
  const prefix = `erzk_live_${raw.slice(0, 6)}`;
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 16);
  return { key, prefix, hash };
}

export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, plan, active, last_used_at, requests_total, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { name?: string; plan?: string };
  if (!body.name?.trim()) return NextResponse.json({ error: "name obrigatório" }, { status: 400 });

  // Máximo de 5 keys por usuário (plano free)
  const { count } = await supabase
    .from("api_keys").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("active", true);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Máximo de 5 keys ativas por conta." }, { status: 429 });
  }

  const { key, prefix, hash } = generateApiKey();

  await supabase.from("api_keys").insert({
    user_id: user.id,
    name: body.name.trim(),
    key_hash: hash,
    key_prefix: prefix,
    plan: body.plan ?? "free",
    active: true,
    created_at: new Date().toISOString(),
  });

  // Retorna a key plain text UMA ÚNICA VEZ
  return NextResponse.json({ ok: true, key, prefix });
}
