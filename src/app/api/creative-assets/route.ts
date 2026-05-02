import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth-guard";
import { logError, logEvent } from "@/lib/observability/logger";

type CreativeAssetPayload = {
  campaign_id?: unknown;
  campaign_name?: unknown;
  client_id?: unknown;
  copy?: unknown;
  prompt?: unknown;
  format?: unknown;
};

type CreativeAssetRow = {
  id: string;
  campaign_id: string | null;
  name: string | null;
  format: string | null;
  generated_copy: string | null;
  source: string | null;
  created_at: string | null;
};

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.user) return auth.response;

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaign_id");

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    let query = supabase
      .from("creative_assets")
      .select("id, campaign_id, name, format, generated_copy, source, created_at")
      .eq("user_id", auth.user.id)
      .not("generated_copy", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (campaignId) query = query.eq("campaign_id", campaignId);

    const { data, error } = await query;

    if (error) {
      logError("creative_assets_list_failed", error, { userId: auth.user.id, campaignId });
      return NextResponse.json(
        { data: [], error: "Não foi possível listar as copies salvas." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: (data ?? []) as CreativeAssetRow[], error: null });
  } catch (error) {
    logError("creative_assets_list_unhandled_error", error);
    return NextResponse.json(
      { data: [], error: "Erro interno ao listar copies." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.user) return auth.response;

    const body = (await req.json()) as CreativeAssetPayload;
    const campaignId = asOptionalString(body.campaign_id);
    const campaignName = asOptionalString(body.campaign_name) ?? "Campanha";
    const copy = asOptionalString(body.copy);
    const prompt = asOptionalString(body.prompt);
    const format = asOptionalString(body.format) ?? "body_ad";

    if (!campaignId || !copy) {
      return NextResponse.json(
        { data: null, error: "Campanha e copy gerada são obrigatórias." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data, error } = await supabase
      .from("creative_assets")
      .insert({
        id: crypto.randomUUID(),
        user_id: auth.user.id,
        client_id: null,
        campaign_id: campaignId,
        name: `Copy IA - ${campaignName}`.slice(0, 120),
        format,
        hook_type: "generated",
        duration_seconds: 0,
        caption_style: "direct_response",
        visual_style: "campaign_context",
        ctr: 0,
        cpa: 0,
        roas: 0,
        frequency: 0,
        spend: 0,
        conversions: 0,
        generated_copy: copy,
        prompt,
        source: "campaign_context",
      })
      .select("id, campaign_id, name, format, created_at")
      .single();

    if (error) {
      logError("creative_assets_save_failed", error, {
        userId: auth.user.id,
        campaignId,
      });

      return NextResponse.json(
        { data: null, error: "Não foi possível salvar a copy gerada." },
        { status: 500 }
      );
    }

    logEvent("creative_assets_copy_saved", {
      userId: auth.user.id,
      campaignId,
      assetId: data.id,
      format,
    });

    return NextResponse.json({ data, error: null });
  } catch (error) {
    logError("creative_assets_unhandled_error", error);
    return NextResponse.json(
      { data: null, error: "Erro interno ao salvar copy." },
      { status: 500 }
    );
  }
}
