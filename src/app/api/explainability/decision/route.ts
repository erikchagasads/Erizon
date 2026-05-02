import { NextRequest, NextResponse } from "next/server";
import { explainabilityService } from "@/services/explainability-service";
import { logError, logEvent } from "@/lib/observability/logger";

type FactorInput = {
  name: string;
  score: number;
};

type AlternativeInput = {
  action: string;
  score: number;
};

type ExplainRequest = {
  action?: unknown;
  campaign_name?: unknown;
  factors?: unknown;
  alternatives?: unknown;
  confidence?: unknown;
};

function isFactor(value: unknown): value is FactorInput {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.name === "string" && typeof record.score === "number";
}

function isAlternative(value: unknown): value is AlternativeInput {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.action === "string" && typeof record.score === "number";
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.7;
  if (value > 1) return Math.min(1, Math.max(0, value / 100));
  return Math.min(1, Math.max(0, value));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExplainRequest;

    if (typeof body.action !== "string" || typeof body.campaign_name !== "string") {
      return NextResponse.json(
        { error: "Informe action e campaign_name para gerar a explicacao." },
        { status: 400 }
      );
    }

    const factors = Array.isArray(body.factors)
      ? body.factors.filter(isFactor)
      : [];

    const alternatives = Array.isArray(body.alternatives)
      ? body.alternatives.filter(isAlternative)
      : [];

    const explanation = await explainabilityService.explainDecision({
      action: body.action,
      campaign_name: body.campaign_name,
      factors,
      alternatives,
      confidence: clampConfidence(body.confidence),
    });

    logEvent("explainability.decision.generated", {
      action: body.action,
      campaign: body.campaign_name,
      factors: factors.length,
    });

    return NextResponse.json({ data: explanation, error: null });
  } catch (error) {
    logError("explainability.decision.error", error);
    return NextResponse.json(
      { data: null, error: "Nao foi possivel gerar a explicacao agora." },
      { status: 500 }
    );
  }
}
