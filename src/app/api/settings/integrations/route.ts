// GET  — lista integrações de webhook do usuário
// POST — cria/atualiza integração de webhook
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

  const { data } = await supabase
    .from("webhook_integrations")
    .select("id, platform, ativo, shop_domain, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ integrations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { platform, secret, shop_domain } = body as { platform: string; secret: string; shop_domain?: string };

  if (!platform || !secret) {
    return NextResponse.json({ error: "platform e secret são obrigatórios" }, { status: 400 });
  }

  const allowed = ["hotmart", "kirvano", "shopify", "nuvemshop"];
  if (!allowed.includes(platform)) {
    return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("webhook_integrations")
    .upsert(
      { user_id: user.id, platform, secret: secret.trim(), shop_domain: shop_domain?.trim() || null, ativo: true },
      { onConflict: "user_id,platform" }
    )
    .select("id, platform, ativo, shop_domain")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, integration: data });
}
