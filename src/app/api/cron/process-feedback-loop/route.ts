// src/app/api/cron/process-feedback-loop/route.ts

import { NextRequest, NextResponse } from "next/server";
import { feedbackLoopService } from "@/services/feedback-loop-service";
import { logger } from "@/lib/observability/logger";

/**
 * Cron job executado diariamente para:
 * 1. Buscar predições com >7 dias
 * 2. Medir outcomes reais
 * 3. Atualizar confidence do modelo
 * 4. Disparar retraining se necessário
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar header de autorização (Supabase cron)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.SUPABASE_CRON_SECRET;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      logger.warn('Unauthorized cron attempt', { authHeader });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Feedback loop processing started');

    // Processar predições em aberto
    const result = await feedbackLoopService.processOutstandingPredictions();

    logger.info('Feedback loop processing completed', {
      processed: result.processed,
      retraining_triggered: result.retraining_triggered,
      errors: result.errors,
    });

    return NextResponse.json(
      {
        status: 'ok',
        processed: result.processed,
        retraining_triggered: result.retraining_triggered,
        errors: result.errors,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Feedback loop cron error', { error });

    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Alternativo: Se usar Vercel Cron
export const runtime = 'nodejs';

/*
Configure em vercel.json:
{
  "crons": [
    {
      "path": "/api/cron/process-feedback-loop",
      "schedule": "0 0 * * *"
    }
  ]
}

Ou configure em supabase/config.toml:
[functions."process-feedback"]
schedule = "0 0 * * *"
*/
