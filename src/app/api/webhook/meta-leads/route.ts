import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import { novoLeadHtml } from "@/lib/email/templates";

const META_API_VERSION = "v19.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type JsonRecord = Record<string, unknown>;

type MetaLeadChangeValue = {
  leadgen_id?: string;
  form_id?: string;
  page_id?: string;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  created_time?: number;
};

type MetaLeadWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: MetaLeadChangeValue;
    }>;
  }>;
};

type MetricasCampaignRow = {
  id: string;
  user_id: string;
  cliente_id: string | null;
  nome_campanha: string | null;
  meta_account_id: string | null;
};

type BmAccountRow = {
  access_token: string | null;
  ad_account_id: string | null;
  ad_account_ids: string[] | null;
  ativo: boolean | null;
  status: string | null;
};

type UserSettingsRow = {
  meta_access_token: string | null;
  meta_ad_account_id: string | null;
};

type MetaLeadFieldData = {
  name: string;
  values: string[];
};

function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asString(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanToken(raw: string): string {
  const compact = raw.trim().replace(/\s+/g, "");
  const match = compact.match(/EAA[A-Za-z0-9]+/);
  return match ? match[0] : compact;
}

function normalizeAccountId(id: string): string {
  const value = id.trim();
  if (!value) return value;
  return value.startsWith("act_") ? value : `act_${value}`;
}

function getBmAccountIds(bm: BmAccountRow) {
  const ids = [
    bm.ad_account_id,
    ...(Array.isArray(bm.ad_account_ids) ? bm.ad_account_ids : []),
  ]
    .map((id) => normalizeAccountId(String(id ?? "")))
    .filter(Boolean);
  return [...new Set(ids)];
}

function extractLeadChanges(payload: MetaLeadWebhookPayload) {
  const changes: MetaLeadChangeValue[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change?.value && (change.field === "leadgen" || !change.field)) {
        changes.push(change.value);
      }
    }
  }
  return changes;
}

function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex")}`;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signatureHeader);

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function pickLeadFieldValue(fieldData: MetaLeadFieldData[], candidates: string[]) {
  const normalized = candidates.map((item) => item.toLowerCase());
  for (const candidate of normalized) {
    const found = fieldData.find((field) => field.name.toLowerCase() === candidate);
    if (!found) continue;
    const value = asString(found.values[0]);
    if (value) return value;
  }
  return null;
}

async function resolveCampaignByMetaCampaignId(metaCampaignId: string) {
  const { data, error } = await supabaseAdmin
    .from("metricas_ads")
    .select("id, user_id, cliente_id, nome_campanha, meta_account_id")
    .eq("meta_campaign_id", metaCampaignId)
    .order("data_atualizacao", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.[0] as MetricasCampaignRow | undefined) ?? null;
}

