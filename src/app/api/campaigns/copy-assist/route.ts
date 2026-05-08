import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth-guard";
import { getContextoCliente } from "@/lib/agente-memoria";
import { buildStrategicContext } from "@/lib/strategic-context";
import { strategicIntelligenceService } from "@/services/strategic-intelligence-service";
import { checkRateLimit, RATE_LIMIT_PRESETS, rateLimitHeaders } from "@/lib/rate-limiter";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type CopyAssistBody = {
  clientId?: string | null;
  clientName?: string | null;
  campaignName?: string;
  objective?: string;
  format?: string;
  destinationUrl?: string;
  cta?: string;
  currentPrimaryText?: string;
  currentHeadline?: string;
  currentDescription?: string;
  audienceSummary?: string;
  contextNotes?: string;
};

type CopySuggestionPackage = {
  angle: string;
  rationale: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  ctaSuggestions: string[];
};

function asString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeStringArray(value: unknown, min = 0) {
  const list = Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

  if (list.length >= min) return list;
  return list;
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  try {
    return JSON.parse(trimmed.slice(first, last + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function fallbackCopyPackage(body: CopyAssistBody): CopySuggestionPackage {
  const theme = asString(body.campaignName, "sua oferta");
  const objective = asString(body.objective, "LEADS");

  const basePrimary = objective === "SALES"
    ? [
        `Veja como ${theme} pode acelerar vendas com uma mensagem mais clara e um funil mais consistente.`,
        `Se ${theme} depende de decisao rapida, esta campanha precisa mostrar valor antes do clique esfriar.`,
        `Transforme interesse em acao com uma proposta mais direta, especifica e facil de entender.`,
      ]
    : [
        `Descubra como ${theme} pode atrair contatos mais qualificados sem desperdiçar verba com mensagem genérica.`,
        `Se a sua campanha fala com todo mundo, ela deixa dinheiro na mesa. Ajuste a promessa e a intencao.`,
        `Crie anuncios mais claros para gerar leads com mais qualidade e menos atrito antes da conversao.`,
      ];

  return {
    angle: `Promessa clara para ${theme}`,
    rationale: "Pacote fallback criado a partir do objetivo e da campanha atual para manter o fluxo de criacao ativo.",
    primaryTexts: basePrimary,
    headlines: [
      `${theme}: mensagem que converte`,
      `Mais clareza para vender melhor`,
      `Ajuste a promessa do anuncio`,
      `Campanha com proposta mais forte`,
    ],
    descriptions: [
      "Mensagem mais direta e convincente",
      "Copy mais clara para Meta Ads",
      "Proposta alinhada ao clique",
      "Menos atrito, mais resposta",
    ],
    ctaSuggestions: objective === "SALES" ? ["SHOP_NOW", "LEARN_MORE"] : ["LEARN_MORE", "SIGN_UP", "CONTACT_US"],
  };
}

function sanitizePackage(value: Record<string, unknown> | null, body: CopyAssistBody) {
  const fallback = fallbackCopyPackage(body);
  if (!value) return fallback;

  return {
    angle: asString(value.angle, fallback.angle),
    rationale: asString(value.rationale, fallback.rationale),
    primaryTexts: normalizeStringArray(value.primaryTexts, 2).slice(0, 4).length > 0
      ? normalizeStringArray(value.primaryTexts).slice(0, 4)
      : fallback.primaryTexts,
    headlines: normalizeStringArray(value.headlines, 3).slice(0, 6).length > 0
      ? normalizeStringArray(value.headlines).slice(0, 6)
      : fallback.headlines,
    descriptions: normalizeStringArray(value.descriptions, 2).slice(0, 4).length > 0
      ? normalizeStringArray(value.descriptions).slice(0, 4)
      : fallback.descriptions,
    ctaSuggestions: normalizeStringArray(value.ctaSuggestions).slice(0, 4).length > 0
      ? normalizeStringArray(value.ctaSuggestions).slice(0, 4)
      : fallback.ctaSuggestions,
  } satisfies CopySuggestionPackage;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.user) return auth.response;

    const rl = checkRateLimit(`campaign-copy-assist:${auth.user.id}`, RATE_LIMIT_PRESETS.ai);
    const rlHeaders = rateLimitHeaders(rl, RATE_LIMIT_PRESETS.ai.limit);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit atingido. Aguarde antes de gerar novas variacoes." },
        { status: 429, headers: rlHeaders }
      );
    }

    const body = (await req.json()) as CopyAssistBody;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const workspaceId = await strategicIntelligenceService.resolveWorkspaceId(auth.user.id);
    const [memoryContext, workspaceSnapshot, clientSnapshot] = await Promise.all([
      getContextoCliente(supabase, auth.user.id, body.clientId ?? null, "copywriter"),
      strategicIntelligenceService.getWorkspaceSnapshot({ workspaceId, userId: auth.user.id }),
      body.clientId
        ? strategicIntelligenceService.getClientSnapshot({ clientId: body.clientId, workspaceId, userId: auth.user.id })
        : Promise.resolve(null),
    ]);
    const strategicContext = buildStrategicContext({
      workspace: workspaceSnapshot,
      client: clientSnapshot,
      agent: "copywriter",
    });

    const prompt = `
Você é o Head de Copy da Erizon e lidera um time formado por:
- estrategista de performance
- copywriter de direct response
- editor de headlines para Meta Ads Brasil

Sua missão é gerar um pacote de copy que pareça ter saído do Gerenciador de Anúncios de um gestor experiente: claro, específico, persuasivo e pronto para teste.

CONTEXTO DA CAMPANHA
- Cliente: ${asString(body.clientName, body.clientId ? "cliente selecionado" : "não informado")}
- Campanha: ${asString(body.campaignName, "Campanha Meta")}
- Objetivo: ${asString(body.objective, "LEADS")}
- Formato: ${asString(body.format, "imagem")}
- CTA atual: ${asString(body.cta, "LEARN_MORE")}
- URL destino: ${asString(body.destinationUrl, "não informada")}
- Público resumido: ${asString(body.audienceSummary, "não informado")}

TEXTO ATUAL
- Primary text: ${asString(body.currentPrimaryText, "vazio")}
- Headline: ${asString(body.currentHeadline, "vazio")}
- Description: ${asString(body.currentDescription, "vazio")}

CONTEXTO LIVRE
${asString(body.contextNotes, "sem observações adicionais")}

MEMÓRIA DO CLIENTE
${memoryContext || "sem memória anterior"}

CAMADA ESTRATÉGICA
${strategicContext}

REGRAS
- Português BR natural
- Sem promessas absolutas, fake proof ou sensacionalismo vazio
- Headlines curtas, fortes e fáceis de testar
- Descrições complementares e enxutas
- Primary texts com gancho, benefício e tensão comercial
- Se faltar dado, não invente; use uma mensagem segura e específica
- Pense como Meta Ads para mercado brasileiro

RESPONDA SOMENTE EM JSON VÁLIDO com esta estrutura:
{
  "angle": "ângulo principal da comunicação",
  "rationale": "por que esse ângulo foi escolhido",
  "primaryTexts": ["opção 1", "opção 2", "opção 3", "opção 4"],
  "headlines": ["opção 1", "opção 2", "opção 3", "opção 4", "opção 5", "opção 6"],
  "descriptions": ["opção 1", "opção 2", "opção 3", "opção 4"],
  "ctaSuggestions": ["LEARN_MORE", "SIGN_UP", "CONTACT_US"]
}`.trim();

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.85,
      max_tokens: 2200,
      messages: [
        {
          role: "system",
          content: "Você responde apenas com JSON válido, sem markdown, sem explicação e sem texto fora do objeto JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJsonObject(raw);
    const pkg = sanitizePackage(parsed, body);

    return NextResponse.json({
      ok: true,
      package: pkg,
    }, { headers: rlHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao gerar copy.";
    console.error("[campaigns/copy-assist]", message);
    return NextResponse.json(
      { ok: false, error: `Erro ao gerar copy: ${message}` },
      { status: 500 }
    );
  }
}
