import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";

async function getSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(values) {
          values.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {}
          });
        },
      },
    }
  );
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const key = `erzk_live_${raw}`;
  const prefix = `erzk_live_${raw.slice(0, 6)}`;
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

export async function GET() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, plan, active, last_used_at, requests_total, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message || "Erro ao carregar API keys." }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string; plan?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name obrigatorio" }, { status: 400 });
  }

  const { count, error: countError } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("active", true);

  if (countError) {
    return NextResponse.json({ error: countError.message || "Erro ao validar limite de keys." }, { status: 500 });
  }

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Maximo de 5 keys ativas por conta." }, { status: 429 });
  }

  const { key, prefix, hash } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    user_id: user.id,
    name: body.name.trim(),
    key_hash: hash,
    key_prefix: prefix,
    plan: body.plan ?? "free",
    active: true,
    created_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message || "Erro ao criar API key." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, key, prefix });
}
