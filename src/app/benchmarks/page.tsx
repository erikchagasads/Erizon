"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  Globe,
  Loader2,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type {
  NetworkReadiness,
  NicheInsight,
  OwnBenchmarkStats,
  WorkspacePosition,
} from "@/services/network-intelligence-service";

interface CampaignRow {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  receita_estimada: number;
  ctr: number;
  cpm: number | null;
  cpc: number | null;
  frequencia: number | null;
  impressoes: number;
  status: string;
  data_atualizacao: string | null;
}

interface NetworkResponse {
  ok: boolean;
  position: WorkspacePosition | null;
  nicheInsight: NicheInsight | null;
  ownStats: OwnBenchmarkStats | null;
  readiness: NetworkReadiness | null;
}

type Status = "winning" | "median" | "attention" | "unknown";

const ACTIVE_STATUSES = ["ATIVO", "ACTIVE", "ATIVA"];

const statusConfig: Record<Status, { label: string; text: string; border: string }> = {
  winning: {
    label: "acima da referencia",
    text: "text-emerald-400",
    border: "border-emerald-500/20 bg-emerald-500/10",
  },
  median: {
    label: "na faixa esperada",
    text: "text-white/60",
    border: "border-white/[0.07] bg-white/[0.03]",
  },
  attention: {
    label: "pede atencao",
    text: "text-red-400",
    border: "border-red-500/20 bg-red-500/10",
  },
  unknown: {
    label: "sem base suficiente",
    text: "text-white/30",
    border: "border-white/[0.05] bg-white/[0.02]",
  },
};

function fmtBRL(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return "-";
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}%`;
}

function fmtX(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}x`;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function compareLowerIsBetter(value: number | null, good: number | null, bad: number | null): Status {
  if (value === null || good === null || bad === null) return "unknown";
  if (value <= good) return "winning";
  if (value >= bad) return "attention";
  return "median";
}

function compareHigherIsBetter(value: number | null, good: number | null, bad: number | null): Status {
  if (value === null || good === null || bad === null) return "unknown";
  if (value >= good) return "winning";
  if (value <= bad) return "attention";
  return "median";
}

function StatusIcon({ status, inverse = false }: { status: Status; inverse?: boolean }) {
  if (status === "winning") {
    return inverse
      ? <TrendingDown size={13} className="text-emerald-400" />
      : <TrendingUp size={13} className="text-emerald-400" />;
  }
  if (status === "attention") {
    return inverse
      ? <TrendingUp size={13} className="text-red-400" />
      : <TrendingDown size={13} className="text-red-400" />;
  }
  return <Minus size={13} className="text-white/25" />;
}

