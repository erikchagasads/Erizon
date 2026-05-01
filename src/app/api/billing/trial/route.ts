import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();

  // ── 1. Garantir subscription de trial ────────────────────────────────────
  const { data: existing } = await admin
    .from("subscriptions")
    .select("plano, status, trial_end, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  let subscription = existing;

  if (!existing) {
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const newSub = {
      user_id: user.id,
      plano: "pro",
      status: "trialing",
      trial_end: trialEnd,
      current_period_end: trialEnd,
    };

    const { error: insertError } = await admin
      .from("subscriptions")
      .insert(newSub);

    if (insertError) {
      console.error("[trial] Erro ao criar subscription:", insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    subscription = newSub;
  }

  // ── 2. Garantir workspace ─────────────────────────────────────────────────
  const { data: wsExisting } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  let workspaceId = wsExisting?.id;

  if (!wsExisting) {
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Meu Workspace";

    const { data: ws, error: wsError } = await admin
      .from("workspaces")
      .insert({ owner_user_id: user.id, name: `Workspace de ${displayName}` })
      .select("id")
      .single();

    if (wsError || !ws) {
      console.error("[trial] Erro ao criar workspace:", wsError?.message);
      return NextResponse.json({
        ok: true,
        created: true,
        subscription,
        workspace_id: null,
        warning: "Workspace será criado no onboarding",
      });
    }

    workspaceId = ws.id;

    await admin.from("workspace_members").insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: "owner",
    });

    console.log(`[trial] Workspace criado: ${ws.id} user=${user.id}`);
  }

  return NextResponse.json({
    ok: true,
    created: !existing,
    subscription,
    workspace_id: workspaceId,
  });
}
