import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createServerSupabase } from "@/lib/supabase/server";

const META_API_VERSION = "v19.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

type JsonRecord = Record<string, unknown>;

type BmAccountRow = {
  access_token: string | null;
  ad_account_id: string | null;
  ad_account_ids: string[] | null;
  ativo: boolean | null;
  status: string | null;
};

type ClientRow = {
  id: string;
  ig_user_id: string | null;
  meta_account_id: string | null;
  nome: string | null;
  nome_cliente: string | null;
};

type InstagramPostSummary = {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaProductType: string | null;
  permalink: string | null;
  previewUrl: string | null;
  timestamp: string | null;
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

function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
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

async function getMeta(path: string, params: Record<string, string>, accessToken: string) {
  const url = new URL(`${META_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("access_token", accessToken);

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as JsonRecord;
    if (!response.ok || data.error) {
      const error = asObject(data.error);
      const message = asString(error.error_user_msg) || asString(error.message) || "Erro ao consultar a Meta.";
      return { ok: false as const, error: message };
    }
    return { ok: true as const, raw: data };
  } catch (error) {
    return {
      ok: false as const,
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
    error: "Token Meta com permissao de Instagram nao configurado. Atualize a integracao antes de listar publicacoes.",
  };
}

function normalizeInstagramPost(item: JsonRecord): InstagramPostSummary {
  const children = Array.isArray(item.children) ? item.children as JsonRecord[] : [];
  const firstChild = children[0] ? asObject(children[0]) : {};
  const previewUrl =
    asString(item.thumbnail_url) ||
    asString(item.media_url) ||
    asString(firstChild.thumbnail_url) ||
    asString(firstChild.media_url) ||
    null;

  return {
    id: asString(item.id),
    caption: asString(item.caption) || null,
    mediaType: asString(item.media_type, "UNKNOWN"),
    mediaProductType: asString(item.media_product_type) || null,
    permalink: asString(item.permalink) || null,
    previewUrl,
    timestamp: asString(item.timestamp) || null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId obrigatorio." }, { status: 400 });
  }

  const db = createServerSupabase();
  const { data: client, error: clientError } = await db
    .from("clientes")
    .select("id, ig_user_id, meta_account_id, nome, nome_cliente")
    .eq("id", clientId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }
  if (!client) {
    return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
  }

  const typedClient = client as ClientRow;
  if (!typedClient.ig_user_id) {
    return NextResponse.json({ error: "Esse cliente ainda nao tem IG User ID configurado." }, { status: 400 });
  }

  const credentials = await resolveMetaAccessToken(db, auth.user.id, typedClient.meta_account_id);
  if (credentials.ok === false) {
    return NextResponse.json({ error: credentials.error }, { status: 400 });
  }

  const posts = await getMeta(
    `${typedClient.ig_user_id}/media`,
    {
      fields: "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}",
      limit: "18",
    },
    credentials.accessToken
  );

  if (posts.ok === false) {
    return NextResponse.json({ error: posts.error }, { status: 400 });
  }

  const raw = Array.isArray(posts.raw.data) ? posts.raw.data as JsonRecord[] : [];
  const items = raw
    .map(normalizeInstagramPost)
    .filter((item) => item.id && item.previewUrl);

  return NextResponse.json({
    ok: true,
    client: {
      id: typedClient.id,
      name: typedClient.nome_cliente ?? typedClient.nome ?? "Cliente",
      igUserId: typedClient.ig_user_id,
    },
    posts: items,
  });
}
