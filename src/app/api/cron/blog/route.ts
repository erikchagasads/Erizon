import { NextRequest, NextResponse } from "next/server";
import { authorizeBlogMutation } from "@/app/api/blog/_actions";
import { createServerSupabase } from "@/lib/supabase/server";
import { IntelligentBlogService } from "@/services/intelligent-blog-service";

export async function GET(request: NextRequest) {
  return runBlogCron(request);
}

export async function POST(request: NextRequest) {
  return runBlogCron(request);
}

async function runBlogCron(request: NextRequest) {
  const auth = await authorizeBlogMutation(request);
  if (!auth.ok) return auth.response;

  if (process.env.BLOG_AUTOMATION_ENABLED === "false") {
    return NextResponse.json({ error: "Automação do blog desativada." }, { status: 403 });
  }

  const service = new IntelligentBlogService(createServerSupabase());
  const now = new Date();
  const results: Record<string, unknown> = {
    daily: await service.generateDailyBlogDraft({
      forcePublish: true,
      preferMarketNews: true,
      skipIfPublishedRecently: true,
    }),
  };

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.BLOG_TIMEZONE || "America/Sao_Paulo",
    weekday: "short",
  }).format(now);
  if (weekday === "Fri") {
    results.weekly = await service.generateWeeklyReport();
  }

  const tomorrowInBrazil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const todayDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.BLOG_TIMEZONE || "America/Sao_Paulo",
    day: "2-digit",
  }).format(now);
  const tomorrowDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.BLOG_TIMEZONE || "America/Sao_Paulo",
    day: "2-digit",
  }).format(tomorrowInBrazil);
  if (Number(tomorrowDay) < Number(todayDay)) {
    results.monthly = await service.generateMonthlyReport();
  }

  return NextResponse.json({ ok: true, results });
}
