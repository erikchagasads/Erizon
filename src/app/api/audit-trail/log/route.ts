import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { auditTrailService } from "@/services/audit-trail-service";
import { z } from "zod";

const schema = z.object({
  workspace_id: z.string().uuid(),
  decision_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  campaign_snapshot: z.record(z.any()),
  applied_rules: z.array(z.record(z.any())),
  reasoning: z.object({
    anomaly_score: z.number(),
    confidence: z.number(),
    factors: z.array(z.object({ factor: z.string(), score: z.number() })),
  }),
  decision: z.object({
    action: z.string(),
    impact_estimated: z.number(),
  }),
  explanation: z.object({
    summary: z.string(),
    factors: z.any(),
    alternatives: z.any(),
  }).optional(),
  auto_approved: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  try {
    const body = await request.json();
    const validated = schema.parse(body);
    const audit_id = await auditTrailService.logDecision({
      workspace_id: validated.workspace_id,
      decision_id: validated.decision_id,
      campaign_id: validated.campaign_id,
      campaign_snapshot: validated.campaign_snapshot,
      applied_rules: validated.applied_rules,
      reasoning: {
        anomaly_score: validated.reasoning.anomaly_score,
        confidence: validated.reasoning.confidence,
        factors: validated.reasoning.factors.map(f => ({ factor: f.factor, score: f.score })),
      },
      decision: {
        action: validated.decision.action,
        impact_estimated: validated.decision.impact_estimated,
      },
      explanation: validated.explanation
        ? {
            summary: validated.explanation.summary,
            factors: validated.explanation.factors,
            alternatives: validated.explanation.alternatives,
          }
        : undefined,
      auto_approved: validated.auto_approved,
    });
    return NextResponse.json({ audit_trail_id: audit_id }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('POST /api/audit-trail/log', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
