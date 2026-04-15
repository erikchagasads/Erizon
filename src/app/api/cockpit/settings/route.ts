// GET /api/cockpit/settings?workspaceId=xxx  → busca configuração de autopiloto
// PUT /api/cockpit/settings                  → atualiza configuração

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

const defaultConfig = (workspaceId: string) => ({
  workspace_id: workspaceId,
  autopilot_enabled: false,
  auto_pause: false,
  auto_resume: false,
  auto_scale_budget: false,
  auto_reduce_budget: false,
  shield_max_spend_brl: 500,
  max_auto_actions_day: 3,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId obrigatório" }, { status: 400 });

    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const cockpit = new CockpitService(supabase as unknown as SupabaseClient);
      const config = await cockpit.getConfig(workspaceId);
      if (!config) {
        return NextResponse.json({
          config: defaultConfig(workspaceId),
          persisted: false,
          source: "default",
        });
      }

      return NextResponse.json({
        config,
        persisted: true,
        source: "database",
      });
    } catch (dbErr) {
      console.error("[cockpit/settings GET] DB not ready:", dbErr);
      return NextResponse.json(
        { error: "Configuração do cockpit indisponível no banco." },
        { status: 503 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.workspace_id) return NextResponse.json({ error: "workspace_id obrigatório" }, { status: 400 });

    try {
      const cockpit = new CockpitService(supabase as unknown as SupabaseClient);
      const config = await cockpit.updateConfig({ ...body, updated_by: user.id });
      return NextResponse.json({ config, persisted: true, source: "database" });
    } catch (dbErr) {
      console.error("[cockpit/settings PUT] DB not ready:", dbErr);
      // Retorna o body como se tivesse salvo (tabela ainda não existe)
      return NextResponse.json(
        { error: "Não foi possível persistir a configuração do cockpit." },
        { status: 503 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
