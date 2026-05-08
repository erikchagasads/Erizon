import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createServerSupabase } from "@/lib/supabase/server";

const META_API_VERSION = "v19.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PublishBody = {
  activateOnMeta?: boolean;
};

type JsonRecord = Record<string, unknown>;

type CampaignRow = {
  id: string;
  user_id: string;
  cliente_id: string | null;
  nome_campanha: string | null;
  status: string | null;
  preflight_status: string | null;
  preflight_score: number | null;
  meta_account_id: string | null;
  objective: string | null;
  plataforma: string | null;
  orcamento: number | string | null;
  draft_payload: JsonRecord | null;
};

type BmAccountRow = {
  id: string;
  nome: string | null;
  bm_name: string | null;
  access_token: string | null;
  ad_account_id: string | null;
  ad_account_ids: string[] | null;
  ativo: boolean | null;
  status: string | null;
};

type ClientLaunchRow = {
  id: string;
  meta_account_id: string | null;
  facebook_pixel_id: string | null;
  ig_user_id: string | null;
  whatsapp: string | null;
};

type MetaCredentials =
  | {
      ok: true;
      accessToken: string;
      accountId: string;
      source: "bm_accounts" | "user_settings";
    }
  | { ok: false; error: string };

type MetaPostResult =
  | { ok: true; id: string; raw: JsonRecord }
  | { ok: false; error: string; raw: JsonRecord | null };

type PageContext =
  | {
      ok: true;
      pageId: string;
      pageName: string;
      instagramActorId: string | null;
    }
  | { ok: false; error: string };

type UploadedAsset =
  | { type: "image"; imageHash: string; raw: JsonRecord }
  | { type: "video"; videoId: string; raw: JsonRecord };

type TargetingResolution = {
  targeting: JsonRecord;
  warnings: string[];
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

function getBmAccountIds(bm: BmAccountRow) {
  const ids = [
    bm.ad_account_id,
    ...(Array.isArray(bm.ad_account_ids) ? bm.ad_account_ids : []),
  ]
    .map((id) => normalizeAccountId(String(id ?? "")))
    .filter(Boolean);

  return [...new Set(ids)];
}

function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asString(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function cents(value: unknown): string {
  const parsed = asNumber(value) ?? 0;
  return String(Math.max(100, Math.round(parsed * 100)));
}

function normalizeUrl(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^wa\.me\//i.test(raw)) return `https://${raw}`;
  return `https://${raw}`;
}

function mapMetaObjective(value: unknown) {
  const objective = String(value ?? "LEADS").trim().toUpperCase();
  if (objective.startsWith("OUTCOME_")) return objective;

  if (["LEADS", "LEAD", "LEAD_GENERATION"].includes(objective)) return "OUTCOME_LEADS";
  if (["SALES", "SALE", "CONVERSIONS", "CONVERSION", "PURCHASES"].includes(objective)) return "OUTCOME_SALES";
  if (["TRAFFIC", "TRAFEGO", "LINK_CLICKS"].includes(objective)) return "OUTCOME_TRAFFIC";
  if (["AWARENESS", "REACH", "BRAND_AWARENESS"].includes(objective)) return "OUTCOME_AWARENESS";
  if (["ENGAGEMENT", "POST_ENGAGEMENT", "MESSAGES"].includes(objective)) return "OUTCOME_ENGAGEMENT";
  if (["APP", "APP_PROMOTION"].includes(objective)) return "OUTCOME_APP_PROMOTION";

  return "OUTCOME_LEADS";
}

function parseMetaErrorData(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parseMetaErrorData(parsed);
    } catch {
      return {};
    }
  }

  return {};
}

function metaErrorMessage(data: JsonRecord, fallback = "Erro ao publicar no Meta.") {
  const error = data.error as JsonRecord | undefined;
  if (!error) return fallback;

  const code = Number(error.code);
  const message = String(error.message ?? fallback);
  const userTitle = asString(error.error_user_title);
  const userMessage = asString(error.error_user_msg);
  const errorData = parseMetaErrorData(error.error_data);
  const blameFieldSpecs = Array.isArray(errorData.blame_field_specs)
    ? errorData.blame_field_specs.flatMap((group) => Array.isArray(group) ? group.map((item) => String(item)) : [])
    : [];
  const blameText = blameFieldSpecs.length > 0
    ? ` Campos: ${[...new Set(blameFieldSpecs)].join(", ")}.`
    : "";

  if (code === 190) return "Token do Meta expirado. Atualize a integracao antes de publicar.";
  if (code === 200 || code === 294) return "Permissao insuficiente. O token precisa de ads_management e acesso a Page/conta de anuncios.";
  if (code === 100) {
    const detail = [userTitle, userMessage].filter(Boolean).join(" — ");
    return `Meta recusou o setup: ${detail || message}.${blameText}`.trim();
  }

  return `Meta API (${code || "erro"}): ${message}`;
}

