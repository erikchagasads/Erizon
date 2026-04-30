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
  BenchmarkNicheGroup,
  BenchmarkNicheOption,
  CampaignBenchmarkComparison,
  MarketBenchmark,
} from "@/services/benchmark-market-intelligence-service";
import type {
  NetworkReadiness as NetworkReadinessType,
  NicheInsight as NicheInsightType,
  OwnBenchmarkStats as OwnBenchmarkStatsType,
  WorkspacePosition as WorkspacePositionType,
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
  position: WorkspacePositionType | null;
  nicheInsight: NicheInsightType | null;
  ownStats: OwnBenchmarkStatsType | null;
  readiness: NetworkReadinessType | null;
  marketBenchmark: MarketBenchmark | null;
  selectedMarketBenchmark?: MarketBenchmark | null;
  selectedMarketNiche?: string;
  campaignComparisons: CampaignBenchmarkComparison[];
  detectedNiches: Array<{ niche: string; campaigns: number; confidence: number }>;
  benchmarkGroups?: BenchmarkNicheGroup[];
  globalNiches?: BenchmarkNicheOption[];
}

type Status = "winning" | "median" | "attention" | "unknown";

const ACTIVE_STATUSES = ["ATIVO", "ACTIVE", "ATIVA"];

const DEFAULT_NICHE_OPTIONS = [
  "geral",
  "ecommerce",
  "imobiliario",
  "saude_beleza",
  "educacao",
  "infoprodutos",
  "servicos_locais",
  "financeiro",
  "juridico",
  "turismo",
  "automotivo",
  "b2b_saas",
  "restaurantes",
];

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