function MetricCard({
  label,
  value,
  sub,
  status = "median",
  inverse = false,
}: {
  label: string;
  value: string;
  sub: string;
  status?: Status;
  inverse?: boolean;
}) {
  const cfg = statusConfig[status];
  return (
    <div className={`rounded-xl border p-4 ${cfg.border}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
        <StatusIcon status={status} inverse={inverse} />
      </div>
      <p className={`text-base font-bold ${cfg.text}`}>{value}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-white/25">{sub}</p>
      <p className={`mt-2 text-[10px] ${cfg.text}`}>{cfg.label}</p>
    </div>
  );
}

export default function BenchmarksPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [network, setNetwork] = useState<NetworkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data }, networkRes] = await Promise.all([
        supabase
          .from("metricas_ads")
          .select("id,nome_campanha,gasto_total,contatos,receita_estimada,ctr,cpm,cpc,frequencia,impressoes,status,data_atualizacao")
          .eq("user_id", user.id)
          .in("status", ACTIVE_STATUSES),
        fetch("/api/intelligence/network", { cache: "no-store" })
          .then((res) => res.json())
          .catch(() => null),
      ]);

      setCampaigns((data ?? []) as CampaignRow[]);
      setNetwork(networkRes?.ok ? networkRes as NetworkResponse : null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncMetaAds() {
    setSyncing(true);
    try {
      await fetch("/api/ads-sync", { cache: "no-store" });
      await load();
    } finally {
      setSyncing(false);
    }
  }

  const localStats = useMemo(() => {
    const withSpend = campaigns.filter((campaign) => Number(campaign.gasto_total ?? 0) > 0);
    const withLeads = withSpend.filter((campaign) => Number(campaign.contatos ?? 0) > 0);
    const withCtr = withSpend.filter((campaign) => Number(campaign.ctr ?? 0) > 0);
    const totalSpend = withSpend.reduce((sum, campaign) => sum + Number(campaign.gasto_total ?? 0), 0);
    const totalLeads = withLeads.reduce((sum, campaign) => sum + Number(campaign.contatos ?? 0), 0);
    const totalRevenue = withSpend.reduce((sum, campaign) => sum + Number(campaign.receita_estimada ?? 0), 0);

    return {
      activeCampaigns: campaigns.length,
      campaignsWithSpend: withSpend.length,
      campaignsWithLeads: withLeads.length,
      totalSpend,
      totalLeads,
      avgCpl: totalLeads > 0 ? totalSpend / totalLeads : null,
      avgCtr: average(withCtr.map((campaign) => Number(campaign.ctr ?? 0))),
      avgRoas: totalSpend > 0 && totalRevenue > 0 ? totalRevenue / totalSpend : null,
    };
  }, [campaigns]);

  const ownStats = network?.ownStats ?? null;
  const readiness = network?.readiness ?? null;
  const insight = network?.nicheInsight ?? null;
  const position = network?.position ?? null;

  const effectiveStats = {
    activeCampaigns: ownStats?.activeCampaigns ?? localStats.activeCampaigns,
    campaignsWithSpend: ownStats?.campaignsWithSpend ?? localStats.campaignsWithSpend,
    campaignsWithLeads: ownStats?.campaignsWithLeads ?? localStats.campaignsWithLeads,
    totalSpend: ownStats?.totalSpend ?? localStats.totalSpend,
    totalLeads: ownStats?.totalLeads ?? localStats.totalLeads,
    avgCpl: ownStats?.avgCpl ?? localStats.avgCpl,
    avgCtr: ownStats?.avgCtr ?? localStats.avgCtr,
    avgRoas: ownStats?.avgRoas ?? localStats.avgRoas,
    nicho: ownStats?.nicho ?? position?.nicho ?? insight?.nicho ?? "geral",
    lastSyncAt: ownStats?.lastSyncAt ?? campaigns.map((campaign) => campaign.data_atualizacao).filter(Boolean).sort().at(-1) ?? null,
  };

  const networkCards = [
    {
      label: insight ? "CPL da rede" : "Seu CPL real",
      value: insight?.cplP50 ? fmtBRL(insight.cplP50) : fmtBRL(effectiveStats.avgCpl),
      sub: insight?.cplP25 && insight.cplP75
        ? `p25 ${fmtBRL(insight.cplP25)} | p75 ${fmtBRL(insight.cplP75)}`
        : `${effectiveStats.campaignsWithLeads} campanhas reais com leads`,
      status: insight
        ? compareLowerIsBetter(effectiveStats.avgCpl, insight.cplP25, insight.cplP75)
        : effectiveStats.avgCpl ? "median" as Status : "unknown" as Status,
      inverse: true,
    },
    {
      label: insight ? "ROAS da rede" : "Seu ROAS real",
      value: insight?.roasP50 ? fmtX(insight.roasP50) : fmtX(effectiveStats.avgRoas),
      sub: insight?.roasP25 && insight.roasP75
        ? `top ${fmtX(insight.roasP25)} | base ${fmtX(insight.roasP75)}`
        : "usa receita real/estimada gravada no sync",
      status: insight
        ? compareHigherIsBetter(position?.suaRoas ?? effectiveStats.avgRoas, insight.roasP25, insight.roasP75)
        : effectiveStats.avgRoas ? "median" as Status : "unknown" as Status,
      inverse: false,
    },
    {
      label: insight ? "CTR da rede" : "Seu CTR real",
      value: insight?.ctrP50 ? fmtPct(insight.ctrP50) : fmtPct(effectiveStats.avgCtr),
      sub: effectiveStats.avgCtr ? `sua media ${fmtPct(effectiveStats.avgCtr)}` : "sem CTR real sincronizado",
      status: insight?.ctrP50 && effectiveStats.avgCtr
        ? effectiveStats.avgCtr >= insight.ctrP50 ? "winning" : "attention"
        : effectiveStats.avgCtr ? "median" as Status : "unknown" as Status,
      inverse: false,
    },
  ];

  const comparedCampaigns = useMemo(() => {
    return campaigns
      .filter((campaign) => Number(campaign.gasto_total ?? 0) > 0)
      .map((campaign) => {
        const spend = Number(campaign.gasto_total ?? 0);
        const leads = Number(campaign.contatos ?? 0);
        const revenue = Number(campaign.receita_estimada ?? 0);
        const cpl = leads > 0 ? spend / leads : null;
        const roas = spend > 0 && revenue > 0 ? revenue / spend : null;
        const ctr = Number(campaign.ctr ?? 0) || null;

        return {
          ...campaign,
          cpl,
          roas,
          ctr,
          cplStatus: insight
            ? compareLowerIsBetter(cpl, insight.cplP25, insight.cplP75)
            : cpl && effectiveStats.avgCpl ? (cpl <= effectiveStats.avgCpl ? "winning" : "attention") as Status : "unknown" as Status,
          ctrStatus: (insight?.ctrP50 ?? effectiveStats.avgCtr) && ctr
            ? ctr >= (insight?.ctrP50 ?? effectiveStats.avgCtr ?? 0) ? "winning" as Status : "attention" as Status
            : "unknown" as Status,
        };
      })
      .sort((a, b) => Number(b.gasto_total ?? 0) - Number(a.gasto_total ?? 0));
  }, [campaigns, effectiveStats.avgCpl, effectiveStats.avgCtr, insight]);

  return (
    <>
      <Sidebar />
      <main className="md:ml-[60px] min-h-screen bg-[#040406] pb-20 text-white md:pb-0">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-fuchsia-400">Inteligencia de Mercado</p>
              <h1 className="text-2xl font-bold text-white">Benchmarks da Rede</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/40">
                Dados reais da sua conta e, quando houver amostra suficiente, comparacao anonima com a rede Erizon do mesmo nicho.
              </p>
            </div>
            <button
              onClick={syncMetaAds}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[12px] font-semibold text-white/70 transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Sincronizar Meta Ads
            </button>
          </header>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={22} className="animate-spin text-fuchsia-400" />
            </div>
          ) : (
            <div className="space-y-6">
              <section className={`rounded-2xl border p-5 ${readiness?.hasOwnData || effectiveStats.campaignsWithSpend > 0 ? "border-emerald-500/15 bg-emerald-500/[0.04]" : "border-amber-500/20 bg-amber-500/[0.04]"}`}>
                <div className="flex items-start gap-3">
                  {readiness?.hasOwnData || effectiveStats.campaignsWithSpend > 0
                    ? <CheckCircle2 size={17} className="mt-0.5 text-emerald-400" />
                    : <AlertTriangle size={17} className="mt-0.5 text-amber-300" />}
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {insight ? "Benchmark de rede ativo" : effectiveStats.campaignsWithSpend > 0 ? "Benchmark interno real ativo" : "Aguardando campanhas reais"}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/45">
                      {readiness?.message ?? "Sincronize campanhas reais do Meta Ads para preencher esta tela."}
                    </p>
                    {effectiveStats.lastSyncAt && (
                      <p className="mt-2 text-[10px] text-white/25">
                        Ultimo dado real: {new Date(effectiveStats.lastSyncAt).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart2 size={16} className="text-fuchsia-400" />
                  <p className="text-sm font-semibold text-white">
                    {insight ? "Rede real do nicho" : "Sua base real"}
                    <span className="ml-2 font-normal capitalize text-white/35">| {effectiveStats.nicho}</span>
                  </p>
                  <span className="ml-auto text-[10px] text-white/20">
                    {insight
                      ? `${readiness?.source === "live" ? "ao vivo" : "semana"} ${new Date(insight.semanaInicio).toLocaleDateString("pt-BR")} | ${insight.nWorkspaces} workspaces`
                      : `${effectiveStats.campaignsWithSpend} campanhas com investimento`}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {networkCards.map((card) => (
                    <MetricCard key={card.label} {...card} />
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <MetricCard
                  label="Campanhas ativas"
                  value={String(effectiveStats.activeCampaigns)}
                  sub={`${effectiveStats.campaignsWithSpend} com investimento real`}
                  status={effectiveStats.activeCampaigns > 0 ? "median" : "unknown"}
                />
                <MetricCard
                  label="Investimento real"
                  value={fmtBRL(effectiveStats.totalSpend)}
                  sub="soma das campanhas ativas sincronizadas"
                  status={effectiveStats.totalSpend > 0 ? "median" : "unknown"}
                />
                <MetricCard
                  label="Leads reais"
                  value={String(effectiveStats.totalLeads)}
                  sub={`${effectiveStats.campaignsWithLeads} campanhas com leads`}
                  status={effectiveStats.totalLeads > 0 ? "median" : "unknown"}
                />
                <MetricCard
                  label="Base de rede"
                  value={insight ? `${insight.nWorkspaces} workspaces` : "Indisponivel"}
                  sub={insight ? "amostra anonima real" : "precisa de 2 workspaces reais no nicho"}
                  status={insight ? "winning" : "unknown"}
                />
              </section>

              {insight && (
                <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Globe size={15} className="text-fuchsia-300" />
                    <p className="text-sm font-semibold text-white">Sua posicao na rede</p>
                  </div>
                  <p className="text-[12px] leading-relaxed text-white/50">
                    {position?.insight ?? "A posicao do workspace ainda nao pode ser calculada com seguranca."}
                  </p>
                </section>
              )}

              <section>
                <p className="mb-3 text-sm font-semibold text-white">
                  Campanhas vs {insight ? "rede real" : "media real da sua conta"}
                </p>
                {comparedCampaigns.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                    <Globe size={24} className="mx-auto mb-3 text-white/20" />
                    <p className="text-sm font-semibold text-white/45">Nenhuma campanha real sincronizada ainda</p>
                    <p className="mt-2 text-[12px] text-white/25">Conecte o Meta Ads ou rode a sincronizacao para preencher os benchmarks.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comparedCampaigns.map((campaign) => {
                      const cplCfg = statusConfig[campaign.cplStatus];
                      const ctrCfg = statusConfig[campaign.ctrStatus];
                      return (
                        <article key={campaign.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <p className="mb-3 truncate text-sm font-medium text-white">{campaign.nome_campanha}</p>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className={`rounded-lg border p-3 ${cplCfg.border}`}>
                              <div className="mb-1 flex items-center justify-between">
                                <p className="text-[9px] uppercase text-white/25">CPL</p>
                                <StatusIcon status={campaign.cplStatus} inverse />
                              </div>
                              <p className={`text-sm font-bold ${cplCfg.text}`}>{fmtBRL(campaign.cpl)}</p>
                              <p className={`mt-1 text-[9px] ${cplCfg.text}`}>{cplCfg.label}</p>
                            </div>
                            <div className={`rounded-lg border p-3 ${ctrCfg.border}`}>
                              <div className="mb-1 flex items-center justify-between">
                                <p className="text-[9px] uppercase text-white/25">CTR</p>
                                <StatusIcon status={campaign.ctrStatus} />
                              </div>
                              <p className={`text-sm font-bold ${ctrCfg.text}`}>{fmtPct(campaign.ctr)}</p>
                              <p className={`mt-1 text-[9px] ${ctrCfg.text}`}>{ctrCfg.label}</p>
                            </div>
                            <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 md:col-span-2">
                              <div className="grid grid-cols-2 gap-3 text-[10px] text-white/35 md:grid-cols-4">
                                <div><span className="block uppercase text-white/18">Gasto</span>{fmtBRL(campaign.gasto_total)}</div>
                                <div><span className="block uppercase text-white/18">Leads</span>{campaign.contatos}</div>
                                <div><span className="block uppercase text-white/18">ROAS</span>{fmtX(campaign.roas)}</div>
                                <div><span className="block uppercase text-white/18">Impressoes</span>{Number(campaign.impressoes ?? 0).toLocaleString("pt-BR")}</div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-white/20">Garantia contra dado falso</p>
                <div className="space-y-1 text-[11px] text-white/30">
                  <p>Esta tela le apenas `metricas_ads`, `workspaces`, `network_participation` e `network_weekly_insights`.</p>
                  <p>Se nao houver rede suficiente, a comparacao vira benchmark interno real da sua conta, nao uma media inventada.</p>
                  <p>A rede anonima so aparece com pelo menos 2 workspaces reais do mesmo nicho.</p>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
