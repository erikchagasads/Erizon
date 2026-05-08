import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createServerSupabase } from "@/lib/supabase/server";

const META_API_VERSION = "v19.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type JsonRecord = Record<string, unknown>;

type BmAccountRow = {
  access_token: string | null;
  ad_account_id: string | null;
  ad_account_ids: string[] | null;
  ativo: boolean | null;
  status: string | null;
};

type ClientMetaRow = {
  id: string;
  nome: string | null;
  nome_cliente: string | null;
  meta_account_id: string | null;
  ig_user_id: string | null;
  whatsapp: string | null;
};

type PageSummary = {
  id: string;
  name: string;
  instagramActorId: string | null;
};

type ResolvedWhatsapp =
  | {
      ok: true;
      whatsapp: string;
      displayPhoneNumber: string | null;
      source: "connected_whatsapp_number" | "whatsapp_business_account_phone_numbers";
      warning: string | null;
    }
  | {
      ok: false;
      error: string;
    };

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

function normalizePhoneDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asString(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
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

function improveMetaMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("permission") ||
    normalized.includes("permissions") ||
    normalized.includes("does not have permission") ||
    normalized.includes("missing permissions")
  ) {
    return "A Meta bloqueou a leitura do WhatsApp dessa conta. Reconecte a integracao com permissao de Pages e WhatsApp Business.";
  }

  if (normalized.includes("token") && normalized.includes("expired")) {
    return "O token Meta expirou. Reconecte a integracao antes de buscar o WhatsApp.";
  }

  return message;
}

function isFieldSupportError(message: string): boolean {
  return /tried accessing nonexisting field|cannot query field|unsupported get request|not available/i.test(message);
}