function labelNiche(niche: string) {
  return niche
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const [selectedAccountNiche, setSelectedAccountNiche] = useState("");
  const [selectedGlobalNiche, setSelectedGlobalNiche] = useState("");

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
        fetch(`/api/intelligence/network${selectedGlobalNiche ? `?global_niche=${encodeURIComponent(selectedGlobalNiche)}` : ""}`, { cache: "no-store" })
          .then((res) => res.json())
          .catch(() => null),
      ]);

      setCampaigns((data ?? []) as CampaignRow[]);
      setNetwork(networkRes?.ok ? networkRes as NetworkResponse : null);
    } finally {
      setLoading(false);
    }
  }, [selectedGlobalNiche, supabase]);

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
  const marketBenchmark = network?.marketBenchmark ?? null;
  const selectedMarketBenchmark = network?.selectedMarketBenchmark ?? marketBenchmark;
  const apiCampaignComparisons = network?.campaignComparisons ?? [];
  const detectedNiches = network?.detectedNiches ?? [];
  const benchmarkGroups = network?.benchmarkGroups ?? [];
  const globalNiches = network?.globalNiches ?? [];
  const selectedAccountGroup = benchmarkGroups.find((group) => group.niche === selectedAccountNiche) ?? null;
  const accountNicheOptions = useMemo(() => {
    const map = new Map<string, { niche: string; label: string; campaigns: number }>();
    for (const niche of DEFAULT_NICHE_OPTIONS) {
      map.set(niche, { niche, label: labelNiche(niche), campaigns: 0 });
    }
    for (const group of benchmarkGroups) {
      map.set(group.niche, { niche: group.niche, label: labelNiche(group.niche), campaigns: group.campaigns });
    }
    return [...map.values()].sort((a, b) => {
      if (a.campaigns !== b.campaigns) return b.campaigns - a.campaigns;
      return a.label.localeCompare(b.label, "pt-BR");
    });
  }, [benchmarkGroups]);
  const accountNicheValue = selectedAccountNiche || selectedAccountGroup?.niche || accountNicheOptions[0]?.niche || "";
  const globalNicheValue = selectedGlobalNiche || network?.selectedMarketNiche || selectedMarketBenchmark?.niche || "";

  useEffect(() => {
    if (!accountNicheOptions.length) {
      if (selectedAccountNiche) setSelectedAccountNiche("");
      return;
    }
    if (!selectedAccountNiche || !accountNicheOptions.some((option) => option.niche === selectedAccountNiche)) {
      setSelectedAccountNiche(accountNicheOptions[0].niche);
    }
  }, [accountNicheOptions, selectedAccountNiche]);

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
  const selectedAccountInternal = selectedAccountGroup?.internal ?? (
    effectiveStats.campaignsWithSpend > 0
      ? {
          activeCampaigns: effectiveStats.activeCampaigns,
          campaignsWithSpend: effectiveStats.campaignsWithSpend,
          campaignsWithLeads: effectiveStats.campaignsWithLeads,
          totalSpend: effectiveStats.totalSpend,
          totalLeads: effectiveStats.totalLeads,
          totalRevenue: effectiveStats.avgRoas && effectiveStats.totalSpend > 0 ? effectiveStats.avgRoas * effectiveStats.totalSpend : 0,
          avgCpl: effectiveStats.avgCpl,
          avgRoas: effectiveStats.avgRoas,
          avgCtr: effectiveStats.avgCtr,
          avgCpm: null,
          avgCpc: null,
          avgFrequency: null,
        }
      : null
  );
  const selectedAccountHasExactNiche = Boolean(selectedAccountGroup);

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

  const marketCards = [
    {
      label: "CPL de mercado",
      value: fmtBRL(marketBenchmark?.metrics.cpl.p50),
      sub: marketBenchmark
        ? `${marketBenchmark.sourceName} | ${marketBenchmark.periodEnd ? marketBenchmark.periodEnd.slice(0, 4) : "periodo informado"}`
        : "sem base global suficiente para este nicho",
      status: marketBenchmark?.metrics.cpl.p50 ? compareLowerIsBetter(effectiveStats.avgCpl, marketBenchmark.metrics.cpl.p25, marketBenchmark.metrics.cpl.p75) : "unknown" as Status,
      inverse: true,
    },
    {
      label: "ROAS de mercado",
      value: fmtX(marketBenchmark?.metrics.roas.p50),
      sub: marketBenchmark?.sourceNote ?? "aparece quando houver amostra confiavel",
      status: marketBenchmark?.metrics.roas.p50 ? compareHigherIsBetter(effectiveStats.avgRoas, marketBenchmark.metrics.roas.p25, marketBenchmark.metrics.roas.p75) : "unknown" as Status,
      inverse: false,
    },
    {
      label: "CTR de mercado",
      value: fmtPct(marketBenchmark?.metrics.ctr.p50),
      sub: marketBenchmark ? `confianca ${(marketBenchmark.confidence * 100).toFixed(0)}%` : "sem amostra suficiente neste nicho",
      status: marketBenchmark?.metrics.ctr.p50 && effectiveStats.avgCtr
        ? compareHigherIsBetter(effectiveStats.avgCtr, marketBenchmark.metrics.ctr.p25, marketBenchmark.metrics.ctr.p75)
        : "unknown" as Status,
      inverse: false,
    },
  ];

  const selectedInternalCards = selectedAccountInternal ? [
    {
      label: "CPL interno",
      value: fmtBRL(selectedAccountInternal.avgCpl),
      sub: selectedAccountHasExactNiche
        ? `${selectedAccountInternal.campaignsWithLeads} campanhas com leads | ${fmtBRL(selectedAccountInternal.totalSpend)} investidos`
        : `${selectedAccountInternal.campaignsWithLeads} campanhas com leads | base total da conta`,
      status: selectedAccountInternal.avgCpl ? "median" as Status : "unknown" as Status,
      inverse: true,
    },
    {
      label: "ROAS interno",
      value: fmtX(selectedAccountInternal.avgRoas),
      sub: selectedAccountHasExactNiche ? `${fmtBRL(selectedAccountInternal.totalRevenue)} em receita estimada` : "base total da conta",
      status: selectedAccountInternal.avgRoas ? "median" as Status : "unknown" as Status,
      inverse: false,
    },
    {
      label: "CTR interno",
      value: fmtPct(selectedAccountInternal.avgCtr),
      sub: `${selectedAccountInternal.campaignsWithSpend} campanhas com investimento`,
      status: selectedAccountInternal.avgCtr ? "median" as Status : "unknown" as Status,
      inverse: false,
    },
  ] : [];

  const selectedExternalCards = [
    {
      label: "CPL global",
      value: fmtBRL(selectedMarketBenchmark?.metrics.cpl.p50),
      sub: selectedMarketBenchmark
        ? `${selectedMarketBenchmark.sourceName} | ${selectedMarketBenchmark.sampleSize ?? "amostra n/i"} contas`
        : `Ainda nao ha base global para ${labelNiche(globalNicheValue || "geral")}`,
      status: selectedMarketBenchmark?.metrics.cpl.p50
        ? compareLowerIsBetter(selectedAccountInternal?.avgCpl ?? null, selectedMarketBenchmark.metrics.cpl.p25, selectedMarketBenchmark.metrics.cpl.p75)
        : "unknown" as Status,
      inverse: true,
    },
    {
      label: "ROAS global",
      value: fmtX(selectedMarketBenchmark?.metrics.roas.p50),
      sub: selectedMarketBenchmark?.sourceNote ?? "Tente outro nicho ou volte apos mais contas sincronizadas.",
      status: selectedMarketBenchmark?.metrics.roas.p50
        ? compareHigherIsBetter(selectedAccountInternal?.avgRoas ?? null, selectedMarketBenchmark.metrics.roas.p25, selectedMarketBenchmark.metrics.roas.p75)
        : "unknown" as Status,
      inverse: false,
    },
    {
      label: "CTR global",
      value: fmtPct(selectedMarketBenchmark?.metrics.ctr.p50),
      sub: selectedMarketBenchmark ? `confianca ${(selectedMarketBenchmark.confidence * 100).toFixed(0)}%` : "Sem amostra suficiente para comparar com seguranca.",
      status: selectedMarketBenchmark?.metrics.ctr.p50
        ? compareHigherIsBetter(selectedAccountInternal?.avgCtr ?? null, selectedMarketBenchmark.metrics.ctr.p25, selectedMarketBenchmark.metrics.ctr.p75)
        : "unknown" as Status,
      inverse: false,
    },
  ];

  const comparedCampaigns = useMemo(() => {
    if (apiCampaignComparisons.length > 0) {
      return apiCampaignComparisons
        .map((campaign) => ({
          id: campaign.id,
          nome_campanha: campaign.nomeCampanha,
          gasto_total: campaign.metrics.spend,
          contatos: campaign.metrics.leads,
          impressoes: 0,
          cpl: campaign.metrics.cpl,
          roas: campaign.metrics.roas,
          ctr: campaign.metrics.ctr,
          cplStatus: campaign.market.available ? campaign.market.cplStatus : campaign.internal.cplStatus,
          ctrStatus: campaign.market.available ? campaign.market.ctrStatus : campaign.internal.ctrStatus,
          niche: campaign.niche,
          campaignType: campaign.campaignType,
          confidence: campaign.confidence,
          marketAvailable: campaign.market.available,
          sourceLabel: campaign.market.sourceLabel,
        }))
        .sort((a, b) => Number(b.gasto_total ?? 0) - Number(a.gasto_total ?? 0));
    }

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
          niche: effectiveStats.nicho,
          campaignType: "all",
          confidence: 0.35,
          marketAvailable: false,
          sourceLabel: null,
        };
      })
      .sort((a, b) => Number(b.gasto_total ?? 0) - Number(a.gasto_total ?? 0));
  }, [apiCampaignComparisons, campaigns, effectiveStats.avgCpl, effectiveStats.avgCtr, effectiveStats.nicho, insight]);

  return (
    <>
      <Sidebar />
      <main className="md:ml-[60px] min-h-screen bg-[#040406] pb-20 text-white md:pb-0">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-fuchsia-400">Inteligencia de Mercado</p>
              <h1 className="text-2xl font-bold text-white">Benchmarks Internos e Mercado</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/40">
                Dados reais da sua conta, rede Erizon anonimizada e mercado externo somente quando houver fonte cadastrada.
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
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Comparativo selecionado</p>
                    <p className="mt-1 text-[12px] text-white/35">
                      Escolha o nicho da sua operacao e compare com a base global disponivel para o mesmo mercado.
                    </p>
                  </div>
                  <div className="grid w-full grid-cols-1 gap-3 md:w-auto md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/25">Nicho da conta</span>
                      <select
                        value={accountNicheValue}
                        onChange={(event) => setSelectedAccountNiche(event.target.value)}
                        className="h-10 w-full min-w-[210px] rounded-xl border border-white/[0.08] bg-[#08080b] px-3 text-[12px] font-semibold text-white/70 outline-none transition-all hover:border-white/20 focus:border-fuchsia-500/50"
                      >
                        {accountNicheOptions.length === 0 ? (
                          <option value="">Sem dados da conta</option>
                        ) : accountNicheOptions.map((option) => (
                          <option key={option.niche} value={option.niche}>
                            {option.label}{option.campaigns > 0 ? ` (${option.campaigns})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/25">Nicho global</span>
                      <select
                        value={globalNicheValue}
                        onChange={(event) => setSelectedGlobalNiche(event.target.value)}
                        className="h-10 w-full min-w-[210px] rounded-xl border border-white/[0.08] bg-[#08080b] px-3 text-[12px] font-semibold text-white/70 outline-none transition-all hover:border-white/20 focus:border-sky-400/50"
                      >
                        {globalNicheValue && !globalNiches.some((option) => option.niche === globalNicheValue) && (
                          <option value={globalNicheValue}>{labelNiche(globalNicheValue)}</option>
                        )}
                        {globalNiches.length === 0 && !globalNicheValue && (
                          <option value="">Sem nichos globais</option>
                        )}
                        {globalNiches.map((option) => (
                          <option key={option.niche} value={option.niche}>
                            {option.label}{option.benchmarks ? ` (${option.benchmarks})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <BarChart2 size={14} className="text-fuchsia-300" />
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
                        Conta | {accountNicheValue ? labelNiche(accountNicheValue) : "sem nicho"}
                      </p>
                    </div>
                    {!selectedAccountHasExactNiche && selectedAccountInternal && (
                      <p className="mb-2 text-[10px] leading-relaxed text-amber-300/70">
                        Ainda nao ha campanhas classificadas neste nicho. Comparando com a base real total da conta.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {selectedInternalCards.length > 0
                        ? selectedInternalCards.map((card) => <MetricCard key={card.label} {...card} />)
                        : <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-[12px] text-white/30 sm:col-span-3">Sincronize campanhas para criar nichos da conta.</div>}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Globe size={14} className="text-sky-300" />
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
                        Global | {globalNicheValue ? labelNiche(globalNicheValue) : "sem nicho"}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {selectedMarketBenchmark
                        ? selectedExternalCards.map((card) => <MetricCard key={card.label} {...card} />)
                        : (
                          <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4 sm:col-span-3">
                            <p className="text-[12px] font-semibold text-amber-200">Base global em formacao</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                              Ainda nao temos amostra suficiente para {labelNiche(globalNicheValue || "este nicho")}. O comparativo interno continua ativo e a base global aparece automaticamente quando houver dados confiaveis.
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart2 size={16} className="text-fuchsia-400" />
                  <p className="text-sm font-semibold text-white">
                    {insight ? "Rede Erizon do nicho" : "Benchmark interno real"}
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

              <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-sky-300" />
                    <p className="text-sm font-semibold text-white">
                      Base global do mercado
                      <span className="ml-2 font-normal capitalize text-white/35">
                        | {marketBenchmark?.niche ?? detectedNiches[0]?.niche ?? effectiveStats.nicho}
                      </span>
                    </p>
                  </div>
                  <span className="text-[10px] text-white/25 md:ml-auto">
                    {marketBenchmark
                      ? `${marketBenchmark.sourceName} | ${marketBenchmark.country} | ${marketBenchmark.sampleSize ?? "amostra nao informada"} amostras`
                      : "aguardando amostra suficiente para este nicho"}
                  </span>
                </div>
                {marketBenchmark ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {marketCards.map((card) => (
                      <MetricCard key={card.label} {...card} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                    <p className="text-[12px] font-semibold text-amber-200">Sem base global confiavel para este nicho ainda</p>
                    <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/40">
                      A tela nao inventa numero quando nao existe amostra suficiente. Quando mais contas reais forem sincronizadas neste nicho, os benchmarks globais aparecem aqui.
                    </p>
                  </div>
                )}
              </section>

              {benchmarkGroups.length > 0 && (
                <section className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Benchmarks por nicho detectado</p>
                    <p className="mt-1 text-[12px] text-white/35">
                      Cada nicho usa apenas campanhas classificadas nele. Quando nao houver base global suficiente, a tela mostra isso claramente.
                    </p>
                  </div>

                  {benchmarkGroups.map((group) => {
                    const external = group.marketBenchmark;
                    const internalCards = [
                      {
                        label: "CPL interno",
                        value: fmtBRL(group.internal.avgCpl),
                        sub: `${group.internal.campaignsWithLeads} campanhas com leads | ${fmtBRL(group.internal.totalSpend)} investidos`,
                        status: group.internal.avgCpl ? "median" as Status : "unknown" as Status,
                        inverse: true,
                      },
                      {
                        label: "ROAS interno",
                        value: fmtX(group.internal.avgRoas),
                        sub: `${fmtBRL(group.internal.totalRevenue)} em receita estimada`,
                        status: group.internal.avgRoas ? "median" as Status : "unknown" as Status,
                        inverse: false,
                      },
                      {
                        label: "CTR interno",
                        value: fmtPct(group.internal.avgCtr),
                        sub: `${group.internal.campaignsWithSpend} campanhas com investimento`,
                        status: group.internal.avgCtr ? "median" as Status : "unknown" as Status,
                        inverse: false,
                      },
                    ];
                    const externalCards = [
                      {
                        label: "CPL externo",
                        value: fmtBRL(external?.metrics.cpl.p50),
                        sub: external ? `${external.sourceName} | ${external.sampleSize ?? "amostra n/i"} contas` : "ainda sem base global suficiente neste nicho",
                        status: external?.metrics.cpl.p50
                          ? compareLowerIsBetter(group.internal.avgCpl, external.metrics.cpl.p25, external.metrics.cpl.p75)
                          : "unknown" as Status,
                        inverse: true,
                      },
                      {
                        label: "ROAS externo",
                        value: fmtX(external?.metrics.roas.p50),
                        sub: external?.sourceNote ?? "aparece quando houver amostra confiavel",
                        status: external?.metrics.roas.p50
                          ? compareHigherIsBetter(group.internal.avgRoas, external.metrics.roas.p25, external.metrics.roas.p75)
                          : "unknown" as Status,
                        inverse: false,
                      },
                      {
                        label: "CTR externo",
                        value: fmtPct(external?.metrics.ctr.p50),
                        sub: external ? `confianca ${(external.confidence * 100).toFixed(0)}%` : "sem comparativo seguro por enquanto",
                        status: external?.metrics.ctr.p50
                          ? compareHigherIsBetter(group.internal.avgCtr, external.metrics.ctr.p25, external.metrics.ctr.p75)
                          : "unknown" as Status,
                        inverse: false,
                      },
                    ];

                    return (
                      <article key={group.niche} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold capitalize text-white">{group.niche}</p>
                            <p className="text-[11px] text-white/30">
                              {group.campaigns} campanhas | confianca media {(group.confidence * 100).toFixed(0)}%
                            </p>
                          </div>
                          <p className="text-[10px] text-white/25">
                            {external
                              ? `Externo: ${external.sourceName}${external.periodEnd ? ` | ${external.periodEnd.slice(0, 4)}` : ""}`
                              : "Externo indisponivel para este nicho"}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <BarChart2 size={14} className="text-fuchsia-300" />
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Interno</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              {internalCards.map((card) => <MetricCard key={card.label} {...card} />)}
                            </div>
                          </div>

                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <Globe size={14} className="text-sky-300" />
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Mercado externo</p>
                            </div>
                            {external ? (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {externalCards.map((card) => <MetricCard key={card.label} {...card} />)}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                                <p className="text-[12px] font-semibold text-amber-200">Base global em formacao</p>
                                <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                                  Ainda nao ha amostra suficiente para comparar este nicho com seguranca.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}

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
                  Campanhas vs {marketBenchmark ? "mercado externo" : insight ? "rede Erizon" : "media real da sua conta"}
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
                          <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <p className="truncate text-sm font-medium text-white">{campaign.nome_campanha}</p>
                            <p className="text-[10px] uppercase tracking-wide text-white/25">
                              {campaign.niche} | {campaign.campaignType} | conf. {(campaign.confidence * 100).toFixed(0)}%
                            </p>
                          </div>
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
                                <div><span className="block uppercase text-white/18">Fonte</span>{campaign.sourceLabel ?? (campaign.marketAvailable ? "Mercado" : "Interno")}</div>
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
                <p className="mb-2 text-[10px] uppercase tracking-wider text-white/20">Como ler estes dados</p>
                <div className="space-y-1 text-[11px] text-white/35">
                  <p>Interno: usa suas campanhas reais sincronizadas no Meta Ads.</p>
                  <p>Global: aparece quando existe amostra suficiente para o nicho escolhido, pela rede Erizon ou por fonte externa curada.</p>
                  <p>Quando um nicho ainda nao tem amostra, a tela evita inventar numero e mostra que a base ainda esta em formacao.</p>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