async function resolveMetaAccessToken(userId: string, targetAccountId: string | null) {
  const [{ data: bms }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from("bm_accounts")
      .select("access_token, ad_account_id, ad_account_ids, ativo, status")
      .eq("user_id", userId),
    supabaseAdmin
      .from("user_settings")
      .select("meta_access_token, meta_ad_account_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const normalizedTarget = normalizeAccountId(asString(targetAccountId));
  const activeBms = ((bms ?? []) as BmAccountRow[]).filter((bm) => {
    const token = cleanToken(asString(bm.access_token));
    const isActive = bm.ativo !== false && asString(bm.status, "ativo").toLowerCase() !== "inativo";
    return Boolean(token) && isActive;
  });

  const matchingBm = normalizedTarget
    ? activeBms.find((bm) => getBmAccountIds(bm).includes(normalizedTarget))
    : activeBms[0];

  if (matchingBm) {
    const token = cleanToken(asString(matchingBm.access_token));
    if (token) return token;
  }

  const typedSettings = (settings ?? null) as UserSettingsRow | null;
  const fallbackToken = cleanToken(asString(typedSettings?.meta_access_token));
  if (fallbackToken) return fallbackToken;

  return null;
}

async function fetchLeadFieldData(leadgenId: string, accessToken: string) {
  const url = new URL(`${META_BASE}/${leadgenId}`);
  url.searchParams.set("fields", "field_data");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const rawData = (await response.json().catch(() => ({}))) as JsonRecord;

  if (!response.ok || rawData.error) {
    const errorData = asObject(rawData.error);
    const message = asString(errorData.error_user_msg) || asString(errorData.message) || "Erro ao consultar lead na Meta.";
    throw new Error(message);
  }

  const fieldDataRaw = Array.isArray(rawData.field_data) ? rawData.field_data : [];
  const fieldData: MetaLeadFieldData[] = [];

  for (const item of fieldDataRaw) {
    const record = asObject(item);
    const name = asString(record.name);
    if (!name) continue;

    const values = Array.isArray(record.values)
      ? record.values.map((value) => asString(value)).filter(Boolean)
      : [];

    fieldData.push({ name, values });
  }

  return fieldData;
}

async function notifyLeadByEmail(params: {
  userId: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  campanha: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(params.userId);
  const userEmail = userRow?.user?.email;
  if (!userEmail) return;

  await sendEmail({
    to: userEmail,
    subject: `Novo lead: ${params.nome}`,
    html: novoLeadHtml({
      nome: params.nome,
      email: params.email ?? undefined,
      telefone: params.telefone ?? undefined,
      campanha: params.campanha ?? undefined,
      plataforma: "meta_lead_ads",
    }),
  });
}

async function processLeadChange(change: MetaLeadChangeValue) {
  const leadgenId = asString(change.leadgen_id);
  const metaCampaignId = asString(change.campaign_id);
  if (!leadgenId || !metaCampaignId) return;

  const campaign = await resolveCampaignByMetaCampaignId(metaCampaignId);
  if (!campaign) {
    console.error("[meta-leads webhook] Campanha nao encontrada para meta_campaign_id:", metaCampaignId);
    return;
  }

  const accessToken = await resolveMetaAccessToken(campaign.user_id, campaign.meta_account_id);
  if (!accessToken) {
    console.error("[meta-leads webhook] Token Meta nao encontrado para user:", campaign.user_id);
    return;
  }

  let fieldData: MetaLeadFieldData[] = [];
  try {
    fieldData = await fetchLeadFieldData(leadgenId, accessToken);
  } catch (error) {
    console.error("[meta-leads webhook] Falha ao buscar field_data:", error);
  }

  const nome = pickLeadFieldValue(fieldData, ["full_name", "name", "nome"]) ?? "Lead sem nome";
  const email = pickLeadFieldValue(fieldData, ["email"]);
  const telefone = pickLeadFieldValue(fieldData, ["phone_number", "phone", "telefone", "celular", "whatsapp"]);
  const adId = asString(change.ad_id) || null;
  const adsetId = asString(change.adset_id) || null;

  const { error: insertError } = await supabaseAdmin
    .from("crm_leads")
    .insert({
      user_id: campaign.user_id,
      cliente_id: campaign.cliente_id,
      nome,
      email,
      telefone,
      campanha_nome: campaign.nome_campanha,
      campanha_id: campaign.id,
      plataforma: "meta_lead_ads",
      utm_source: "meta",
      utm_medium: "paid",
      utm_campaign: metaCampaignId,
      utm_content: adId,
      utm_term: adsetId,
    });

  if (insertError) {
    console.error("[meta-leads webhook] Falha ao inserir crm_leads:", insertError.message);
    return;
  }

  try {
    await notifyLeadByEmail({
      userId: campaign.user_id,
      nome,
      email,
      telefone,
      campanha: campaign.nome_campanha,
    });
  } catch (error) {
    console.error("[meta-leads webhook] Falha ao enviar email:", error);
  }
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const verifyToken = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    challenge != null &&
    verifyToken &&
    verifyToken === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const expected = `sha256=${crypto
      .createHmac("sha256", process.env.META_APP_SECRET!)
      .update(rawBody)
      .digest("hex")}`;
    const signature = req.headers.get("x-hub-signature-256") ?? "";

    if (signature !== expected) {
      return new Response("Forbidden", { status: 403 });
    }

    let payload: MetaLeadWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as MetaLeadWebhookPayload;
    } catch (error) {
      console.error("[meta-leads webhook] JSON invalido:", error);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const leadChanges = extractLeadChanges(payload);
    for (const change of leadChanges) {
      try {
        await processLeadChange(change);
      } catch (error) {
        console.error("[meta-leads webhook] Erro ao processar lead:", error);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[meta-leads webhook] erro interno:", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
