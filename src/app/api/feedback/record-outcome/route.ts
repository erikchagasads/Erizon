import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { feedbackLoopService } from "@/services/feedback-loop-service";
import { z } from "zod";

const schema = z.object({
  prediction_id: z.string().uuid(),
  actual_value: z.number().min(0),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.user) return auth.response;

  try {
    const body = await request.json();
    const validated = schema.parse(body);
    const result = await feedbackLoopService.recordOutcome({
      prediction_id: validated.prediction_id,
      actual_value: validated.actual_value,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('POST /api/feedback/record-outcome', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
