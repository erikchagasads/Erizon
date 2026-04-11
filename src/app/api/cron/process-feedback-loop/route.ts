// src/app/api/cron/process-feedback-loop/route.ts
// CORRIGIDO: trocado POST por GET — Vercel Cron só chama GET
// CORRIGIDO: trocado SUPABASE_CRON_SECRET por CRON_SECRET (padrão do projeto)

import { NextRequest, NextResponse } from "next/server";
import { feedbackLoopService } from "@/services/feedback-loop-service";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${cronSecret}`) {
        logger.warn("Unauthorized cron attempt", { auth });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    logger.info("Feedback loop processing started");

    const result = await feedbackLoopService.processOutstandingPredictions();

    logger.info("Feedback loop processing completed", {
      processed: result.processed,
      retraining_triggered: result.retraining_triggered,
      errors: result.errors,
    });

    return NextResponse.json({
      status: "ok",
      processed: result.processed,
      retraining_triggered: result.retraining_triggered,
      errors: result.errors,
    });
  } catch (error) {
    logger.error("Feedback loop cron error", { error });
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}