async function getMeta(
  path: string,
  params: Record<string, string>,
  accessToken: string
): Promise<{ ok: true; raw: JsonRecord } | { ok: false; error: string }> {
  const url = new URL(`${META_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", accessToken);

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as JsonRecord;
    if (!response.ok || data.error) {
      const error = asObject(data.error);
      const message =
        asString(error.error_user_msg) ||
        asString(error.message) ||
        "Erro ao consultar a Meta.";
      return { ok: false, error: improveMetaMessage(message) };
    }
    return { ok: true, raw: data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha de rede ao consultar a Meta.",
    };
  }
}

async function resolveMetaAccessToken(
  db: ReturnType<typeof createServerSupabase>,
  userId: string,
  targetAccountId: string | null
) {
  const [{ data: bms }, { data: settings }] = await Promise.all([
    db
      .from("bm_accounts")
      .select("access_token, ad_account_id, ad_account_ids, ativo, status")
      .eq("user_id", userId),
    db
      .from("user_settings")
      .select("meta_access_token, meta_ad_account_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const normalizedTarget = normalizeAccountId(asString(targetAccountId));
  const activeBms = ((bms ?? []) as BmAccountRow[]).filter((bm) => {
    const token = cleanToken(String(bm.access_token ?? ""));
    const isActive = bm.ativo !== false && String(bm.status ?? "ativo").toLowerCase() !== "inativo";
    return token && isActive;
  });

  const matchingBm = normalizedTarget
    ? activeBms.find((bm) => getBmAccountIds(bm).includes(normalizedTarget))
    : activeBms[0];

  if (matchingBm) {
    const accessToken = cleanToken(String(matchingBm.access_token ?? ""));
    if (accessToken) return { ok: true as const, accessToken };
  }

  const fallbackToken = cleanToken(String(settings?.meta_access_token ?? ""));
  if (fallbackToken) return { ok: true as const, accessToken: fallbackToken };

  return {
    ok: false as const,
    error: "Token Meta nao configurado. Atualize a integracao antes de buscar o WhatsApp do cliente.",
  };
}

async function listAccessiblePages(accessToken: string) {
  const response = await getMeta(
    "me/accounts",
    {
      fields: "id,name,instagram_business_account{id,username}",
      limit: "50",
    },
    accessToken
  );

  if (response.ok === false) return response;

  const raw = Array.isArray(response.raw.data) ? (response.raw.data as JsonRecord[]) : [];
  const pages = raw
    .map((item) => {
      const instagram = asObject(item.instagram_business_account);
      return {
        id: asString(item.id),
        name: asString(item.name, "Facebook Page"),
        instagramActorId: asString(instagram.id) || null,
      } satisfies PageSummary;
    })
    .filter((page) => page.id);

  return { ok: true as const, pages };
}

function resolvePageForClient(
  pages: PageSummary[],
  preferredInstagramId: string | null,
  preferredPageId: string | null
) {
  if (preferredPageId) {
    const exact = pages.find((page) => page.id === preferredPageId);
    if (exact) return { ok: true as const, page: exact };
    return {
      ok: false as const,
      error: "A Facebook Page informada nao esta acessivel pelo token Meta conectado.",
    };
  }

  if (preferredInstagramId) {
    const byInstagram = pages.find((page) => page.instagramActorId === preferredInstagramId);
    if (byInstagram) return { ok: true as const, page: byInstagram };
  }

  if (pages.length === 1) {
    return { ok: true as const, page: pages[0] };
  }

  const pagesWithInstagram = pages.filter((page) => page.instagramActorId);
  if (pagesWithInstagram.length === 1) {
    return { ok: true as const, page: pagesWithInstagram[0] };
  }

  return {
    ok: false as const,
    error: "Nao foi possivel identificar automaticamente a Page desse cliente. Informe a Page na campanha ou configure o Instagram Business ID do cliente.",
  };
}

async function loadPageWhatsAppContext(accessToken: string, pageId: string) {
  const attempts = [
    "connected_whatsapp_number,whatsapp_business_account{id,name}",
    "whatsapp_business_account{id,name}",
    "connected_whatsapp_number",
  ];

  let lastError: string | null = null;
  for (const fields of attempts) {
    const response = await getMeta(pageId, { fields }, accessToken);
    if (response.ok === true) return { ok: true as const, raw: response.raw };
    lastError = response.error;
    if (!isFieldSupportError(response.error)) {
      return response;
    }
  }

  return {
    ok: false as const,
    error: lastError ?? "Nao foi possivel consultar os dados de WhatsApp dessa Page na Meta.",
  };
}

async function resolveClientWhatsappFromMeta(
  accessToken: string,
  page: PageSummary,
  currentClientWhatsapp: string | null
): Promise<ResolvedWhatsapp> {
  const pageContext = await loadPageWhatsAppContext(accessToken, page.id);
  if (pageContext.ok === false) return pageContext;

  const connectedWhatsappRaw = asString(pageContext.raw.connected_whatsapp_number);
  const connectedWhatsapp = normalizePhoneDigits(connectedWhatsappRaw);
  if (connectedWhatsapp) {
    return {
      ok: true,
      whatsapp: connectedWhatsapp,
      displayPhoneNumber: connectedWhatsappRaw || connectedWhatsapp,
      source: "connected_whatsapp_number",
      warning: null,
    };
  }

  const waba = asObject(pageContext.raw.whatsapp_business_account);
  const wabaId = asString(waba.id);
  if (!wabaId) {
    return {
      ok: false,
      error: "Essa Page nao tem um WhatsApp conectado na Meta ou o token atual nao consegue ler esse vinculo.",
    };
  }

  const phonesResponse = await getMeta(
    `${wabaId}/phone_numbers`,
    {
      fields: "display_phone_number,verified_name,quality_rating,name_status",
      limit: "10",
    },
    accessToken
  );

  if (phonesResponse.ok === false) {
    return phonesResponse;
  }

  const rawPhones = Array.isArray(phonesResponse.raw.data) ? (phonesResponse.raw.data as JsonRecord[]) : [];
  const options = rawPhones
    .map((item) => ({
      normalized: normalizePhoneDigits(item.display_phone_number),
      displayPhoneNumber: asString(item.display_phone_number) || null,
      verifiedName: asString(item.verified_name) || null,
    }))
    .filter((item) => item.normalized);

  if (options.length === 0) {
    return {
      ok: false,
      error: "A conta de WhatsApp Business foi encontrada, mas nao retornou nenhum numero disponivel.",
    };
  }

  const hintedNumber = normalizePhoneDigits(currentClientWhatsapp);
  const selected =
    options.find((item) => item.normalized === hintedNumber) ??
    options[0];

  return {
    ok: true,
    whatsapp: selected.normalized,
    displayPhoneNumber: selected.displayPhoneNumber,
    source: "whatsapp_business_account_phone_numbers",
    warning:
      options.length > 1 && selected.normalized !== hintedNumber
        ? "A Meta retornou mais de um numero para essa conta. A Erizon usou o primeiro disponivel."
        : null,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const { id: clientId } = await context.params;
  const preferredPageId = asString(req.nextUrl.searchParams.get("pageId")) || null;
  const db = createServerSupabase();

  const { data: client, error: clientError } = await db
    .from("clientes")
    .select("id, nome, nome_cliente, meta_account_id, ig_user_id, whatsapp")
    .eq("id", clientId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  if (!client) {
    return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
  }

  const typedClient = client as ClientMetaRow;
  const credentials = await resolveMetaAccessToken(db, auth.user.id, typedClient.meta_account_id);
  if (credentials.ok === false) {
    return NextResponse.json({ error: credentials.error }, { status: 400 });
  }

  const pages = await listAccessiblePages(credentials.accessToken);
  if (pages.ok === false) {
    return NextResponse.json({ error: pages.error }, { status: 400 });
  }

  if (pages.pages.length === 0) {
    return NextResponse.json({
      error: "Nenhuma Facebook Page acessivel foi encontrada para esse token Meta.",
    }, { status: 400 });
  }

  const resolvedPage = resolvePageForClient(pages.pages, typedClient.ig_user_id, preferredPageId);
  if (resolvedPage.ok === false) {
    return NextResponse.json({ error: resolvedPage.error }, { status: 400 });
  }

  const resolvedWhatsapp = await resolveClientWhatsappFromMeta(
    credentials.accessToken,
    resolvedPage.page,
    typedClient.whatsapp
  );

  if (resolvedWhatsapp.ok === false) {
    return NextResponse.json({ error: resolvedWhatsapp.error }, { status: 400 });
  }

  const storedWhatsapp = normalizePhoneDigits(typedClient.whatsapp);
  let savedToClient = false;
  let saveError: string | null = null;

  if (resolvedWhatsapp.whatsapp !== storedWhatsapp) {
    const { error } = await db
      .from("clientes")
      .update({ whatsapp: resolvedWhatsapp.whatsapp })
      .eq("id", typedClient.id)
      .eq("user_id", auth.user.id);

    if (error) {
      saveError = error.message;
    } else {
      savedToClient = true;
    }
  }

  return NextResponse.json({
    ok: true,
    whatsapp: resolvedWhatsapp.whatsapp,
    displayPhoneNumber: resolvedWhatsapp.displayPhoneNumber ?? resolvedWhatsapp.whatsapp,
    source: resolvedWhatsapp.source,
    warning: resolvedWhatsapp.warning,
    page: {
      id: resolvedPage.page.id,
      name: resolvedPage.page.name,
    },
    savedToClient,
    saveError,
    client: {
      id: typedClient.id,
      name: typedClient.nome_cliente ?? typedClient.nome ?? "Cliente",
      whatsapp: resolvedWhatsapp.whatsapp,
    },
  });
}
