import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Token inválido.", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const supabase = createServerSupabase();
  await supabase
    .from("blog_newsletter_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("unsubscribe_token", token);

  return new NextResponse("Inscrição cancelada com sucesso.", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

