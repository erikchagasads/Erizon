"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { getSupabase } from "@/lib/supabase";
import { Loader2, TrendingDown, TrendingUp, Minus, BarChart2, Globe } from "lucide-react";
import { RedeInteligencia } from "@/components/dados/RedeInteligencia";
import type { NicheInsight, WorkspacePosition } from "@/services/network-intelligence-service";

interface Campanha {
  id: string;
  nome_campanha: string;
  gasto_total: number;
  contatos: number;
  ctr: number;
  impressoes: number;
  status: string;
}

interface NetworkResponse {
  ok: boolean;
  position: WorkspacePosition | null;
  nicheInsight: NicheInsight | null;
}

type Status = "winning" | "median" | "attention" | "unknown";

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v.toFixed(2)}%`;
const fmtX = (v: number) => `${v.toFixed(2)}x`;

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function compareCost(value: number | null, p25: number | null, p75: number | null): Status {
  if (value === null || p25 === null || p75 === null) return "unknown";
  if (value <= p25) return "winning";
  if (value >= p75) return "attention";
  return "median";
}

function compareRate(value: number | null, p25: number | null, p75: number | null): Status {
  if (value === null || p25 === null || p75 === null) return "unknown";
  if (value >= p25) return "winning";
  if (value <= p75) return "attention";
  return "median";
}

const STATUS_CONFIG: Record<Status, { label: string; text: string; border: string }> = {
  winning: {
    label: "melhor que a rede",
    text: "text-emerald-400",
    border: "border-emerald-500/20 bg-emerald-500/10",
  },
  median: {
    label: "na faixa da rede",
    text: "text-white/50",
    border: "border-white/[0.07] bg-white/[0.03]",
  },
  attention: {
    label: "pede atenção",
    text: "text-red-400",
    border: "border-red-500/20 bg-red-500/10",
  },
  unknown: {
    label: "sem referência suficiente",
    text: "text-white/25",
    border: "border-white/[0.05] bg-white/[0.02]",
  },
};

function StatusIcon({ status, inverse = false }: { status: Status; inverse?: boolean }) {
  if (status === "winning") {
    return inverse ? <TrendingDown size={12} className="text-emerald-400" /> : <TrendingUp size={12} className="text-emerald-400" />;
  }
  if (status === "attention") {
    return inverse ? <TrendingUp size={12} className="text-red-400" /> : <TrendingDown size={12} className="text-red-400" />;
  }
  return <Minus size={12} className="text-white/25" />;
}

export default function BenchmarksPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [network, setNetwork] = useState<NetworkResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data }, networkRes] = await Promise.all([
          supabase
            .from("metricas_ads")
            .select("id,nome_campanha,gasto_total,contatos,ctr,impressoes,status")
            .eq("user_id", user.id)
            .in("status", ["ATIVO", "ACTIVE", "ATIVA"]),
          fetch("/api/intelligence/network").then((res) => res.json()).catch(() => null),
        ]);

        setCampanhas((data ?? []) as Campanha[]);
        setNetwork(networkRes?.ok ? networkRes as NetworkResponse : null);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [supabase]);

  const minhas = useMemo(() => {
    const ativas = campanhas.filter((c) => c.gasto_total > 0 && c.impressoes > 0);
    if (!ativas.length) return null;

    const comLead = ativas.filter((c) => c.contatos > 0);

    return {
      total: ativas.length,
      cpl: comLead.length ? avg(comLead.map((c) => c.gasto_total / c.contatos)) : null,
      ctr: avg(ativas.map((c) => Number(c.ctr ?? 0)).filter((v) => v > 0)),
    };
  }, [campanhas]);

  const insight = network?.nicheInsight ?? null;
  const position = network?.position ?? null;

  const cards = useMemo(() => {
    if (!insight) return [];

    return [
      {
        label: "CPL da rede",
        value: insight.cplP50 ? fmtBRL(insight.cplP50) : "—",
        sub: insight.cplP25 && insight.cplP75 ? `p25 ${fmtBRL(insight.cplP25)} · p75 ${fmtBRL(insight.cplP75)}` : "rede ainda sem quartis suficientes",
        status: compareCost(minhas?.cpl ?? null, insight.cplP25, insight.cplP75) as Status,
        inverse: true,
      },
      {
        label: "ROAS da rede",
        value: insight.roasP50 ? fmtX(insight.roasP50) : "—",
        sub: insight.roasP25 && insight.roasP75 ? `top ${fmtX(insight.roasP25)} · base ${fmtX(insight.roasP75)}` : "rede ainda sem quartis suficientes",
        status: compareRate(position?.suaRoas ?? null, insight.roasP25, insight.roasP75) as Status,
        inverse: false,
      },
      {
        label: "CTR da rede",
        value: insight.ctrP50 ? fmtPct(insight.ctrP50) : "—",
        sub: minhas?.ctr ? `sua média ${fmtPct(minhas.ctr)}` : "sem CTR suficiente no workspace",
        status: (insight.ctrP50 && minhas?.ctr
          ? minhas.ctr >= insight.ctrP50 ? "winning" : "attention"
          : "unknown") as Status,
        inverse: false,
      },
    ];
  }, [insight, minhas?.cpl, minhas?.ctr, position?.suaRoas]);

  const campanhasComparadas = useMemo(() => {
    if (!insight) return [];

    return campanhas
      .filter((c) => c.gasto_total > 0 && c.impressoes > 0)
      .map((c) => {
        const cpl = c.contatos > 0 ? c.gasto_total / c.contatos : null;
        const ctr = Number(c.ctr ?? 0) || null;
        const cplStatus = compareCost(cpl, insight.cplP25, insight.cplP75) as Status;
        const ctrStatus = (insight.ctrP50 && ctr
          ? ctr >= insight.ctrP50 ? "winning" : "attention"
          : "unknown") as Status;

        return {
          ...c,
          cpl,
          ctr,
          cplStatus,
          ctrStatus,
        };
      });
  }, [campanhas, insight]);

  return (
    <>
      <Sidebar />
      <div className="md:ml-[60px] pb-20 md:pb-0 min-h-screen bg-[#040406] text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <p className="text-[11px] text-fuchsia-400 font-semibold uppercase tracking-wider mb-1">Inteligência de Mercado</p>
            <h1 className="text-2xl font-bold text-white">Benchmarks da Rede</h1>
            <p className="text-sm text-white/40 mt-1">
              Esta tela agora só usa benchmark vivo da rede Erizon. Se a rede ainda não tiver base suficiente, ela assume isso em vez de inventar mercado.
            </p>
          </div>

          <div className="mb-6">
            <RedeInteligencia />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin text-fuchsia-400" />
            </div>
          ) : !insight ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <Globe size={24} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm font-semibold">Benchmark real ainda indisponível</p>
              <p className="text-white/25 text-[12px] mt-2 leading-relaxed">
                A rede ainda não tem dados suficientes do seu nicho para gerar referência real. Quando houver base suficiente em `network_weekly_insights`, esta tela passa a comparar automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={16} className="text-fuchsia-400" />
                  <p className="text-sm font-semibold text-white">
                    Rede real do nicho
                    <span className="text-white/35 font-normal ml-2 capitalize">· {insight.nicho}</span>
                  </p>
                  <span className="text-[10px] text-white/20 ml-auto">
                    semana {new Date(insight.semanaInicio).toLocaleDateString("pt-BR")} · {insight.nWorkspaces} workspaces
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {cards.map((card) => {
                    const cfg = STATUS_CONFIG[card.status];
                    return (
                      <div key={card.label} className={`rounded-xl border p-4 ${cfg.border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] text-white/30 uppercase tracking-wider">{card.label}</p>
                          <StatusIcon status={card.status} inverse={card.inverse} />
                        </div>
                        <p className={`text-base font-bold ${cfg.text}`}>{card.value}</p>
                        <p className="text-[10px] text-white/20 mt-1">{card.sub}</p>
                        <p className={`text-[10px] mt-2 ${cfg.text}`}>{cfg.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-sm font-semibold text-white mb-2">Sua posição na rede</p>
                <p className="text-[12px] text-white/50 leading-relaxed">
                  {position?.insight ?? "A posição do workspace ainda não pôde ser calculada com segurança."}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Seu CPL médio</p>
                    <p className="text-[16px] font-bold text-white">{position?.suaCpl ? fmtBRL(position.suaCpl) : "—"}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Seu ROAS médio</p>
                    <p className="text-[16px] font-bold text-white">{position?.suaRoas ? fmtX(position.suaRoas) : "—"}</p>
                  </div>
                </div>
              </div>

              {campanhasComparadas.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-white mb-3">Campanhas vs rede real</p>
                  <div className="space-y-3">
                    {campanhasComparadas.map((c) => {
                      const cplCfg = STATUS_CONFIG[c.cplStatus];
                      const ctrCfg = STATUS_CONFIG[c.ctrStatus];

                      return (
                        <div key={c.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <p className="text-sm font-medium text-white mb-3 truncate">{c.nome_campanha}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className={`rounded-lg border p-3 ${cplCfg.border}`}>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[9px] text-white/25 uppercase">CPL</p>
                                <StatusIcon status={c.cplStatus} inverse />
                              </div>
                              <p className={`text-sm font-bold ${cplCfg.text}`}>{c.cpl ? fmtBRL(c.cpl) : "—"}</p>
                              <p className={`text-[9px] mt-1 ${cplCfg.text}`}>{cplCfg.label}</p>
                            </div>
                            <div className={`rounded-lg border p-3 ${ctrCfg.border}`}>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[9px] text-white/25 uppercase">CTR</p>
                                <StatusIcon status={c.ctrStatus} />
                              </div>
                              <p className={`text-sm font-bold ${ctrCfg.text}`}>{c.ctr ? fmtPct(c.ctr) : "—"}</p>
                              <p className={`text-[9px] mt-1 ${ctrCfg.text}`}>{ctrCfg.label}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4">
                <p className="text-[10px] text-white/20 uppercase tracking-wider mb-2">Como interpretar agora</p>
                <div className="space-y-1 text-[11px] text-white/30">
                  <p>Esta tela só compara sua operação com a rede anonimizada da própria Erizon.</p>
                  <p>Quando a rede ainda não tem amostra suficiente, o benchmark fica indisponível em vez de cair para referência estática antiga.</p>
                  <p>CPM e CPC ficaram de fora por enquanto porque a rede semanal atual ainda não publica essas medianas com confiança suficiente.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
