// src/app/api/blog/route.ts
// GET — lista posts do blog (público, sem autenticação)
// Suporta: ?limit=N, ?category=X, ?featured=true

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit    = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);
  const category = searchParams.get("category");
  const featured = searchParams.get("featured") === "true";
  const slug     = searchParams.get("slug");

  try {
    // Busca post individual
    if (slug) {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Post não encontrado." }, { status: 404 });

      // Incrementar views
      await supabase.from("blog_posts").update({ views: (data.views ?? 0) + 1 }).eq("slug", slug);

      return NextResponse.json({ post: data });
    }

    // Lista posts
    let query = supabase
      .from("blog_posts")
      .select("slug, title, description, category, tags, author, read_time, views, publicado_em")
      .eq("published", true)
      .order("publicado_em", { ascending: false })
      .limit(limit);

    if (category) query = query.eq("category", category);
    if (featured) query = query.eq("featured", true);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ posts: data ?? [] });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
