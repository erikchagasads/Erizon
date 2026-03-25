import { requireAuth } from "@/lib/auth/require-auth";
import { AttributionRepository } from "@/repositories/supabase/attribution-repository";
import { logError } from "@/lib/observability/logger";

// POST /api/ena/attribution — Registra um touchpoint
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.workspaceId || !body?.stage || !body?.contactHash) {
    return Response.json({ error: "workspaceId, stage e contactHash são obrigatórios" }, { status: 400 });
  }

  const auth = await requireAuth(req, body.workspaceId);
  if (auth.ok === false) {
    return Response.json({ error: auth.error }, { status: auth.status ?? 401 });
  }

  try {
    const repo = new AttributionRepository();
    await repo.insertTouchpoint({
      workspaceId:    body.workspaceId,
      campaignId:     body.campaignId  ?? null,
      clientId:       body.clientId    ?? null,
      stage:          body.stage,
      contactHash:    body.contactHash,
      contactChannel: body.contactChannel ?? "direct",
      occurredAt:     body.occurredAt  ?? undefined,
      saleValue:      body.saleValue   ?? null,
      leadId:         body.leadId      ?? null,
      utmCampaign:    body.utmCampaign ?? null,
      utmSource:      body.utmSource   ?? null,
      utmMedium:      body.utmMedium   ?? null,
      metadata:       body.metadata    ?? null,
    });
    return Response.json({ ok: true });
  } catch (err) {
    logError("api_ena_attribution_post_failed", err, { workspaceId: body.workspaceId });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/ena/attribution?workspaceId=xxx&campaignId=yyy&days=30
export async function GET(req: Request) {
  const url         = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? "";
  const campaignId  = url.searchParams.get("campaignId")  ?? undefined;
  const days        = Number(url.searchParams.get("days") ?? "30");

  if (!workspaceId) {
    return Response.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const auth = await requireAuth(req, workspaceId);
  if (auth.ok === false) {
    return Response.json({ error: auth.error }, { status: auth.status ?? 401 });
  }

  try {
    const repo   = new AttributionRepository();
    const result = await repo.getAttributionSummary(workspaceId, days, campaignId);
    return Response.json(result);
  } catch (err) {
    logError("api_ena_attribution_get_failed", err, { workspaceId });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
