import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkApiKeyRateLimit,
  recordApiKeyRequest,
  requireApiKeyAuth,
} from "@/lib/api-key-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const ENDPOINT = "/api/internal/crm/leads";
const CRM_INGESTION_LIMITS = {
  free: 300,
  pro: 3000,
  enterprise: 20000,
} as const;

const LeadSchema = z.object({
  nome: z.string().min(1).max(200),
  telefone: z.string().max(40).optional(),
  email: z.string().max(320).optional(),
  anotacao: z.string().max(5000).optional(),
  cliente_id: z.string().uuid().optional(),
  campanha_nome: z.string().max(200).optional(),
  campanha_id: z.string().max(120).optional(),
  plataforma: z.string().max(40).default("n8n"),
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(160).optional(),
  utm_content: z.string().max(160).optional(),
  utm_term: z.string().max(160).optional(),
});

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }

  return undefined;
}

async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => {
      throw new Error("JSON invalido no body.");
    })) as Record<string, unknown>;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    const body: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      body[key] = typeof value === "string" ? value : value.name;
    });
    return body;
  }

  throw new Error("Content-Type invalido. Use application/json ou form-urlencoded.");
}

function normalizeLeadPayload(body: Record<string, unknown>) {
  return {
    nome: pickString(body.nome, body.name, body.full_name, body.nome_completo),
    telefone: pickString(body.telefone, body.phone, body.whatsapp, body.celular),
    email: pickString(body.email, body.e_mail),
    anotacao: pickString(body.anotacao, body.note, body.notes, body.observacao),
    cliente_id: pickString(body.cliente_id, body.clienteId),
    campanha_nome: pickString(
      body.campanha_nome,
      body.campaign_name,
      body.campaignName,
      body.campanha,
      body.campaign,
      body.utm_campaign,
    ),
    campanha_id: pickString(body.campanha_id, body.campaign_id, body.campaignId),
    plataforma: pickString(body.plataforma, body.platform, body.source) ?? "n8n",
    utm_source: pickString(body.utm_source, body.utmSource),
    utm_medium: pickString(body.utm_medium, body.utmMedium),
    utm_campaign: pickString(body.utm_campaign, body.utmCampaign),
    utm_content: pickString(body.utm_content, body.utmContent),
    utm_term: pickString(body.utm_term, body.utmTerm),
  };
}

function buildRequestSummary(payload: Partial<z.infer<typeof LeadSchema>>) {
  return {
    cliente_id: payload.cliente_id ?? null,
    campanha_nome: payload.campanha_nome ?? null,
    campanha_id: payload.campanha_id ?? null,
    plataforma: payload.plataforma ?? null,
    utm_source: payload.utm_source ?? null,
    has_email: Boolean(payload.email),
    has_phone: Boolean(payload.telefone),
  };
}

export async function GET() {
  return NextResponse.json({
    name: "Erizon Internal CRM Leads API",
    endpoint: `POST ${ENDPOINT}`,
    authentication: {
      header: "x-erizon-key",
      alternative: "Authorization: Bearer <api_key>",
    },
    description: "Cria leads no CRM da Erizon para integracoes server-to-server, como n8n.",
    accepted_content_types: ["application/json", "application/x-www-form-urlencoded"],
    required_fields: ["nome"],
    optional_fields: [
      "telefone",
      "email",
      "anotacao",
      "cliente_id",
      "campanha_nome",
      "campanha_id",
      "plataforma",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ],
    example: {
      headers: {
        "x-erizon-key": "erzk_live_xxx",
        "Content-Type": "application/json",
      },
      body: {
        nome: "Maria Oliveira",
        telefone: "11999999999",
        email: "maria@email.com",
        cliente_id: "00000000-0000-0000-0000-000000000000",
        campanha_nome: "Meta Ads - Captacao",
        plataforma: "n8n",
        utm_source: "meta",
        utm_campaign: "captacao-imoveis",
      },
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiKeyAuth(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const allowed = await checkApiKeyRateLimit(auth.keyHash, auth.plan, CRM_INGESTION_LIMITS);
  if (!allowed) {
    await recordApiKeyRequest({
      keyHash: auth.keyHash,
      endpoint: ENDPOINT,
      params: { reason: "rate_limit" },
      statusCode: 429,
    });

    return NextResponse.json(
      { error: "Rate limit atingido para esta API key." },
      { status: 429, headers: { "X-Erizon-Plan": auth.plan } },
    );
  }

  let normalizedPayload: ReturnType<typeof normalizeLeadPayload>;
  try {
    const rawBody = await readBody(request);
    normalizedPayload = normalizeLeadPayload(rawBody);
  } catch (error) {
    await recordApiKeyRequest({
      keyHash: auth.keyHash,
      endpoint: ENDPOINT,
      params: { reason: "invalid_body" },
      statusCode: 400,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Body invalido." },
      { status: 400, headers: { "X-Erizon-Plan": auth.plan } },
    );
  }

  const parsed = LeadSchema.safeParse(normalizedPayload);
  if (!parsed.success) {
    await recordApiKeyRequest({
      keyHash: auth.keyHash,
      endpoint: ENDPOINT,
      params: buildRequestSummary(normalizedPayload),
      statusCode: 400,
    });

    return NextResponse.json(
      { error: "Payload invalido.", details: parsed.error.flatten() },
      { status: 400, headers: { "X-Erizon-Plan": auth.plan } },
    );
  }

  const lead = parsed.data;
  const supabase = getSupabaseServerClient();

  if (lead.cliente_id) {
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("id")
      .eq("id", lead.cliente_id)
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (clienteError || !cliente) {
      await recordApiKeyRequest({
        keyHash: auth.keyHash,
        endpoint: ENDPOINT,
        params: buildRequestSummary(lead),
        statusCode: 404,
      });

      return NextResponse.json(
        { error: "cliente_id nao encontrado para esta API key." },
        { status: 404, headers: { "X-Erizon-Plan": auth.plan } },
      );
    }
  }

  const { data, error } = await supabase
    .from("crm_leads")
    .insert({
      user_id: auth.userId,
      nome: lead.nome,
      telefone: lead.telefone ?? null,
      email: lead.email ?? null,
      anotacao: lead.anotacao ?? null,
      cliente_id: lead.cliente_id ?? null,
      campanha_nome: lead.campanha_nome ?? null,
      campanha_id: lead.campanha_id ?? null,
      plataforma: lead.plataforma,
      utm_source: lead.utm_source ?? null,
      utm_medium: lead.utm_medium ?? null,
      utm_campaign: lead.utm_campaign ?? null,
      utm_content: lead.utm_content ?? null,
      utm_term: lead.utm_term ?? null,
    })
    .select()
    .single();

  if (error) {
    await recordApiKeyRequest({
      keyHash: auth.keyHash,
      endpoint: ENDPOINT,
      params: buildRequestSummary(lead),
      statusCode: 500,
    });

    return NextResponse.json(
      { error: error.message || "Erro ao criar lead." },
      { status: 500, headers: { "X-Erizon-Plan": auth.plan } },
    );
  }

  await recordApiKeyRequest({
    keyHash: auth.keyHash,
    endpoint: ENDPOINT,
    params: buildRequestSummary(lead),
    statusCode: 201,
  });

  return NextResponse.json(
    { ok: true, lead: data },
    { status: 201, headers: { "X-Erizon-Plan": auth.plan } },
  );
}
