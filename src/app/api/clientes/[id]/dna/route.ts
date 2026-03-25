import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { ProfitDNAService } from "@/services/profit-dna-service";
import { createServerSupabase } from "@/lib/supabase/server";

const svc = new ProfitDNAService();

// GET /api/clientes/[id]/dna — retorna DNA atual ou computa sob demanda
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const clientId = params.id;

  const db = createServerSupabase();
  const { data: ws } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const workspaceId = ws?.workspace_id ?? auth.user.id;

  let dna = await svc.getForClient(workspaceId, clientId);
  if (!dna) {
    dna = await svc.computeAndSave(workspaceId, clientId);
  }

  return NextResponse.json({ ok: true, dna });
}

// POST /api/clientes/[id]/dna — força recompute
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const clientId = params.id;

  const db = createServerSupabase();
  const { data: ws } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const workspaceId = ws?.workspace_id ?? auth.user.id;

  const dna = await svc.computeAndSave(workspaceId, clientId);
  return NextResponse.json({ ok: true, dna });
}
