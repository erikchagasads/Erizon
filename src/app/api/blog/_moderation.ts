import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { notifyBlogSubscribers } from "@/services/blog-newsletter-service";

type BlogAction = "approve" | "reject" | "publish" | "schedule";

export async function moderateBlogPost(request: NextRequest, action: BlogAction) {
  const auth = await requireAdminUser();
  if (!auth.user) return auth.response;

  const body = await request.json();
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "ID do post é obrigatório." }, { status: 400 });

  const supabase = createServerSupabase();
  const { data: post } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
  if (!post) return NextResponse.json({ error: "Post não encontrado." }, { status: 404 });

  if ((action === "approve" || action === "publish") && post.identification_risk_level === "Alto") {
    return NextResponse.json(
      { error: "Conteúdo com risco alto não pode ser aprovado ou publicado antes de correção." },
      { status: 422 }
    );
  }

  const now = new Date().toISOString();
  const payload = action === "approve"
    ? { status: "approved", reviewed_by: auth.user.id, reviewed_at: now, updated_at: now }
    : action === "reject"
      ? { status: "rejected", reviewed_by: auth.user.id, reviewed_at: now, updated_at: now }
      : action === "publish"
        ? { status: "published", published: true, published_at: now, publicado_em: now, reviewed_by: auth.user.id, reviewed_at: now, updated_at: now }
        : { status: "scheduled", published: false, published_at: body.published_at ?? null, updated_at: now };

  const { data, error } = await supabase.from("blog_posts").update(payload).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("blog_generation_logs").insert({
    blog_post_id: id,
    action,
    status: payload.status,
    content_type: post.content_type,
    identification_risk_level: post.identification_risk_level,
    notes: body.reason ?? null,
  });

  if (action === "publish") {
    const result = await notifyBlogSubscribers(supabase, {
      id: data.id,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      description: data.description,
      category: data.category,
      content_type: data.content_type,
    });

    await supabase.from("blog_generation_logs").insert({
      blog_post_id: id,
      action: "newsletter_notify",
      status: "completed",
      content_type: post.content_type,
      identification_risk_level: post.identification_risk_level,
      notes: `E-mails enviados: ${result.sent}. Falhas: ${result.failed}.`,
    });
  }

  return NextResponse.json({ ok: true, post: data });
}
