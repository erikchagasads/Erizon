// POST /api/cockpit/decisions/[id]/approve

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { CockpitService } from "@/services/cockpit-service";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) {
          values.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch {}
          });
        },
      },
    }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const overrideValue = body.override_value ? Number(body.override_value) : undefined;

    // Busca token de acesso do usuário para executar no Meta
    const { data: settings } = await supabase
      .from("user_settings")
      .select("access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    const cockpit = new CockpitService(supabase as unknown as SupabaseClient);
    try {
      const result = await cockpit.approve(
        id,
        user.id,
        settings?.access_token ?? "",
        overrideValue
      );
      return NextResponse.json(result);
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : "Erro ao aprovar";
      // Se tabela não existe ainda, retorna ok=false mas não 500
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json({ ok: false, error: "Tabelas do cockpit não configuradas. Execute a migration." }, { status: 503 });
      }
      throw dbErr;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
