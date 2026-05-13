import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export type ApiKeyPlan = "free" | "pro" | "enterprise";

type ApiKeyAuthSuccess = {
  ok: true;
  keyHash: string;
  plan: ApiKeyPlan;
  userId: string;
};

type ApiKeyAuthFailure = {
  ok: false;
  error: string;
  status: number;
};

export type ApiKeyAuthResult = ApiKeyAuthSuccess | ApiKeyAuthFailure;

export type ApiKeyRateLimits = Record<ApiKeyPlan, number>;

const DEFAULT_RATE_LIMITS: ApiKeyRateLimits = {
  free: 100,
  pro: 1000,
  enterprise: 10000,
};

function getApiKeyFromRequest(
  request: NextRequest,
  options?: { allowQueryParam?: boolean },
): string {
  const headerKey = request.headers.get("x-erizon-key")?.trim();
  if (headerKey) return headerKey;

  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const bearerKey = authHeader.slice(7).trim();
    if (bearerKey) return bearerKey;
  }

  if (options?.allowQueryParam) {
    return request.nextUrl.searchParams.get("key")?.trim() ?? "";
  }

  return "";
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export async function requireApiKeyAuth(
  request: NextRequest,
  options?: { allowQueryParam?: boolean },
): Promise<ApiKeyAuthResult> {
  const apiKey = getApiKeyFromRequest(request, options);
  if (!apiKey) {
    return {
      ok: false,
      error: "API key obrigatoria. Envie x-erizon-key ou Authorization: Bearer <key>.",
      status: 401,
    };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id, plan, active, expires_at")
    .eq("key_hash", hashApiKey(apiKey))
    .eq("active", true)
    .maybeSingle();

  if (error || !data?.user_id) {
    return { ok: false, error: "API key invalida.", status: 401 };
  }

  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: "API key expirada.", status: 401 };
  }

  return {
    ok: true,
    keyHash: hashApiKey(apiKey),
    plan: (data.plan ?? "free") as ApiKeyPlan,
    userId: data.user_id,
  };
}

export async function checkApiKeyRateLimit(
  keyHash: string,
  plan: ApiKeyPlan,
  overrides?: Partial<ApiKeyRateLimits>,
): Promise<boolean> {
  const limits: ApiKeyRateLimits = { ...DEFAULT_RATE_LIMITS, ...overrides };
  const limit = limits[plan] ?? DEFAULT_RATE_LIMITS.free;
  const hourStart = new Date().toISOString().slice(0, 13);

  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from("api_key_requests")
    .select("id", { count: "exact", head: true })
    .eq("key_hash", keyHash)
    .gte("created_at", `${hourStart}:00:00Z`);

  if (error) return false;
  return (count ?? 0) < limit;
}

export async function recordApiKeyRequest(input: {
  keyHash: string;
  endpoint: string;
  params?: Record<string, unknown>;
  statusCode: number;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  await Promise.allSettled([
    supabase.from("api_key_requests").insert({
      key_hash: input.keyHash,
      endpoint: input.endpoint,
      params: input.params ?? null,
      status_code: input.statusCode,
      created_at: now,
    }),
    supabase
      .from("api_keys")
      .update({ last_used_at: now })
      .eq("key_hash", input.keyHash),
  ]);
}
