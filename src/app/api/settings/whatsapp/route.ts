import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { WhatsAppCopilotService } from "@/services/whatsapp-copilot-service";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) =>
          values.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {}
          }),
      },
    }
  );
}

function maskSecret(value: string | null) {
  if (!value) return null;
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export async function GET() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServerSupabase();
  const { data } = await db
    .from("whatsapp_copilot_sessions")
    .select("phone_number, instance_name, api_base_url, api_key, ativo, briefing_hora")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    config: data
      ? {
          phone_number: data.phone_number,
          instance_name: data.instance_name,
          api_base_url: data.api_base_url,
          ativo: data.ativo,
          briefing_hora: data.briefing_hora ?? 7,
          api_key_masked: maskSecret(data.api_key),
          has_api_key: !!data.api_key,
        }
      : null,
  });
}

export async function PUT(req: NextRequest) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { phone_number, instance_name, api_base_url, api_key, ativo, briefing_hora } = body as {
    phone_number: string;
    instance_name: string;
    api_base_url?: string | null;
    api_key?: string;
    ativo?: boolean;
    briefing_hora?: number;
  };

  if (!phone_number?.trim() || !instance_name?.trim()) {
    return NextResponse.json({ error: "phone_number e instance_name sao obrigatorios." }, { status: 400 });
  }

  const db = createServerSupabase();
  const { data: wm } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const existing = await db
    .from("whatsapp_copilot_sessions")
    .select("api_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const keyToStore = api_key?.trim() || existing.data?.api_key;
  if (!keyToStore) {
    return NextResponse.json({ error: "api_key e obrigatoria na primeira configuracao." }, { status: 400 });
  }

  const { error } = await db.from("whatsapp_copilot_sessions").upsert(
    {
      user_id: user.id,
      workspace_id: wm?.workspace_id ?? null,
      phone_number: phone_number.trim(),
      instance_name: instance_name.trim(),
      api_base_url: api_base_url?.trim() || null,
      api_key: keyToStore,
      ativo: ativo ?? false,
      briefing_hora: typeof briefing_hora === "number" ? briefing_hora : 7,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const svc = new WhatsAppCopilotService();
    await svc.sendTest(user.id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao testar WhatsApp." },
      { status: 500 }
    );
  }
}
