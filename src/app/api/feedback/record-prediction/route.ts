import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { feedbackLoopService } from "@/services/feedback-loop-service";
import { z } from "zod";

const schema = z.object({
  workspace_id: z.string().uuid(),
  decision_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  predicted_metric: z.enum(['roas', 'ctr', 'cpl', 'frequency']),
  predicted_value: z.number().min(0),
  predicted_confidence: z.number().min(0).max(1),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  try {
    const body = await request.json();
    const validated = schema.parse(body);
    const feedback = await feedbackLoopService.recordPrediction({
      workspace_id: validated.workspace_id,
      decision_id: validated.decision_id,
      campaign_id: validated.campaign_id,
      predicted_metric: validated.predicted_metric,
      predicted_value: validated.predicted_value,
      predicted_confidence: validated.predicted_confidence,
    });
    return NextResponse.json(feedback, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('POST /api/feedback/record-prediction', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
