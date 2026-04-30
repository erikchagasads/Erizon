import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdminUser();
  if (!auth.user) return auth.response;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const contentType = searchParams.get("content_type");
  const risk = searchParams.get("risk");

  const supabase = createServerSupabase();
  let query = supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);

  if (status && status !== "Todos") query = query.eq("status", status);
  if (category && category !== "Todos") query = query.eq("category", category);
  if (contentType && contentType !== "Todos") query = query.eq("content_type", contentType);
  if (risk && risk !== "Todos") query = query.eq("identification_risk_level", risk);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ posts: data ?? [] });
}

