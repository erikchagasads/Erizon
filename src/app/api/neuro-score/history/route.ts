import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");

  const { data } = await supabase
    .from("neuro_score_analyses")
    .select("id, nicho, objetivo, neuro_score, emocao_dominante, media_type, created_at, feedback, ctr_real, cpl_real")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return NextResponse.json({ analyses: data ?? [] });
}
