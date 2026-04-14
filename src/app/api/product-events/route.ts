import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";

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

export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const eventName = String(body.event_name ?? "").trim();
  const source = String(body.source ?? "app").trim();
  const properties = typeof body.properties === "object" && body.properties ? body.properties : {};

  if (!eventName) {
    return NextResponse.json({ error: "event_name obrigatorio" }, { status: 400 });
  }

  const db = createServerSupabase();
  const { data: wm } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const { error } = await db.from("product_events").insert({
    user_id: user.id,
    workspace_id: wm?.workspace_id ?? null,
    event_name: eventName,
    source,
    properties,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
