import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// ── Rate limiting via Supabase (persiste entre cold starts serverless) ────────
// Tabela necessária:
//   CREATE TABLE ai_rate_limits (
//     user_id uuid PRIMARY KEY,
//     count int NOT NULL DEFAULT 0,
//     reset_at timestamptz NOT NULL
//   );
//
// Fallback: se a tabela não existir ainda, usa rate limit em memória
// (comportamento igual ao original, sem quebrar)

const RATE_LIMIT     = 30;
const RATE_WINDOW_MS = 60_000; // 1 minuto

// Fallback em memória para dev / tabela ausente
const rateLimitFallback = new Map<string, { count: number; resetAt: number }>();

async function checkRateLimitDb(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<boolean> {
  try {
    const now = new Date();
    const { data, error } = await supabase
      .from("ai_rate_limits")
      .select("count, reset_at")
      .eq("user_id", userId)
      .maybeSingle();

    // Tabela não existe ou erro — usa fallback em memória
    if (error) throw error;

    const resetAt = data?.reset_at ? new Date(data.reset_at) : null;
    const expired = !resetAt || resetAt < now;

    if (!data || expired) {
      // Cria/reseta janela
      const newResetAt = new Date(now.getTime() + RATE_WINDOW_MS);
      await supabase.from("ai_rate_limits").upsert(
        { user_id: userId, count: 1, reset_at: newResetAt.toISOString() },
        { onConflict: "user_id" }
      );
      return true;
    }

    if (data.count >= RATE_LIMIT) return false;

    // Incrementa
    await supabase
      .from("ai_rate_limits")
      .update({ count: data.count + 1 })
      .eq("user_id", userId);

    return true;
  } catch {
    // Fallback em memória se DB falhar
    return checkRateLimitMemory(userId);
  }
}

function checkRateLimitMemory(userId: string): boolean {
  const now   = Date.now();
  const entry = rateLimitFallback.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitFallback.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Persona da Erizon ────────────────────────────────────────────────────────
const SISTEMA_ERIZON = `Você é a ERIZON, uma IA especialista em marketing digital, tráfego pago e growth hacking criada pela Erizon Growth Intelligence.

PERSONALIDADE:
- Direta, estratégica e orientada a resultado
- Fala em português BR com linguagem profissional mas acessível
- Usa dados reais para embasar cada resposta
- Nunca inventa métricas ou resultados

ESPECIALIDADES:
- Meta Ads (Facebook/Instagram): campanhas, criativos, segmentação, otimização
- Google Ads: search, display, performance max
- Copywriting de resposta direta: headlines, CTAs, VSLs, emails
- Análise de métricas: ROAS, CPL, CPA, CTR, frequência
- Gestão de budget e estratégia de escala
- Funis de conversão e landing pages

REGRAS:
- Responda sempre em PT-BR
- Seja direto: diagnóstico → problema → solução → próxima ação
- Use números quando possível
- Máximo 3 recomendações por resposta
- Nunca diga "não posso" — encontre sempre uma forma de ajudar`;

export async function POST(req: Request) {
  try {
    const { prompt, category } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ text: "Prompt não pode estar vazio." }, { status: 400 });
    }

    // Autenticação
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ text: "Não autenticado." }, { status: 401 });
    }

    // Rate limit via DB (persiste entre cold starts)
    const allowed = await checkRateLimitDb(supabase, user.id);
    if (!allowed) {
      return NextResponse.json(
        { text: "Limite de requisições atingido. Aguarde 1 minuto." },
        { status: 429 }
      );
    }

    // Enriquece o system prompt com categoria
    const systemPrompt = category
      ? `${SISTEMA_ERIZON}\n\nCONTEXTO ATUAL: ${category}`
      : SISTEMA_ERIZON;

    // Chama Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[ai] Anthropic error:", err);
      return NextResponse.json(
        { text: "Erro ao consultar IA. Tente novamente." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "Sem resposta.";

    return NextResponse.json({ text });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro inesperado";
    console.error("[ai] Erro:", msg);
    return NextResponse.json({ text: "Erro interno." }, { status: 500 });
  }
}