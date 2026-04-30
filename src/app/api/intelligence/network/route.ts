import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { NetworkIntelligenceService } from "@/services/network-intelligence-service";
import { BenchmarkMarketIntelligenceService } from "@/services/benchmark-market-intelligence-service";
import { createServerSupabase } from "@/lib/supabase/server";

const svc = new NetworkIntelligenceService();
const marketSvc = new BenchmarkMarketIntelligenceService();

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const marketNiche = searchParams.get("global_niche");
  const db = createServerSupabase();
  const { data: ws } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const workspaceId = ws?.workspace_id ?? auth.user.id;

  const [position, wsData, ownStats, marketData] = await Promise.all([
    svc.getWorkspacePosition(workspaceId),
    db.from("workspaces").select("niche").eq("id", workspaceId).maybeSingle(),
    svc.getOwnStats(workspaceId),
    marketSvc.getCampaignComparisons(workspaceId, { marketNiche }),
  ]);

  const nicho = wsData?.data?.niche ?? "geral";
  const nicheInsight = await svc.getLatestForNiche(nicho);
  const readiness = {
    hasOwnData: ownStats.campaignsWithSpend > 0,
    hasNetworkBenchmark: Boolean(nicheInsight),
    requiredWorkspaces: 2,
    currentWorkspaces: nicheInsight?.nWorkspaces ?? 0,
    source: nicheInsight
      ? (new Date(nicheInsight.computedAt).getTime() > Date.now() - 10 * 60 * 1000 ? "live" : "weekly")
      : "unavailable",
    message: nicheInsight
      ? "Benchmark real disponivel para este nicho."
      : ownStats.campaignsWithSpend > 0
        ? "Sua conta tem dados reais, mas a rede ainda nao tem pelo menos 2 workspaces reais neste nicho."
        : "Sincronize campanhas reais do Meta Ads para calcular seus benchmarks.",
  };

  return NextResponse.json({
    ok: true,
    position,
    nicheInsight,
    ownStats,
    readiness,
    marketBenchmark: marketData.marketBenchmark,
    selectedMarketBenchmark: marketData.selectedMarketBenchmark,
    selectedMarketNiche: marketData.selectedMarketNiche,
    campaignComparisons: marketData.campaignComparisons,
    detectedNiches: marketData.detectedNiches,
    benchmarkGroups: marketData.benchmarkGroups,
    globalNiches: marketData.globalNiches,
  });
}
