"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BellRing,
  CheckCircle2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

interface DailyDigestData {
  hero: {
    greeting: string;
    headline: string;
    summary: string;
  };
  period: {
    current: { spend: number; revenue: number; leads: number; campaigns: number; avgCpl: number | null; avgRoas: number | null };
    previous: { spend: number; revenue: number; leads: number; avgCpl: number | null; avgRoas: number | null };
    changes: { spend: number; revenue: number; leads: number; avgCpl: number; avgRoas: number };
  };
  decisions: {
    count: number;
    urgentCount: number;
    pendingImpactBrl: number;
    pending: Array<{ id: string; action_type: string; title: string; confidence: string }>;
  };
  alerts: {
    count: number;
    criticalCount: number;
    pausedCampaigns: Array<{ campaign_name: string; status: string }>;
  };
  topCampaign: { campaign_name: string; roas_value: number; revenue_value: number } | null;
  benchmark: {
    niche: string | null;
    cpl: { my: number | null; benchmark: number | null; status: "winning" | "attention" | "neutral" };
    roas: { my: number | null; benchmark: number | null; status: "winning" | "attention" | "neutral" };
    insight: string | null;
  } | null;
  progress: {
    wastedBudgetRecoveredBrl: number;
    revenueOpportunityBrl: number;
    efficiencyDelta: number;
    habitScore: number;
  };
  actions: string[];
  insights: string[];
}

const fmtBRL = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtPct = (value: number) => `${value > 0 ? "+" : ""}${value}%`;

