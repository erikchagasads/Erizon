// POST /api/cockpit/decisions/[id]/reject

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
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cockpit = new CockpitService(supabase as unknown as SupabaseClient);
    try {
      const decision = await cockpit.reject(params.id, user.id);
      return NextResponse.json({ ok: true, decision });
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : "Erro ao rejeitar";
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return NextResponse.json({ ok: false, error: "Tabelas do cockpit não configuradas." }, { status: 503 });
      }
      throw dbErr;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
