// POST /api/crm-cliente/auth/logout
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get("crm_session")?.value;

  if (sessionToken) {
    await supabaseAdmin
      .from("crm_cliente_sessions")
      .delete()
      .eq("session_token", sessionToken);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("crm_session", "", { maxAge: 0, path: "/" });
  return response;
}
