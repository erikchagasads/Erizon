import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { strategicIntelligenceService } from "@/services/strategic-intelligence-service";
import { campaignSuggestionService } from "@/services/campaign-suggestion-service";
import { logError } from "@/lib/observability/logger";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const clientId = req.nextUrl.searchParams.get("clientId");

  try {
    const workspaceId = await strategicIntelligenceService.resolveWorkspaceId(auth.user.id);
    const suggestions = await campaignSuggestionService.generate({
      userId: auth.user.id,
      workspaceId,
      clientId,
    });

    return NextResponse.json({
      ok: true,
      suggestions,
      source: suggestions.some((suggestion) => suggestion.source === "ai") ? "ai" : "rules",
    });
  } catch (error) {
    logError("campaign_suggestions_route_failed", error, {
      userId: auth.user.id,
      clientId,
    });

    return NextResponse.json(
      { ok: false, error: "Nao foi possivel gerar sugestoes de campanha." },
      { status: 500 }
    );
  }
}