async function postMetaForm(
  path: string,
  fields: Record<string, string>,
  fallback: string
): Promise<MetaPostResult> {
  const body = new URLSearchParams(fields);

  let response: Response;
  try {
    response = await fetch(`${META_BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha de rede ao chamar a Meta.",
      raw: null,
    };
  }

  const data = (await response.json().catch(() => ({}))) as JsonRecord;
  if (!response.ok || data.error || !data.id) {
    return { ok: false, error: metaErrorMessage(data, fallback), raw: data };
  }

  return { ok: true, id: String(data.id), raw: data };
}

async function postMetaMultipart(
  path: string,
  fields: Record<string, string>,
  file: { field: string; blob: Blob; fileName: string } | null,
  fallback: string
): Promise<{ ok: true; raw: JsonRecord } | { ok: false; error: string; raw: JsonRecord | null }> {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  if (file) body.append(file.field, file.blob, file.fileName);

  let response: Response;
  try {
    response = await fetch(`${META_BASE}/${path}`, {
      method: "POST",
      body,
      cache: "no-store",
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha de rede ao chamar a Meta.",
      raw: null,
    };
  }

  const data = (await response.json().catch(() => ({}))) as JsonRecord;
  if (!response.ok || data.error) {
    return { ok: false, error: metaErrorMessage(data, fallback), raw: data };
  }

  return { ok: true, raw: data };
}

async function getMeta(
  path: string,
  params: Record<string, string>,
  accessToken: string
): Promise<{ ok: true; raw: JsonRecord } | { ok: false; error: string; raw: JsonRecord | null }> {
  const url = new URL(`${META_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("access_token", accessToken);

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as JsonRecord;
    if (!response.ok || data.error) {
      return { ok: false, error: metaErrorMessage(data, "Erro ao consultar a Meta."), raw: data };
    }
    return { ok: true, raw: data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha de rede ao consultar a Meta.",
      raw: null,
    };
  }
}

async function resolveMetaCredentials(
  db: ReturnType<typeof createServerSupabase>,
  userId: string,
  campaign: CampaignRow
): Promise<MetaCredentials> {
  let targetAccountId = normalizeAccountId(String(campaign.meta_account_id ?? ""));

  if (!targetAccountId && campaign.cliente_id) {
    const { data: client } = await db
      .from("clientes")
      .select("meta_account_id")
      .eq("id", campaign.cliente_id)
      .eq("user_id", userId)
      .maybeSingle();

    targetAccountId = normalizeAccountId(String(client?.meta_account_id ?? ""));
  }

  const [{ data: bms }, { data: settings }] = await Promise.all([
    db
      .from("bm_accounts")
      .select("id, nome, bm_name, access_token, ad_account_id, ad_account_ids, ativo, status")
      .eq("user_id", userId),
    db
      .from("user_settings")
      .select("meta_access_token, meta_ad_account_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const activeBms = ((bms ?? []) as BmAccountRow[]).filter((bm) => {
    const token = cleanToken(String(bm.access_token ?? ""));
    const isActive = bm.ativo !== false && String(bm.status ?? "ativo").toLowerCase() !== "inativo";
    return token && isActive;
  });

  const matchingBm = targetAccountId
    ? activeBms.find((bm) => getBmAccountIds(bm).includes(targetAccountId))
    : activeBms[0];

  if (matchingBm) {
    const accountId =
      targetAccountId && getBmAccountIds(matchingBm).includes(targetAccountId)
        ? targetAccountId
        : getBmAccountIds(matchingBm)[0];
    const accessToken = cleanToken(String(matchingBm.access_token ?? ""));

    if (accountId && accessToken) {
      return { ok: true, accountId, accessToken, source: "bm_accounts" };
    }
  }

  const fallbackAccountId = normalizeAccountId(
    targetAccountId || String(settings?.meta_ad_account_id ?? "")
  );
  const fallbackToken = cleanToken(String(settings?.meta_access_token ?? ""));

  if (fallbackAccountId && fallbackToken) {
    return {
      ok: true,
      accountId: fallbackAccountId,
      accessToken: fallbackToken,
      source: "user_settings",
    };
  }

  if (!fallbackAccountId) {
    return {
      ok: false,
      error: "Conta de anuncios Meta nao definida. Vincule o Account ID no cliente ou em Configuracoes.",
    };
  }

  return {
    ok: false,
    error: "Token Meta com ads_management nao configurado. Atualize a integracao antes de publicar.",
  };
}

async function getClientLaunchData(
  db: ReturnType<typeof createServerSupabase>,
  userId: string,
  campaign: CampaignRow
): Promise<ClientLaunchRow | null> {
  if (!campaign.cliente_id) return null;

  const { data } = await db
    .from("clientes")
    .select("id, meta_account_id, facebook_pixel_id, ig_user_id, whatsapp")
    .eq("id", campaign.cliente_id)
    .eq("user_id", userId)
    .maybeSingle();

  return data as ClientLaunchRow | null;
}

async function resolvePageContext(
  accessToken: string,
  preferredInstagramId: string | null,
  preferredPageId: string | null
): Promise<PageContext> {
  const pages = await getMeta(
    "me/accounts",
    {
      fields: "id,name,instagram_business_account{id,username}",
      limit: "50",
    },
    accessToken
  );

  if (pages.ok === false) return { ok: false, error: pages.error };

  const data = Array.isArray(pages.raw.data) ? pages.raw.data as JsonRecord[] : [];
  if (data.length === 0) {
    return {
      ok: false,
      error: "Nenhuma Facebook Page acessivel pelo token. Conecte uma Page ao Business Manager antes de publicar anuncios.",
    };
  }

  if (preferredPageId) {
    const selected = data.find((page) => String(page.id ?? "") === preferredPageId);
    if (!selected) {
      return {
        ok: false,
        error: "A Facebook Page informada nao esta acessivel pelo token Meta conectado.",
      };
    }

    const instagram = asObject(selected.instagram_business_account);
    return {
      ok: true,
      pageId: String(selected.id),
      pageName: String(selected.name ?? "Facebook Page"),
      instagramActorId: preferredInstagramId || (instagram.id ? String(instagram.id) : null),
    };
  }

  const preferred = preferredInstagramId
    ? data.find((page) => String(asObject(page.instagram_business_account).id ?? "") === preferredInstagramId)
    : null;
  const withInstagram = data.find((page) => asObject(page.instagram_business_account).id);
  const selected = preferred ?? withInstagram ?? data[0];
  const instagram = asObject(selected.instagram_business_account);

  return {
    ok: true,
    pageId: String(selected.id),
    pageName: String(selected.name ?? "Facebook Page"),
    instagramActorId: preferredInstagramId || (instagram.id ? String(instagram.id) : null),
  };
}

async function resolveGeoLocations(
  accessToken: string,
  locations: string[]
): Promise<{ geo: JsonRecord; warnings: string[] }> {
  const warnings: string[] = [];
  const geo: JsonRecord = { countries: [] as string[] };
  const cities: JsonRecord[] = [];
  const regions: JsonRecord[] = [];

  const requested = locations.length > 0 ? locations : ["Brasil"];
  for (const location of requested.slice(0, 8)) {
    const normalized = location.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (["br", "bra", "brasil", "brazil"].includes(normalized)) {
      (geo.countries as string[]).push("BR");
      continue;
    }

    const found = await getMeta(
      "search",
      {
        type: "adgeolocation",
        location_types: JSON.stringify(["city", "region", "country"]),
        q: location,
        limit: "5",
      },
      accessToken
    );

    if (found.ok === false) {
      warnings.push(`Nao foi possivel resolver localizacao "${location}": ${found.error}`);
      continue;
    }

    const options = Array.isArray(found.raw.data) ? found.raw.data as JsonRecord[] : [];
    const best = options[0];
    if (!best?.key) {
      warnings.push(`Localizacao "${location}" nao encontrada na Meta; usando Brasil como fallback.`);
      continue;
    }

    const type = String(best.type ?? "");
    if (type === "country") {
      (geo.countries as string[]).push(String(best.country_code ?? "BR"));
    } else if (type === "region") {
      regions.push({ key: String(best.key) });
    } else {
      cities.push({ key: String(best.key), radius: 25, distance_unit: "kilometer" });
    }
  }

  if ((geo.countries as string[]).length === 0 && cities.length === 0 && regions.length === 0) {
    (geo.countries as string[]).push("BR");
  }

  geo.countries = [...new Set(geo.countries as string[])];
  if (cities.length > 0) geo.cities = cities;
  if (regions.length > 0) geo.regions = regions;
  return { geo, warnings };
}

async function resolveInterestTargeting(
  accessToken: string,
  names: string[]
): Promise<{ interests: JsonRecord[]; warnings: string[] }> {
  const interests: JsonRecord[] = [];
  const warnings: string[] = [];
  const unique = [...new Set(names.map((item) => item.trim()).filter(Boolean))].slice(0, 12);

  for (const name of unique) {
    const found = await getMeta(
      "search",
      {
        type: "adinterest",
        q: name,
        limit: "3",
      },
      accessToken
    );

    if (found.ok === false) {
      warnings.push(`Nao foi possivel buscar interesse "${name}": ${found.error}`);
      continue;
    }

    const data = Array.isArray(found.raw.data) ? found.raw.data as JsonRecord[] : [];
    const best = data[0];
    if (best?.id && best?.name) {
      interests.push({ id: String(best.id), name: String(best.name) });
    } else {
      warnings.push(`Interesse "${name}" nao encontrado na Meta; ele ficou salvo apenas no draft.`);
    }
  }

  return { interests, warnings };
}

function mapPlacementTargeting(placements: JsonRecord): JsonRecord {
  if (placements.advantagePlus !== false) return {};

  const selected = asStringArray(placements.selected);
  const publisherPlatforms = asStringArray(placements.platforms);
  const devices = asStringArray(placements.devices);
  const targeting: JsonRecord = {};

  if (publisherPlatforms.length > 0) targeting.publisher_platforms = publisherPlatforms;
  if (devices.length === 1) targeting.device_platforms = devices;

  const facebookPositions = selected
    .filter((item) => item.startsWith("facebook_"))
    .map((item) => item.replace("facebook_", ""));
  const instagramPositions = selected
    .filter((item) => item.startsWith("instagram_"))
    .map((item) => item.replace("instagram_", ""));
  const messengerPositions = selected
    .filter((item) => item.startsWith("messenger_"))
    .map((item) => item.replace("messenger_", ""));

  if (facebookPositions.length > 0) targeting.facebook_positions = facebookPositions;
  if (instagramPositions.length > 0) targeting.instagram_positions = instagramPositions;
  if (messengerPositions.length > 0) targeting.messenger_positions = messengerPositions;
  if (selected.includes("audience_network")) targeting.audience_network_positions = ["classic"];

  return targeting;
}

async function buildTargeting(
  accessToken: string,
  draft: JsonRecord
): Promise<TargetingResolution> {
  const audience = asObject(draft.audience);
  const placements = asObject(draft.placements);
  const locations = asStringArray(audience.locations);
  const warnings: string[] = [];
  const { geo, warnings: geoWarnings } = await resolveGeoLocations(accessToken, locations);
  warnings.push(...geoWarnings);

  const targeting: JsonRecord = {
    geo_locations: geo,
    age_min: Math.max(18, asNumber(audience.ageMin) ?? 18),
    age_max: Math.min(65, asNumber(audience.ageMax) ?? 65),
    ...mapPlacementTargeting(placements),
  };

  const gender = asString(audience.gender, "all");
  if (gender === "male") targeting.genders = [1];
  if (gender === "female") targeting.genders = [2];

  const interestNames = asStringArray(audience.interests);
  if (interestNames.length > 0) {
    const { interests, warnings: interestWarnings } = await resolveInterestTargeting(accessToken, interestNames);
    warnings.push(...interestWarnings);
    if (interests.length > 0) targeting.flexible_spec = [{ interests }];
  }

  return { targeting, warnings };
}

function buildAdSetFields(params: {
  accessToken: string;
  name: string;
  campaignId: string;
  draft: JsonRecord;
  metaObjective: string;
  pageId: string;
  pixelId: string | null;
  targeting: JsonRecord;
  status: "ACTIVE" | "PAUSED";
}): { ok: true; fields: Record<string, string> } | { ok: false; error: string } {
  let optimizationGoal = "LINK_CLICKS";
  let promotedObject: JsonRecord | null = null;
  let destinationType: string | null = null;
  const creative = asObject(params.draft.criativo);
  const destinationUrl = normalizeUrl(creative.destinationUrl ?? params.draft.urlDestino);
  const cta = asString(creative.cta, "LEARN_MORE");

  if (cta === "WHATSAPP_MESSAGE") {
    return {
      ok: false,
      error: "CTA de WhatsApp ainda nao esta suportado na publicacao automatica da Erizon. Use Saiba mais, Cadastre-se, Fale conosco ou Comprar agora.",
    };
  }

  if (params.metaObjective === "OUTCOME_SALES") {
    if (!params.pixelId) {
      return {
        ok: false,
        error: "Para publicar campanha de vendas completa, configure o Pixel do Facebook no cliente.",
      };
    }
    optimizationGoal = "OFFSITE_CONVERSIONS";
    promotedObject = { pixel_id: params.pixelId, custom_event_type: "PURCHASE" };
    destinationType = "WEBSITE";
  } else if (params.metaObjective === "OUTCOME_LEADS") {
    if (!params.pixelId) {
      return {
        ok: false,
        error: "Para publicar campanhas de leads pela Erizon, informe um Pixel Meta no cliente. Fluxos de formulario instantaneo e WhatsApp ainda nao estao automatizados.",
      };
    }
    if (!destinationUrl) {
      return {
        ok: false,
        error: "Informe a URL destino do anuncio antes de publicar a campanha de leads.",
      };
    }
    optimizationGoal = "OFFSITE_CONVERSIONS";
    promotedObject = { pixel_id: params.pixelId, custom_event_type: "LEAD" };
    destinationType = "WEBSITE";
  } else if (params.metaObjective === "OUTCOME_AWARENESS") {
    optimizationGoal = "REACH";
  } else if (params.metaObjective === "OUTCOME_ENGAGEMENT") {
    optimizationGoal = "POST_ENGAGEMENT";
    promotedObject = { page_id: params.pageId };
  } else if (params.metaObjective === "OUTCOME_TRAFFIC") {
    destinationType = "WEBSITE";
  }

  const fields: Record<string, string> = {
    name: `${params.name} | Conjunto 1`,
    campaign_id: params.campaignId,
    status: params.status,
    daily_budget: cents(params.draft.orcamentoDiario ?? params.draft.orcamento),
    billing_event: "IMPRESSIONS",
    optimization_goal: optimizationGoal,
    targeting: JSON.stringify(params.targeting),
    access_token: params.accessToken,
  };

  if (promotedObject) fields.promoted_object = JSON.stringify(promotedObject);
  if (destinationType) fields.destination_type = destinationType;

  return { ok: true, fields };
}

async function downloadCreativeAsset(
  db: ReturnType<typeof createServerSupabase>,
  draft: JsonRecord
): Promise<
  | { ok: true; blob: Blob; fileName: string; mimeType: string }
  | { ok: false; error: string }
> {
  const creative = asObject(draft.criativo);
  const media = asObject(creative.media);
  const bucket = asString(media.bucket);
  const path = asString(media.path);
  const fileName = asString(media.fileName, "criativo");
  const mimeType = asString(media.mimeType, "application/octet-stream");

  if (!bucket || !path) {
    return { ok: false, error: "Suba o arquivo criativo na Erizon antes de publicar no Meta." };
  }

  const { data, error } = await db.storage.from(bucket).download(path);
  if (error || !data) {
    return {
      ok: false,
      error: `Nao foi possivel ler o criativo salvo na Erizon: ${error?.message ?? "arquivo indisponivel"}`,
    };
  }

  return { ok: true, blob: data, fileName, mimeType };
}

async function uploadAssetToMeta(params: {
  db: ReturnType<typeof createServerSupabase>;
  accountId: string;
  accessToken: string;
  draft: JsonRecord;
}): Promise<{ ok: true; asset: UploadedAsset } | { ok: false; error: string; raw: JsonRecord | null }> {
  const downloaded = await downloadCreativeAsset(params.db, params.draft);
  if (downloaded.ok === false) return { ok: false, error: downloaded.error, raw: null };

  if (downloaded.mimeType.startsWith("video/")) {
    const uploaded = await postMetaMultipart(
      `${params.accountId}/advideos`,
      {
        title: downloaded.fileName,
        description: "Criativo enviado pela Erizon",
        access_token: params.accessToken,
      },
      { field: "source", blob: downloaded.blob, fileName: downloaded.fileName },
      "Erro ao subir video no Meta."
    );
    if (uploaded.ok === false) return uploaded;

    const videoId = asString(uploaded.raw.id);
    if (!videoId) return { ok: false, error: "Meta nao retornou video_id para o criativo.", raw: uploaded.raw };
    return { ok: true, asset: { type: "video", videoId, raw: uploaded.raw } };
  }

  const uploaded = await postMetaMultipart(
    `${params.accountId}/adimages`,
    {
      access_token: params.accessToken,
    },
    { field: "source", blob: downloaded.blob, fileName: downloaded.fileName },
    "Erro ao subir imagem no Meta."
  );
  if (uploaded.ok === false) return uploaded;

  const images = asObject(uploaded.raw.images);
  const firstImage = Object.values(images)[0] as JsonRecord | undefined;
  const imageHash = asString(firstImage?.hash ?? uploaded.raw.hash);
  if (!imageHash) return { ok: false, error: "Meta nao retornou image_hash para o criativo.", raw: uploaded.raw };

  return { ok: true, asset: { type: "image", imageHash, raw: uploaded.raw } };
}

function buildObjectStorySpec(params: {
  draft: JsonRecord;
  asset: UploadedAsset;
  pageId: string;
  instagramActorId: string | null;
}) {
  const creative = asObject(params.draft.criativo);
  const destinationUrl =
    normalizeUrl(creative.destinationUrl ?? params.draft.urlDestino) ||
    `https://www.facebook.com/${params.pageId}`;
  const cta = asString(creative.cta, "LEARN_MORE");
  const message = asString(creative.primaryText, asString(creative.description, "Conheca a oferta."));
  const headline = asString(creative.headline, asString(params.draft.campaignName, "Campanha"));
  const description = asString(creative.description);

  const spec: JsonRecord = {
    page_id: params.pageId,
  };

  if (params.instagramActorId) spec.instagram_actor_id = params.instagramActorId;

  if (params.asset.type === "video") {
    spec.video_data = {
      video_id: params.asset.videoId,
      title: headline,
      message,
      call_to_action: {
        type: cta,
        value: { link: destinationUrl },
      },
    };
    return spec;
  }

  spec.link_data = {
    image_hash: params.asset.imageHash,
    link: destinationUrl,
    message,
    name: headline,
    description: description || undefined,
    call_to_action: {
      type: cta,
      value: { link: destinationUrl },
    },
  };

  return spec;
}

async function createMetaCampaign(params: {
  accountId: string;
  accessToken: string;
  name: string;
  objective: string;
  status: "ACTIVE" | "PAUSED";
}) {
  return postMetaForm(
    `${params.accountId}/campaigns`,
    {
      name: params.name,
      objective: params.objective,
      status: params.status,
      buying_type: "AUCTION",
      special_ad_categories: "[]",
      access_token: params.accessToken,
    },
    "Erro ao criar campanha no Meta."
  );
}

async function createMetaAdCreative(params: {
  accountId: string;
  accessToken: string;
  name: string;
  objectStorySpec: JsonRecord;
}) {
  return postMetaForm(
    `${params.accountId}/adcreatives`,
    {
      name: `${params.name} | Criativo 1`,
      object_story_spec: JSON.stringify(params.objectStorySpec),
      access_token: params.accessToken,
    },
    "Erro ao criar criativo no Meta."
  );
}

async function createMetaAd(params: {
  accountId: string;
  accessToken: string;
  name: string;
  adsetId: string;
  creativeId: string;
  status: "ACTIVE" | "PAUSED";
}) {
  return postMetaForm(
    `${params.accountId}/ads`,
    {
      name: `${params.name} | Anuncio 1`,
      adset_id: params.adsetId,
      creative: JSON.stringify({ creative_id: params.creativeId }),
      status: params.status,
      access_token: params.accessToken,
    },
    "Erro ao criar anuncio no Meta."
  );
}

async function recordPublishError(
  db: ReturnType<typeof createServerSupabase>,
  campaignId: string,
  userId: string,
  message: string,
  partial?: JsonRecord
) {
  await db
    .from("metricas_ads")
    .update({
      meta_publish_error: message,
      meta_publish_requested_at: new Date().toISOString(),
      meta_publish_result: partial ?? {},
      data_atualizacao: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("user_id", userId);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  let body: PublishBody = {};
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    body = {};
  }

  const { id } = await context.params;
  const db = createServerSupabase();

  const { data: campaign, error: fetchError } = await db
    .from("metricas_ads")
    .select("id, user_id, cliente_id, nome_campanha, status, preflight_status, preflight_score, meta_account_id, objective, plataforma, orcamento, draft_payload")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!campaign) {
    return NextResponse.json({ error: "Campanha nao encontrada." }, { status: 404 });
  }

  const typedCampaign = campaign as CampaignRow;
  if (typedCampaign.status !== "rascunho") {
    return NextResponse.json({ error: "Apenas rascunhos podem ser publicados." }, { status: 400 });
  }
  if (typedCampaign.preflight_status !== "avaliada" || typedCampaign.preflight_score == null) {
    return NextResponse.json({ error: "Rode o preflight antes de publicar." }, { status: 400 });
  }
  if (String(typedCampaign.plataforma ?? "meta").toLowerCase() !== "meta") {
    return NextResponse.json({ error: "Publicacao automatica esta habilitada apenas para Meta Ads." }, { status: 400 });
  }

  const draft = asObject(typedCampaign.draft_payload);
  const creative = asObject(draft.criativo);
  const client = await getClientLaunchData(db, auth.user.id, typedCampaign);
  const credentials = await resolveMetaCredentials(db, auth.user.id, typedCampaign);
  if (credentials.ok === false) {
    await recordPublishError(db, id, auth.user.id, credentials.error);
    return NextResponse.json({ error: credentials.error }, { status: 400 });
  }

  const tracking = asObject(draft.tracking);
  const requestedPageId = asString(draft.metaPageId) || asString(tracking.metaPageId) || null;
  const page = await resolvePageContext(credentials.accessToken, client?.ig_user_id ?? null, requestedPageId);
  if (page.ok === false) {
    await recordPublishError(db, id, auth.user.id, page.error);
    return NextResponse.json({ error: page.error }, { status: 400 });
  }

  const metaObjective = mapMetaObjective(typedCampaign.objective ?? draft.objetivo);
  const metaStatus = body.activateOnMeta ? "ACTIVE" : "PAUSED";
  const campaignName =
    typedCampaign.nome_campanha?.trim() ||
    asString(draft.campaignName) ||
    `Campanha Erizon ${new Date().toLocaleDateString("pt-BR")}`;
  const pixelId =
    asString(draft.metaPixelId) ||
    asString(tracking.metaPixelId) ||
    asString(client?.facebook_pixel_id) ||
    null;
  const destinationUrl = normalizeUrl(creative.destinationUrl ?? draft.urlDestino);

  if (["OUTCOME_LEADS", "OUTCOME_SALES", "OUTCOME_TRAFFIC"].includes(metaObjective) && !destinationUrl) {
    const message = "Informe a URL destino do anuncio antes de publicar no Meta.";
    await recordPublishError(db, id, auth.user.id, message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const partial: JsonRecord = {
    accountId: credentials.accountId,
    objective: metaObjective,
    status: metaStatus,
    source: credentials.source,
    pageId: page.pageId,
    pageName: page.pageName,
    instagramActorId: page.instagramActorId,
    pixelId,
    steps: [],
  };

  const uploadedAsset = await uploadAssetToMeta({
    db,
    accountId: credentials.accountId,
    accessToken: credentials.accessToken,
    draft,
  });
  if (uploadedAsset.ok === false) {
    await recordPublishError(db, id, auth.user.id, uploadedAsset.error, partial);
    return NextResponse.json({ error: uploadedAsset.error, metaResult: uploadedAsset.raw }, { status: 400 });
  }
  partial.asset = uploadedAsset.asset;
  (partial.steps as unknown[]).push("asset_uploaded");

  const createdCampaign = await createMetaCampaign({
    accountId: credentials.accountId,
    accessToken: credentials.accessToken,
    name: campaignName,
    objective: metaObjective,
    status: metaStatus,
  });
  if (createdCampaign.ok === false) {
    await recordPublishError(db, id, auth.user.id, createdCampaign.error, partial);
    return NextResponse.json({ error: createdCampaign.error, metaResult: createdCampaign.raw }, { status: 400 });
  }
  partial.campaignId = createdCampaign.id;
  partial.campaignRaw = createdCampaign.raw;
  (partial.steps as unknown[]).push("campaign_created");

  const targeting = await buildTargeting(credentials.accessToken, draft);
  partial.targeting = targeting.targeting;
  partial.warnings = targeting.warnings;

  const adSetFields = buildAdSetFields({
    accessToken: credentials.accessToken,
    name: campaignName,
    campaignId: createdCampaign.id,
    draft,
    metaObjective,
    pageId: page.pageId,
    pixelId,
    targeting: targeting.targeting,
    status: metaStatus,
  });
  if (adSetFields.ok === false) {
    await recordPublishError(db, id, auth.user.id, adSetFields.error, partial);
    return NextResponse.json({ error: adSetFields.error, metaResult: partial }, { status: 400 });
  }

  const createdAdSet = await postMetaForm(
    `${credentials.accountId}/adsets`,
    adSetFields.fields,
    "Erro ao criar conjunto de anuncios no Meta."
  );
  if (createdAdSet.ok === false) {
    await recordPublishError(db, id, auth.user.id, createdAdSet.error, partial);
    return NextResponse.json({ error: createdAdSet.error, metaResult: createdAdSet.raw }, { status: 400 });
  }
  partial.adsetId = createdAdSet.id;
  partial.adsetRaw = createdAdSet.raw;
  (partial.steps as unknown[]).push("adset_created");

  const objectStorySpec = buildObjectStorySpec({
    draft,
    asset: uploadedAsset.asset,
    pageId: page.pageId,
    instagramActorId: page.instagramActorId,
  });
  partial.objectStorySpec = objectStorySpec;

  const createdCreative = await createMetaAdCreative({
    accountId: credentials.accountId,
    accessToken: credentials.accessToken,
    name: campaignName,
    objectStorySpec,
  });
  if (createdCreative.ok === false) {
    await recordPublishError(db, id, auth.user.id, createdCreative.error, partial);
    return NextResponse.json({ error: createdCreative.error, metaResult: createdCreative.raw }, { status: 400 });
  }
  partial.creativeId = createdCreative.id;
  partial.creativeRaw = createdCreative.raw;
  (partial.steps as unknown[]).push("creative_created");

  const createdAd = await createMetaAd({
    accountId: credentials.accountId,
    accessToken: credentials.accessToken,
    name: campaignName,
    adsetId: createdAdSet.id,
    creativeId: createdCreative.id,
    status: metaStatus,
  });
  if (createdAd.ok === false) {
    await recordPublishError(db, id, auth.user.id, createdAd.error, partial);
    return NextResponse.json({ error: createdAd.error, metaResult: createdAd.raw }, { status: 400 });
  }
  partial.adId = createdAd.id;
  partial.adRaw = createdAd.raw;
  (partial.steps as unknown[]).push("ad_created");

  const now = new Date().toISOString();
  const dbStatus = metaStatus === "ACTIVE" ? "ATIVO" : "PAUSADA";
  const updatePayload = {
    campanha_id: createdCampaign.id,
    meta_campaign_id: createdCampaign.id,
    meta_adset_id: createdAdSet.id,
    meta_creative_id: createdCreative.id,
    meta_ad_id: createdAd.id,
    meta_account_id: credentials.accountId,
    meta_page_id: page.pageId,
    meta_pixel_id: pixelId,
    objective: metaObjective,
    status: dbStatus,
    preflight_status: "publicada",
    approved_at: now,
    approved_by: auth.user.id,
    published_at: now,
    data_inicio: now,
    dias_ativo: 0,
    data_atualizacao: now,
    meta_publish_requested_at: now,
    meta_publish_error: null,
    meta_publish_result: {
      ...partial,
      createdAt: now,
    },
  };

  const { data, error } = await db
    .from("metricas_ads")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id, nome_campanha, status, preflight_status, published_at, meta_campaign_id, meta_account_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, metaResult: partial }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    campaign: data,
    meta: {
      campaignId: createdCampaign.id,
      adsetId: createdAdSet.id,
      creativeId: createdCreative.id,
      adId: createdAd.id,
      accountId: credentials.accountId,
      pageId: page.pageId,
      pixelId,
      status: metaStatus,
      objective: metaObjective,
      warnings: targeting.warnings,
    },
    message:
      metaStatus === "ACTIVE"
        ? "Campanha, conjunto, criativo e anuncio criados no Meta Ads."
        : "Campanha, conjunto, criativo e anuncio criados no Meta Ads em pausa.",
  });
}
