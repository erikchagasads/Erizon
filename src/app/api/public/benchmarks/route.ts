import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const QuerySchema = z.object({
  niche: z.string().min(2).max(80).optional(),
  metric: z.enum(["cpl", "roas", "ctr", "frequency", "all"]).default("all"),
  period: z.enum(["7d", "30d", "90d"]).default("30d"),
  platform: z.enum(["meta", "google", "tiktok", "linkedin", "all"]).default("meta"),
  percentile: z.enum(["p25", "p50", "p75", "all"]).default("all"),
});

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

async function validateApiKey(key: string) {
  if (!key) return { valid: false, plan: "free" as const };

  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("user_id, plan, active")
    .eq("key_hash", hashKey(key))
    .eq("active", true)
    .maybeSingle();

  if (!data) return { valid: false, plan: "free" as const };

  return {
    valid: true,
    plan: (data.plan ?? "free") as "free" | "pro" | "enterprise",
    userId: data.user_id,
  };
}

async function checkRateLimit(keyHash: string, plan: string): Promise<boolean> {
  const limits: Record<string, number> = { free: 100, pro: 1000, enterprise: 10000 };
  const limit = limits[plan] ?? 100;
  const hour = new Date().toISOString().slice(0, 13);

  const { count } = await supabaseAdmin
    .from("api_key_requests")
    .select("id", { count: "exact", head: true })
    .eq("key_hash", keyHash)
    .gte("created_at", `${hour}:00:00Z`);

  return (count ?? 0) < limit;
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-erizon-key") ?? req.nextUrl.searchParams.get("key") ?? "";
  const keyHash = hashKey(apiKey);

  const auth = await validateApiKey(apiKey);
  if (!auth.valid) {
    return NextResponse.json({ error: "API key invalida.", docs: "/docs/api/benchmarks" }, { status: 401 });
  }

  const allowed = await checkRateLimit(keyHash, auth.plan);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit atingido.", upgrade: "https://app.erizonai.com.br/billing" },
      { status: 429 }
    );
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parametros invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { niche, metric, period, platform, percentile } = parsed.data;
  const periodDays: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const since = new Date();
  since.setDate(since.getDate() - periodDays[period]);

  let query = supabaseAdmin
    .from("network_benchmarks")
    .select(
      "niche, platform, week_start, cpl_p25, cpl_p50, cpl_p75, roas_p25, roas_p50, roas_p75, ctr_p50, frequency_p50, n_workspaces"
    )
    .gte("week_start", since.toISOString().split("T")[0])
    .order("week_start", { ascending: false });

  if (niche) query = query.ilike("niche", `%${niche}%`);
  if (platform !== "all") query = query.eq("platform", platform);

  const { data: rows, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  type BenchmarkRow = {
    niche: string;
    platform: string;
    cpl_p25: number;
    cpl_p50: number;
    cpl_p75: number;
    roas_p25: number;
    roas_p50: number;
    roas_p75: number;
    ctr_p50: number;
    frequency_p50: number;
    n_workspaces: number;
  };

  const byNiche: Record<string, BenchmarkRow[]> = {};
  for (const row of (rows ?? []) as BenchmarkRow[]) {
    const compositeKey = `${row.niche}::${row.platform}`;
    if (!byNiche[compositeKey]) byNiche[compositeKey] = [];
    byNiche[compositeKey].push(row);
  }

  function avg(values: number[]) {
    if (!values.length) return null;
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
  }

  const result = Object.entries(byNiche).map(([compositeKey, entries]) => {
    const [nicheKey, platformKey] = compositeKey.split("::");
    const metrics: Record<string, unknown> = {};

    if (metric === "cpl" || metric === "all") {
      metrics.cpl = {
        ...(percentile !== "p50" && percentile !== "p75" ? { p25: avg(entries.map((entry) => entry.cpl_p25)) } : {}),
        ...(percentile !== "p25" && percentile !== "p75" ? { p50: avg(entries.map((entry) => entry.cpl_p50)) } : {}),
        ...(percentile !== "p25" && percentile !== "p50" ? { p75: avg(entries.map((entry) => entry.cpl_p75)) } : {}),
        unit: "BRL",
      };
    }

    if (metric === "roas" || metric === "all") {
      metrics.roas = {
        ...(percentile !== "p50" && percentile !== "p75" ? { p25: avg(entries.map((entry) => entry.roas_p25)) } : {}),
        ...(percentile !== "p25" && percentile !== "p75" ? { p50: avg(entries.map((entry) => entry.roas_p50)) } : {}),
        ...(percentile !== "p25" && percentile !== "p50" ? { p75: avg(entries.map((entry) => entry.roas_p75)) } : {}),
        unit: "x",
      };
    }

    if (metric === "ctr" || metric === "all") {
      metrics.ctr = { p50: avg(entries.map((entry) => entry.ctr_p50)), unit: "%" };
    }

    if (metric === "frequency" || metric === "all") {
      metrics.frequency = { p50: avg(entries.map((entry) => entry.frequency_p50)), unit: "x" };
    }

    return {
      niche: nicheKey,
      platform: platformKey,
      period,
      sample_size: entries.reduce((sum, entry) => sum + (entry.n_workspaces ?? 0), 0),
      metrics,
    };
  });

  void supabaseAdmin.from("api_key_requests").insert({
    key_hash: keyHash,
    endpoint: "/api/public/benchmarks",
    params: { niche, metric, period },
    status_code: 200,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      ok: true,
      query: { niche, metric, period, platform, percentile },
      count: result.length,
      benchmarks: result,
      generated_at: new Date().toISOString(),
      docs: "/docs/api/benchmarks",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600",
        "X-Erizon-Plan": auth.plan,
      },
    }
  );
}
