import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { IntelligentBlogService } from "@/services/intelligent-blog-service";

export function isCronAuthorized(request: NextRequest) {
  const secret = process.env.BLOG_CRON_SECRET || process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader === `Bearer ${secret}`) return true;
  const headerSecret = request.headers.get("x-blog-cron-secret");
  if (secret && headerSecret === secret) return true;
  const vercelCron = request.headers.get("x-vercel-cron");
  return vercelCron === "1" || vercelCron === "true";
}

export async function authorizeBlogMutation(request: NextRequest) {
  if (isCronAuthorized(request)) return { ok: true, response: null };
  const auth = await requireAdminUser();
  if (!auth.user) return { ok: false, response: auth.response };
  return { ok: true, response: null };
}

export async function generateBlogResponse(
  request: NextRequest,
  action: "daily" | "anonymous" | "weekly" | "monthly" | "market"
) {
  const auth = await authorizeBlogMutation(request);
  if (!auth.ok) return auth.response;

  if (process.env.BLOG_AUTOMATION_ENABLED === "false" && isCronAuthorized(request)) {
    return NextResponse.json({ error: "Automação do blog desativada." }, { status: 403 });
  }

  const service = new IntelligentBlogService(createServerSupabase());
  const result = action === "daily"
    ? await service.generateDailyBlogDraft()
    : action === "anonymous"
      ? await service.generateAnonymousCaseStudy()
      : action === "weekly"
        ? await service.generateWeeklyReport()
        : action === "monthly"
          ? await service.generateMonthlyReport()
          : await service.generateMarketNewsPost();

  return NextResponse.json({ ok: true, ...result });
}

