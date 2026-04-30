// src/app/api/meta-actions/route.ts
// Execução autônoma real — pausa, retoma, escala e reduz budget via Meta Graph API.
// Suporta campanhas (campaign) e conjuntos de anúncios (adset).
// SEMPRE usa token do workspace autenticado. Nunca usa env global.
// Inclui: retry automático, shield de gasto, e audit log em autopilot_execution_logs.

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z, validationError } from "@/lib/validate";

const META_API_VERSION = "v19.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

const MetaActionBodySchema = z.object({
  campaignId: z.string().nonempty("campaignId obrigatório"),
  adsetId: z.string().optional(),
  action: z.enum(["PAUSE", "RESUME", "UPDATE_BUDGET", "SCALE_BUDGET", "REDUCE_BUDGET"] as const),
  value: z.number().min(1).optional(),
  pct: z.number().min(1).max(200).optional(),
  workspaceId: z.string().optional(),
  decisionId: z.string().optional(),
});

type MetaActionBody = {
  campaignId: string;
  adsetId?: string;
  action: "PAUSE" | "RESUME" | "UPDATE_BUDGET" | "SCALE_BUDGET" | "REDUCE_BUDGET";
  value?: number;
  pct?: number;
  workspaceId?: string;
  decisionId?: string;
};

async function callMeta(
  objectId: string,
  payload: Record<string, unknown>,
  accessToken: string,
  retries = 2
): Promise<{ success: boolean; error?: string; raw?: unknown }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${META_BASE}/${objectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, access_token: accessToken }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (data.error) {
        const err = data.error as Record<string, unknown>;
        const code = Number(err.code);
        const msg = String(err.message ?? "Meta API error");
        if (code === 190) return { success: false, error: "Token expirado. Atualize em Configurações → Integrações." };
        if (code === 200 || code === 294) return { success: false, error: "Permissão insuficiente. Token precisa de ads_management." };
        if (code === 100) return { success: false, error: `Parâmetro inválido: ${msg}` };
        if (attempt < retries) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
        return { success: false, error: msg, raw: data };
      }
      return { success: true, raw: data };
    } catch (e) {
      if (attempt < retries) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
      return { success: false, error: e instanceof Error ? e.message : "Erro de rede" };
    }
  }
  return { success: false, error: "Máximo de tentativas atingido" };
}

async function getCurrentBudget(objectId: string, accessToken: string): Promise<number | null> {
  try {
    const res = await fetch(`${META_BASE}/${objectId}?fields=daily_budget,lifetime_budget&access_token=${accessToken}`);
    const data = await res.json() as Record<string, unknown>;
    const daily = Number(data.daily_budget ?? 0) / 100;
    const lifetime = Number(data.lifetime_budget ?? 0) / 100;
    return daily > 0 ? daily : lifetime > 0 ? lifetime : null;
  } catch { return null; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function auditLog(db: any, params: {
  workspaceId?: string; userId: string; decisionId?: string;
  campaignId: string; action: string; success: boolean;
  payload: Record<string, unknown>; result: unknown; error?: string;
}) {
  try {
    await db.from("autopilot_execution_logs").insert({
      workspace_id: params.workspaceId ?? null,
      user_id: params.userId,
      decision_id: params.decisionId ?? null,
      campaign_id: params.campaignId,
      action: params.action,
      success: params.success,
      payload: params.payload,
      result: params.result ?? null,
      error_message: params.error ?? null,
      executed_at: new Date().toISOString(),
    });
  } catch { /* audit log nunca bloqueia */ }
}

export async function POST(req: Request) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
    }

    const parsed = MetaActionBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(validationError(parsed), { status: 422 });

    const { campaignId, adsetId, action, value, pct, workspaceId, decisionId }: MetaActionBody = parsed.data;
    const targetId = adsetId ?? campaignId;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(values) { values.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: conta } = await supabase
      .from("user_settings").select("meta_access_token")
      .eq("user_id", user.id).maybeSingle();

    const ACCESS_TOKEN = conta?.meta_access_token ?? "";
    if (!ACCESS_TOKEN) {
      return NextResponse.json({ error: "Nenhuma conta Meta ativa. Configure em Configurações → Integrações." }, { status: 400 });
    }

    // Shield: limite de ações automáticas por dia
    if (workspaceId) {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("autopilot_execution_logs").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).gte("executed_at", `${today}T00:00:00Z`).eq("success", true);
      const { data: cfg } = await supabase
        .from("autopilot_configs").select("max_auto_actions_day")
        .eq("workspace_id", workspaceId).maybeSingle();
      const maxActions = cfg?.max_auto_actions_day ?? 20;
      if ((count ?? 0) >= maxActions) {
        return NextResponse.json({ error: `Shield ativo: limite de ${maxActions} ações/dia atingido.` }, { status: 429 });
      }
    }

    let actionPayload: Record<string, unknown> = {};
    let resolvedBudget: number | null = null;

    if (action === "PAUSE") {
      actionPayload = { status: "PAUSED" };
    } else if (action === "RESUME") {
      actionPayload = { status: "ACTIVE" };
    } else if (action === "UPDATE_BUDGET") {
      if (!value) return NextResponse.json({ error: "value obrigatório para UPDATE_BUDGET" }, { status: 400 });
      resolvedBudget = value;
      actionPayload = { daily_budget: Math.round(value * 100) };
    } else if (action === "SCALE_BUDGET" || action === "REDUCE_BUDGET") {
      const current = await getCurrentBudget(targetId, ACCESS_TOKEN);
      if (!current) return NextResponse.json({ error: "Não foi possível obter o budget atual no Meta." }, { status: 400 });
      const mult = action === "SCALE_BUDGET" ? 1 + (pct ?? 20) / 100 : 1 - (pct ?? 20) / 100;
      resolvedBudget = Math.max(Math.round(current * mult * 100) / 100, 1);
      actionPayload = { daily_budget: Math.round(resolvedBudget * 100) };
    }

    const metaResult = await callMeta(targetId, actionPayload, ACCESS_TOKEN);

    await auditLog(supabase, {
      workspaceId, userId: user.id, decisionId, campaignId, action,
      success: metaResult.success,
      payload: { ...actionPayload, adsetId, resolvedBudget },
      result: metaResult.raw,
      error: metaResult.error,
    });

    if (metaResult.success && (action === "PAUSE" || action === "RESUME")) {
      await supabase.from("metricas_ads")
        .update({ status: action === "PAUSE" ? "PAUSADA" : "ATIVA", data_atualizacao: new Date().toISOString() })
        .eq("meta_campaign_id", campaignId).eq("user_id", user.id);
    }

    if (!metaResult.success) return NextResponse.json({ error: metaResult.error }, { status: 400 });

    return NextResponse.json({ success: true, action, targetId, resolvedBudget, result: metaResult.raw });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("[meta-actions]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
