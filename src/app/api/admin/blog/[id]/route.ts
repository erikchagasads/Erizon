import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { calculateIdentificationRisk } from "@/services/intelligent-blog-service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser();
  if (!auth.user) return auth.response;

  const { id } = await params;
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Post não encontrado." }, { status: 404 });
  return NextResponse.json({ post: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser();
  if (!auth.user) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const content = String(body.content ?? "");
  const risk = calculateIdentificationRisk(`${body.title ?? ""}\n${body.excerpt ?? body.description ?? ""}\n${content}`);
  const supabase = createServerSupabase();

  const payload = {
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt ?? body.description,
    description: body.excerpt ?? body.description,
    content: risk.level === "Alto" ? risk.correctedContent : content,
    category: body.category,
    content_type: body.content_type,
    seo_title: body.seo_title,
    seo_description: body.seo_description,
    seo_keywords: Array.isArray(body.seo_keywords) ? body.seo_keywords : String(body.seo_keywords ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    tags: Array.isArray(body.seo_keywords) ? body.seo_keywords : String(body.seo_keywords ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    source_name: body.source_name || null,
    source_url: body.source_url || null,
    freshness_level: body.freshness_level,
    identification_risk_level: risk.level,
    identification_risk_notes: `${risk.notes.join("\n")} Sugestões: ${risk.suggestions.join(" ")}`,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("blog_posts").update(payload).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data, risk });
}

