import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { buildStrategicContext } from "@/lib/strategic-context";
import { strategicIntelligenceService } from "@/services/strategic-intelligence-service";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// ── Rate limiting ─────────────────────────────────────────────────────────────

const RATE_LIMIT     = 30;
const RATE_WINDOW_MS = 60_000;

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

    if (error) throw error;

    const resetAt = data?.reset_at ? new Date(data.reset_at) : null;
    const expired = !resetAt || resetAt < now;

    if (!data || expired) {
      const newResetAt = new Date(now.getTime() + RATE_WINDOW_MS);
      await supabase.from("ai_rate_limits").upsert(
        { user_id: userId, count: 1, reset_at: newResetAt.toISOString() },
        { onConflict: "user_id" }
      );
      return true;
    }

    if (data.count >= RATE_LIMIT) return false;

    await supabase
      .from("ai_rate_limits")
      .update({ count: data.count + 1 })
      .eq("user_id", userId);

    return true;
  } catch {
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

// ── Persona da Erizon ─────────────────────────────────────────────────────────

const SISTEMA_ERIZON = `Você é a ERIZON — IA especialista em marketing digital, tráfego pago e growth hacking criada pela Erizon Growth Intelligence.

PERSONALIDADE:
- Direta, estratégica e orientada a resultado
- Fala em português BR com linguagem profissional mas acessível
- Usa dados reais para embasar cada resposta
- Nunca inventa métricas ou resultados
- Parceira de trabalho, não consultora distante

ESPECIALIDADES:
- Meta Ads (Facebook/Instagram): campanhas, criativos, segmentação, otimização
- Google Ads: search, display, performance max
- Copywriting de resposta direta: headlines, CTAs, VSLs, emails
- Análise de métricas: ROAS, CPL, CPA, CTR, frequência, CPM
- Gestão de budget e estratégia de escala segura
- Funis de conversão e landing pages
- Diagnóstico de causa raiz em campanhas com problema

SKILLS DE MARKETING:

SKILL — ANÁLISE DE CAMPANHA:
Diagnóstico → Causa Raiz → Impacto Financeiro → Ação Prioritária

SKILL — BENCHMARKS BR:
CPL: <R$15 ótimo | R$15-30 bom | R$30-50 atenção | >R$50 crítico
ROAS: >3× ótimo | 2-3× bom | 1-2× atenção | <1× prejuízo
CTR: >2% ótimo | 1-2% bom | 0.5-1% atenção | <0.5% criativo morto
Frequência: <2.0 seguro | >2.5 alarme de saturação | >3.5 pausar

SKILL — ESCALA SEGURA:
Só recomendar escala quando: ROAS >2.5× + CPL estável + Frequência <2.0 + 7+ dias de dados
Nunca escalar mais de 30% do orçamento por vez.

SKILL — COPY:
Estrutura básica: Gancho → Problema → Solução → Prova → CTA
Para headlines: use Curiosity Gap, Benefit-Driven ou Negative Angle

REGRAS:
- Responda sempre em PT-BR
- Formato: diagnóstico → problema → solução → próxima ação
- Use números quando possível
- Máximo 3 recomendações por resposta
- Nunca diga "não posso" — adapte e entregue sempre`;

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { prompt, category, cliente_id } = await req.json();

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

    // Rate limit
    const allowed = await checkRateLimitDb(supabase, user.id);
    if (!allowed) {
      return NextResponse.json(
        { text: "Limite de requisições atingido. Aguarde 1 minuto." },
        { status: 429 }
      );
    }

    // Buscar memória do cliente se informado
    const { getContextoCliente } = await import("@/lib/agente-memoria");
    const workspaceId = await strategicIntelligenceService.resolveWorkspaceId(user.id);
    const [memoriaCliente, workspaceSnapshot, clientSnapshot] = await Promise.all([
      getContextoCliente(supabase, user.id, cliente_id, "geral"),
      strategicIntelligenceService.getWorkspaceSnapshot({ workspaceId, userId: user.id }),
      cliente_id
        ? strategicIntelligenceService.getClientSnapshot({ clientId: cliente_id, userId: user.id, workspaceId })
        : Promise.resolve(null),
    ]);
    const strategicContext = buildStrategicContext({
      workspace: workspaceSnapshot,
      client: clientSnapshot,
      agent: "agente",
    });

    const systemPrompt = category
      ? `${SISTEMA_ERIZON}\n\nCONTEXTO ATUAL: ${category}${memoriaCliente}${strategicContext}`
      : `${SISTEMA_ERIZON}${memoriaCliente}${strategicContext}`;

    // Chama Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: prompt },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "Sem resposta.";
    return NextResponse.json({ text });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro inesperado";
    console.error("[ai] Erro:", msg);
    return NextResponse.json({ text: "Erro interno." }, { status: 500 });
  }
}
