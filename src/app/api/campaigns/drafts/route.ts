import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createServerSupabase } from "@/lib/supabase/server";
import { strategicIntelligenceService } from "@/services/strategic-intelligence-service";

type DraftPayload = {
  id?: string;
  campaignName?: string;
  clientId?: string | null;
  objetivo?: string;
  orcamentoDiario?: number | string;
  audienciaSize?: number | string | null;
  formato?: string;
  temCTA?: boolean;
  duracaoSegundos?: number | string | null;
  velocidadeUrl?: number | string | null;
  temPixel?: boolean;
  metaPageId?: string | null;
  metaPixelId?: string | null;
  publicoCustom?: boolean;
  metaCpl?: number | string | null;
  plataforma?: string;
};

const VALID_PLATFORMS = new Set(["meta", "google", "tiktok", "linkedin"]);

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
}

function normalizePlatform(value: unknown) {
  const platform = String(value ?? "meta").toLowerCase();
  return VALID_PLATFORMS.has(platform) ? platform : "meta";
}

function buildDraftRow(body: DraftPayload, userId: string, workspaceId: string) {
  const name = cleanText(
    body.campaignName,
    `Campanha rascunho ${new Date().toLocaleDateString("pt-BR")}`
  );
  const budget = toNumber(body.orcamentoDiario);

  return {
    user_id: userId,
    workspace_id: workspaceId,
    cliente_id: body.clientId || null,
    nome_campanha: name,
    plataforma: normalizePlatform(body.plataforma),
    objective: cleanText(body.objetivo, "LEADS"),
    orcamento: budget,
    gasto_total: 0,
    contatos: 0,
    receita_estimada: 0,
    status: "rascunho",
    preflight_status: "pendente",
    draft_payload: {
      ...body,
      campaignName: name,
      orcamentoDiario: budget,
      plataforma: normalizePlatform(body.plataforma),
    },
    data_atualizacao: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  let body: DraftPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }

  if (toNumber(body.orcamentoDiario) <= 0) {
    return NextResponse.json({ error: "Informe o orcamento diario." }, { status: 400 });
  }

  const db = createServerSupabase();
  const workspaceId = await strategicIntelligenceService.resolveWorkspaceId(auth.user.id);
  const payload = buildDraftRow(body, auth.user.id, workspaceId);

  const { data, error } = await db
    .from("metricas_ads")
    .insert(payload)
    .select("id, nome_campanha, status, preflight_status, orcamento")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, draft: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  let body: DraftPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id do rascunho obrigatorio." }, { status: 400 });
  }
  if (toNumber(body.orcamentoDiario) <= 0) {
    return NextResponse.json({ error: "Informe o orcamento diario." }, { status: 400 });
  }

  const db = createServerSupabase();
  const workspaceId = await strategicIntelligenceService.resolveWorkspaceId(auth.user.id);
  const payload = buildDraftRow(body, auth.user.id, workspaceId);

  const { data, error } = await db
    .from("metricas_ads")
    .update(payload)
    .eq("id", body.id)
    .eq("user_id", auth.user.id)
    .eq("status", "rascunho")
    .select("id, nome_campanha, status, preflight_status, orcamento")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Rascunho nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, draft: data });
}
