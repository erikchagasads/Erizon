import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { TrainingDataService } from "@/services/training-data-service";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { analysisId, feedback, nota } = (await req.json()) as {
    analysisId: string;
    feedback: "positivo" | "negativo";
    nota?: string;
  };

  await supabaseAdmin
    .from("neuro_score_analyses")
    .update({
      feedback,
      feedback_nota: nota ?? null,
      feedback_em: new Date().toISOString(),
    })
    .eq("id", analysisId)
    .eq("user_id", user.id);

  const { data: analysis } = await supabaseAdmin
    .from("neuro_score_analyses")
    .select("workspace_id, nicho, objetivo, neuro_score, reasoning, recomendacoes")
    .eq("id", analysisId)
    .single();

  if (analysis) {
    const training = new TrainingDataService(supabaseAdmin);
    await training
      .recordFromAgenteFeedback({
        workspaceId: analysis.workspace_id,
        userMessage: `Criativo analisado. Nicho: ${analysis.nicho}. Objetivo: ${analysis.objetivo}.`,
        agentResponse: JSON.stringify({
          neuro_score: analysis.neuro_score,
          recomendacoes: analysis.recomendacoes,
          reasoning: analysis.reasoning,
        }),
        feedback: feedback === "positivo" ? "positive" : "negative",
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