function StatCard({
  label,
  value,
  change,
  tone = "neutral",
}: {
  label: string;
  value: string;
  change?: number;
  tone?: "neutral" | "good" | "warn";
}) {
  const showChange = typeof change === "number" && Number.isFinite(change) && change !== 0;
  const positive = (change ?? 0) > 0;
  const toneClass =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/[0.06]"
      : tone === "warn"
        ? "border-amber-500/20 bg-amber-500/[0.06]"
        : "border-white/[0.08] bg-white/[0.03]";

  return (
    <div className={`rounded-[22px] border p-4 ${toneClass}`}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className="text-[24px] font-black text-white">{value}</p>
      {showChange ? (
        <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
          positive ? "bg-emerald-500/12 text-emerald-300" : "bg-red-500/12 text-red-300"
        }`}>
          {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {fmtPct(change!)}
        </div>
      ) : (
        <p className="mt-2 text-[10px] text-white/25">sem variacao relevante</p>
      )}
    </div>
  );
}

function ActionItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
      <p className="text-[12px] leading-relaxed text-white/65">{text}</p>
    </div>
  );
}

export function DailyDigest() {
  const [data, setData] = useState<DailyDigestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/daily-digest")
      .then(async (response) => {
        if (!response.ok) throw new Error("digest_error");
        return response.json();
      })
      .then((payload) => setData(payload))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const benchmarkLabel = useMemo(() => {
    if (!data?.benchmark?.insight) return null;
    return data.benchmark.insight;
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5 animate-pulse">
        <div className="mb-4 h-5 w-40 rounded bg-white/10" />
        <div className="grid gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-28 rounded-[20px] bg-white/[0.05]" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#08080b] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.22),transparent_42%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-200">
              <Sparkles size={12} />
              {data.hero.greeting}
            </div>
            <h2 className="text-[24px] font-black leading-tight text-white md:text-[30px]">
              {data.hero.headline}
            </h2>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/55">{data.hero.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:min-w-[260px]">
            <div className="rounded-[20px] border border-white/[0.08] bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">decisoes</p>
              <p className="mt-2 text-[26px] font-black text-white">{data.decisions.count}</p>
              <p className="mt-1 text-[11px] text-amber-300/80">
                {data.decisions.urgentCount} urgentes aguardando aprovacao
              </p>
            </div>

            <div className="rounded-[20px] border border-white/[0.08] bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">impacto</p>
              <p className="mt-2 text-[26px] font-black text-emerald-300">
                R$ {fmtBRL(data.decisions.pendingImpactBrl || data.progress.revenueOpportunityBrl)}
              </p>
              <p className="mt-1 text-[11px] text-white/45">potencial direto na fila de hoje</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 md:px-6">
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="Investido" value={`R$ ${fmtBRL(data.period.current.spend)}`} change={data.period.changes.spend} />
          <StatCard label="Receita" value={`R$ ${fmtBRL(data.period.current.revenue)}`} change={data.period.changes.revenue} tone="good" />
          <StatCard label="Leads" value={String(data.period.current.leads)} change={data.period.changes.leads} tone="good" />
          <StatCard label="CPL medio" value={data.period.current.avgCpl ? `R$ ${fmtBRL(data.period.current.avgCpl)}` : "-"} change={data.period.changes.avgCpl} tone="warn" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="grid gap-4">
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">o que mover agora</p>
                  <p className="mt-1 text-[15px] font-bold text-white">Fila de abertura diaria</p>
                </div>
                <Link
                  href="/decision-feed"
                  className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-white/55 transition-colors hover:text-white"
                >
                  ver fila <ArrowRight size={12} />
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[20px] border border-amber-500/20 bg-amber-500/[0.08] p-4">
                  <div className="flex items-center gap-2 text-amber-300">
                    <BellRing size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em]">pendente</span>
                  </div>
                  <p className="mt-3 text-[28px] font-black text-white">{data.decisions.count}</p>
                  <p className="mt-1 text-[11px] text-white/55">decisoes esperando voce</p>
                </div>

                <div className="rounded-[20px] border border-red-500/20 bg-red-500/[0.08] p-4">
                  <div className="flex items-center gap-2 text-red-300">
                    <AlertTriangle size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em]">atencao</span>
                  </div>
                  <p className="mt-3 text-[28px] font-black text-white">{data.alerts.count}</p>
                  <p className="mt-1 text-[11px] text-white/55">campanhas pedindo revisao</p>
                </div>

                <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/[0.08] p-4">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Wallet size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em]">espelho</span>
                  </div>
                  <p className="mt-3 text-[28px] font-black text-white">
                    R$ {fmtBRL(data.progress.wastedBudgetRecoveredBrl)}
                  </p>
                  <p className="mt-1 text-[11px] text-white/55">verba protegida no periodo</p>
                </div>
              </div>

              {data.actions.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {data.actions.map((action) => (
                    <ActionItem key={action} text={action} />
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5">
                <div className="flex items-center gap-2 text-white/35">
                  <Target size={14} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">benchmark visivel</p>
                </div>
                {data.benchmark ? (
                  <>
                    <p className="mt-3 text-[20px] font-black text-white">
                      {data.benchmark.niche ? `Seu nicho: ${data.benchmark.niche}` : "Comparativo de mercado"}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[18px] border border-white/[0.08] bg-black/20 p-4">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">seu cpl</p>
                        <p className="mt-2 text-[22px] font-black text-white">
                          {data.benchmark.cpl.my ? `R$ ${fmtBRL(data.benchmark.cpl.my)}` : "-"}
                        </p>
                        <p className={`mt-1 text-[11px] ${
                          data.benchmark.cpl.status === "winning"
                            ? "text-emerald-300"
                            : data.benchmark.cpl.status === "attention"
                              ? "text-amber-300"
                              : "text-white/45"
                        }`}>
                          mercado: {data.benchmark.cpl.benchmark ? `R$ ${fmtBRL(data.benchmark.cpl.benchmark)}` : "-"}
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-white/[0.08] bg-black/20 p-4">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">seu roas</p>
                        <p className="mt-2 text-[22px] font-black text-white">
                          {data.benchmark.roas.my ? `${data.benchmark.roas.my.toFixed(2)}x` : "-"}
                        </p>
                        <p className={`mt-1 text-[11px] ${
                          data.benchmark.roas.status === "winning"
                            ? "text-emerald-300"
                            : data.benchmark.roas.status === "attention"
                              ? "text-amber-300"
                              : "text-white/45"
                        }`}>
                          mercado: {data.benchmark.roas.benchmark ? `${data.benchmark.roas.benchmark.toFixed(2)}x` : "-"}
                        </p>
                      </div>
                    </div>
                    {benchmarkLabel && <p className="mt-3 text-[12px] leading-relaxed text-white/60">{benchmarkLabel}</p>}
                  </>
                ) : (
                  <p className="mt-3 text-[12px] leading-relaxed text-white/45">
                    Complete o nicho do workspace para liberar o comparativo com o mercado dentro da home.
                  </p>
                )}
              </div>

              <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5">
                <div className="flex items-center gap-2 text-white/35">
                  <Award size={14} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">identidade do gestor</p>
                </div>
                <p className="mt-3 text-[20px] font-black text-white">Seu progresso esta visivel</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[18px] border border-emerald-500/15 bg-emerald-500/[0.05] p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">oportunidade de receita</p>
                    <p className="mt-2 text-[24px] font-black text-white">R$ {fmtBRL(data.progress.revenueOpportunityBrl)}</p>
                    <p className="mt-1 text-[11px] text-white/55">valor estimado das melhores alavancas abertas agora</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[18px] border border-white/[0.08] bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">eficiencia</p>
                      <p className="mt-2 text-[21px] font-black text-white">{fmtPct(data.progress.efficiencyDelta)}</p>
                    </div>
                    <div className="rounded-[18px] border border-white/[0.08] bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">habit score</p>
                      <p className="mt-2 text-[21px] font-black text-white">{data.progress.habitScore}/100</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5">
              <div className="flex items-center gap-2 text-white/35">
                <CheckCircle2 size={14} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">insights executivos</p>
              </div>
              <div className="mt-4 space-y-3">
                {data.insights.map((insight) => (
                  <div key={insight} className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-[12px] leading-relaxed text-white/62">
                    {insight}
                  </div>
                ))}
              </div>
            </div>

            {data.topCampaign && (
              <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/[0.08] p-5">
                <div className="flex items-center gap-2 text-amber-300">
                  <Zap size={14} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">campanha destaque</p>
                </div>
                <p className="mt-3 text-[18px] font-black text-white">{data.topCampaign.campaign_name}</p>
                <p className="mt-2 text-[12px] text-white/60">
                  ROAS {Number(data.topCampaign.roas_value).toFixed(2)}x
                  {data.topCampaign.revenue_value > 0 ? ` · Receita R$ ${fmtBRL(data.topCampaign.revenue_value)}` : ""}
                </p>
              </div>
            )}

            {data.alerts.pausedCampaigns.length > 0 && (
              <div className="rounded-[24px] border border-red-500/20 bg-red-500/[0.08] p-5">
                <div className="flex items-center gap-2 text-red-300">
                  <AlertTriangle size={14} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">campanhas em risco</p>
                </div>
                <div className="mt-4 space-y-2">
                  {data.alerts.pausedCampaigns.slice(0, 4).map((campaign) => (
                    <div key={campaign.campaign_name} className="rounded-[16px] border border-red-500/15 bg-black/15 px-3 py-2">
                      <p className="text-[12px] font-semibold text-white/85">{campaign.campaign_name}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-red-200/70">{campaign.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
