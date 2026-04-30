import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "12", 10), 50);
  const category = searchParams.get("category");
  const contentType = searchParams.get("content_type");
  const slug = searchParams.get("slug");

  try {
    if (slug) {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .or("published.eq.true,status.eq.published")
        .gte("publicado_em", "2026-01-01T00:00:00.000Z")
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Post não encontrado." }, { status: 404 });

      await supabase.from("blog_posts").update({ views: (data.views ?? 0) + 1 }).eq("slug", slug);
      return NextResponse.json({ post: data });
    }

    let query = supabase
      .from("blog_posts")
      .select("slug,title,excerpt,description,category,content_type,status,featured,author_name,author,reading_time,read_time,views,published_at,publicado_em,freshness_level,anonymized,source_name,source_url")
      .or("published.eq.true,status.eq.published")
      .gte("publicado_em", "2026-01-01T00:00:00.000Z")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (category && category !== "Todos") query = query.eq("category", category);
    if (contentType && contentType !== "Todos") query = query.eq("content_type", contentType);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ posts: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
