"use client";

/**
 * /inteligencia/ena — Erizon Neural Attribution
 * Dashboard completo da ENA: I.R.E. · Track Record · Attribution Funnel · ROAS Preditivo
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  Activity, TrendingUp, TrendingDown, Minus,
  ChevronRight, Sparkles,
  BarChart2, Target, Zap, Brain,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PlanGate from "@/components/PlanGate";
import { SkeletonPage } from "@/components/ops/AppShell";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";
import { TrackRecordPanel } from "@/components/ena/TrackRecordPanel";
import type { IREApiResponse } from "@/types/erizon-ena";
import type { AttributionSummary } from "@/repositories/supabase/attribution-repository";
import type { PredictiveROASResult } from "@/core/predictive-roas-engine";

const fmtBRL = (v: number) =>
  `R$${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ─── IREScoreCard ─────────────────────────────────────────────────────────────
function IREScoreCard({
  ire,
  trend,
  history,
}: {
  ire: IREApiResponse["latest"];
  trend: string;
  history: IREApiResponse["history"];
}) {
  if (!ire) return null;
  const score = ire.ireScore;
  const color = score >= 75 ? "emerald" : score >= 30 ? "amber" : "red";
  const label = score >= 75 ? "Eficiência Alta" : score >= 50 ? "Eficiência Média" : score >= 30 ? "Atenção" : "Crítico";

  const p = {
    emerald: { border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]", txt: "text-emerald-400", bar: "bg-emerald-500" },
    amber:   { border: "border-amber-500/20",   bg: "bg-amber-500/[0.03]",   txt: "text-amber-300",  bar: "bg-amber-500"   },
    red:     { border: "border-red-500/20",     bg: "bg-red-500/[0.04]",     txt: "text-red-300",    bar: "bg-red-500"     },
  }[color];

  const trendIcon = trend === "up" ? <TrendingUp size={14} className="text-emerald-400" /> : trend === "down" ? <TrendingDown size={14} className="text-red-400" /> : <Minus size={14} className="text-white/30" />;
  const sparkline = (history?.length ? history : [ire])
    .filter(Boolean)
    .slice(-7)
    .map(row => Math.round(row?.ireScore ?? score));

  return (
    <div className={`relative p-7 rounded-[24px] border ${p.border} ${p.bg} overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${p.bar} opacity-40 rounded-l-full`} />
      <div className="pl-2">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={10} className="text-white/20" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/20">I.R.E. — Índice de Real Eficiência</span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <p className={`text-[64px] font-black font-mono leading-none ${p.txt}`}>{score}</p>
              <div>
                <p className="text-[14px] text-white/20">/100</p>
                <div className="flex items-center gap-1 mt-1">{trendIcon}<span className="text-[10px] text-white/25">7 dias</span></div>
              </div>
            </div>
            <span className={`text-[12px] font-bold px-3 py-1 rounded-xl border ${p.border} ${p.bg} ${p.txt}`}>{label}</span>
          </div>
          {/* Mini sparkline */}
          <div className="flex items-end gap-1 h-12 shrink-0">
            {sparkline.map((v, i) => (
              <div key={i} style={{ height: `${(v / 100) * 48}px` }} className={`w-2 rounded-sm ${p.bar} opacity-30`} />
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-3">
          {[
            { label: "ROAS",       val: `${Math.round(ire.normRoas * 100)}%`,     w: "40%" },
            { label: "Qualidade",  val: `${Math.round(ire.normQuality * 100)}%`,  w: "25%" },
            { label: "Decisões",   val: `${Math.round(ire.normDecision * 100)}%`, w: "20%" },
            { label: "Desperdício",val: `${Math.round(ire.normWaste * 100)}%`,    w: "15%" },
          ].map(item => (
            <div key={item.label} className="text-center p-3 rounded-[14px] border border-white/[0.05] bg-white/[0.02]">
              <p className="text-[18px] font-black font-mono text-white/60 mb-0.5">{item.val}</p>
              <p className="text-[9px] text-white/20 uppercase tracking-widest">{item.label}</p>
              <p className="text-[8px] text-white/10 mt-0.5">peso {item.w}</p>
            </div>
          ))}
        </div>
        {ire.wasteBreakdown?.wasteSpend > 0 && (
          <div className="mt-4 px-4 py-3 rounded-[14px] border border-red-500/15 bg-red-500/[0.03]">
            <p className="text-[12px] text-red-300/70">
              ⚠ {fmtBRL(ire.wasteBreakdown.wasteSpend)} detectados como desperdício
              ({ire.wasteBreakdown.campaigns.length} campanha{ire.wasteBreakdown.campaigns.length !== 1 ? "s" : ""} ineficiente{ire.wasteBreakdown.campaigns.length !== 1 ? "s" : ""})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AttributionFunnel ────────────────────────────────────────────────────────
function AttributionFunnel({ data }: { data: AttributionSummary }) {
  const steps = data.funnelSteps.filter(s => s.count > 0);
  const max   = Math.max(...steps.map(s => s.count), 1);

  const stageIcon: Record<string, string> = {
    click:     "👆",
    lead:      "📋",
    qualified: "✅",
    sale:      "💰",
  };

  return (
    <div className="p-6 rounded-[24px] border border-white/[0.07] bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-5">
        <Target size={11} className="text-white/20" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/20">Attribution · Funil de Conversão</span>
        {data.totalRevenue > 0 && <span className="ml-auto text-[11px] text-emerald-400 font-bold">{fmtBRL(data.totalRevenue)} atribuídos</span>}
      </div>

      {steps.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[13px] text-white/25">
            Nenhum touchpoint registrado ainda.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-white/18">
            O funil depende dos eventos de WhatsApp/CRM. Configure a Evolution API em Notificações para que cliques, leads e vendas alimentem a atribuição automaticamente.
          </p>
          <Link href="/settings/notificacoes" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-[11px] font-semibold text-purple-200 transition-colors hover:bg-purple-500/15">
            Configurar Evolution API <ChevronRight size={11} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step) => {
            const barPct = Math.round((step.count / max) * 100);
            return (
              <div key={step.stage}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">{stageIcon[step.stage] ?? "•"}</span>
                    <span className="text-[12px] text-white/50 capitalize">{step.stage}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-black font-mono text-white/60">{step.count}</span>
                    {step.conversionRate > 0 && (
                      <span className={`text-[10px] font-bold ${step.conversionRate >= 20 ? "text-emerald-400" : step.conversionRate >= 10 ? "text-amber-300" : "text-red-400"}`}>
                        → {step.conversionRate}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      step.stage === "sale" ? "bg-emerald-500" :
                      step.stage === "qualified" ? "bg-sky-500" :
                      step.stage === "lead" ? "bg-purple-500" : "bg-white/20"
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PredictiveROASCard ───────────────────────────────────────────────────────
function PredictiveROASCard({ data }: { data: (PredictiveROASResult & { computedDate?: string }) | null }) {
  if (!data || data.predictedRoas === 0) {
    return (
      <div className="p-6 rounded-[24px] border border-white/[0.07] bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={11} className="text-white/20" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/20">ROAS Preditivo · 7 dias</span>
        </div>
        <p className="text-[13px] text-white/20 text-center py-4">
          Dados insuficientes. Continue sincronizando campanhas por pelo menos 3 dias.
        </p>
      </div>
    );
  }

  const roasColor = data.predictedRoas >= 3.0 ? "text-emerald-400"
    : data.predictedRoas >= 1.5 ? "text-amber-300"
    : "text-red-400";

  return (
    <div className="p-6 rounded-[24px] border border-purple-500/15 bg-purple-500/[0.03]">
      <div className="flex items-center gap-2 mb-4">
        <Brain size={11} className="text-purple-400/50" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-purple-400/40">ROAS Preditivo · próximos {data.horizonDays} dias</span>
      </div>
      <div className="flex items-end gap-3 mb-4">
        <p className={`text-[52px] font-black font-mono leading-none ${roasColor}`}>
          {data.predictedRoas.toFixed(2)}×
        </p>
        <div className="pb-1.5">
          <p className="text-[10px] text-white/20 mb-0.5">intervalo</p>
          <p className="text-[12px] text-white/25 font-mono">{data.confidenceLow.toFixed(2)}– {data.confidenceHigh.toFixed(2)}×</p>
        </div>
      </div>
      <p className="text-[12px] text-white/30 leading-relaxed mb-4">{data.narrative}</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Tendência",    val: `${data.inputs.trendSlope >= 0 ? "+" : ""}${data.inputs.trendSlope.toFixed(3)}×/dia` },
          { label: "Sazonalidade", val: `${data.inputs.seasonalityFactor.toFixed(2)}×`     },
          { label: "Adj. decisão", val: `${data.inputs.decisionAdjustment >= 0 ? "+" : ""}${(data.inputs.decisionAdjustment * 100).toFixed(1)}%` },
          { label: "Dias de dado", val: `${data.inputs.daysOfData}d`                       },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between px-3 py-2 rounded-[12px] border border-white/[0.04] bg-white/[0.02]">
            <span className="text-[10px] text-white/25">{item.label}</span>
            <span className="text-[11px] font-bold font-mono text-white/40">{item.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── WasteBreakdown ───────────────────────────────────────────────────────────
function WasteBreakdownPanel({ ire }: { ire: IREApiResponse["latest"] }) {
  if (!ire?.wasteBreakdown) return null;
  const w = ire.wasteBreakdown;
  if (w.wasteSpend <= 0) {
    return (
      <div className="p-6 rounded-[24px] border border-emerald-500/15 bg-emerald-500/[0.03]">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={11} className="text-emerald-400/50" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-400/40">Desperdício Detectado</span>
        </div>
        <p className="text-[13px] text-emerald-400/60 text-center py-2">Nenhum desperdício detectado. Operação eficiente.</p>
      </div>
    );
  }

  const items = [
    { label: "Campanhas Zombie",   val: w.zombieSpend,    desc: "Gasto sem leads/compras há 3+ dias" },
    { label: "Tráfego Saturado",   val: w.saturatedSpend, desc: "Frequência alta + CTR caindo" },
    { label: "Budget Canibalizado",val: w.cannibalSpend,  desc: "Campanhas do mesmo objetivo acima do benchmark" },
  ].filter(i => i.val > 0);

  return (
    <div className="p-6 rounded-[24px] border border-red-500/15 bg-red-500/[0.03]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap size={11} className="text-red-400/50" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-red-400/40">Desperdício Detectado</span>
        </div>
        <span className="text-[13px] font-black font-mono text-red-300">{fmtBRL(w.wasteSpend)}</span>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] text-white/50">{item.label}</p>
              <p className="text-[10px] text-white/20">{item.desc}</p>
            </div>
            <p className="text-[13px] font-black font-mono text-red-300/70 shrink-0">{fmtBRL(item.val)}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-white/20 mt-4">
        {Math.round(w.wasteIndex * 100)}% do budget total · {w.campaigns.length} campanha{w.campaigns.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function ENAPage() {
  useSessionGuard();

  const [loading, setLoading]             = useState(true);
  const [ireData, setIreData]             = useState<IREApiResponse | null>(null);
  const [trackRecord, setTrackRecord]     = useState<Parameters<typeof TrackRecordPanel>[0]["data"] | null>(null);
  const [attribution, setAttribution]     = useState<AttributionSummary | null>(null);
  const [predictiveRoas, setPredictiveRoas] = useState<(PredictiveROASResult & { computedDate?: string }) | null>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ), []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: wsMember } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!wsMember?.workspace_id) { setLoading(false); return; }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setLoading(false); return; }

      const wsId    = wsMember.workspace_id;
      const headers = { Authorization: `Bearer ${token}` };

      await Promise.allSettled([
        fetch(`/api/ena/ire?workspaceId=${wsId}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(d => d && setIreData(d)),

        fetch(`/api/ena/track-record?workspaceId=${wsId}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(d => d && setTrackRecord(d)),

        fetch(`/api/ena/attribution?workspaceId=${wsId}&days=30`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(d => d && setAttribution(d)),

        fetch(`/api/ena/predictive-roas?workspaceId=${wsId}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(d => d && setPredictiveRoas(d)),
      ]);

      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) return <SkeletonPage cols={3} />;

  const hasAnyData = ireData || predictiveRoas || attribution || trackRecord;

  if (!hasAnyData) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a] text-white">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-24 px-10 py-20 flex flex-col items-center justify-center gap-4 text-center">
          <Brain size={32} className="text-purple-400/40" />
          <h2 className="text-xl font-bold text-white/60">ENA ainda está calculando</h2>
          <p className="text-sm text-white/25 max-w-md">
            Sincronize campanhas reais do Meta Ads e aguarde o primeiro ciclo de cálculo. Os dados aparecem automaticamente após a primeira sincronização.
          </p>
          <Link href="/campanhas" className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/10 px-5 py-2.5 text-sm font-semibold text-purple-300 transition-all hover:bg-purple-500/20">
            Ir para Campanhas →
          </Link>
        </main>
      </div>
    );
  }

  return (
    <PlanGate minPlan="pro" feature="ENA · Atribuição" preview>
      <div className="flex min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0b0b0d] to-[#0a0a0a] text-white">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-24 px-5 md:px-10 xl:px-14 py-10 max-w-[1400px] mx-auto w-full">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-8 pb-6 border-b border-white/[0.04]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={12} className="text-purple-400/50" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/20">Erizon Neural Attribution</span>
            </div>
            <h1 className="text-[1.9rem] font-bold text-white tracking-tight">ENA — Inteligência Real</h1>
            <p className="text-[13px] text-white/25 mt-1">
              Atribuição independente · I.R.E. · Track Record · ROAS Preditivo
            </p>
          </div>
          <Link href="/inteligencia" className="self-start rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-[12px] font-semibold text-white/40 transition-all hover:border-white/15 hover:text-white">
            <BarChart2 size={13} /> Inteligência <ChevronRight size={11} />
          </Link>
        </header>

        {/* Grid principal */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
          {/* IRE Score */}
          <IREScoreCard
            ire={ireData?.latest ?? null}
            trend={ireData?.trend ?? "stable"}
            history={ireData?.history ?? []}
          />

          {/* Predictive ROAS */}
          <PredictiveROASCard data={predictiveRoas} />
        </div>

        {/* Attribution Funnel + Waste */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
          {attribution
            ? <AttributionFunnel data={attribution} />
            : <div className="p-6 rounded-[24px] border border-white/[0.05] bg-white/[0.02] flex items-center justify-center min-h-[140px]">
                <p className="text-[12px] text-white/20">Funil de atribuição — aguardando touchpoints</p>
              </div>
          }
          {ireData?.latest
            ? <WasteBreakdownPanel ire={ireData.latest} />
            : <div className="p-6 rounded-[24px] border border-white/[0.05] bg-white/[0.02] flex items-center justify-center min-h-[140px]">
                <p className="text-[12px] text-white/20">Análise de desperdício — sem dados ainda</p>
              </div>
          }
        </div>

        {/* Track Record */}
        {trackRecord
          ? <TrackRecordPanel data={trackRecord} />
          : <div className="p-6 rounded-[24px] border border-white/[0.05] bg-white/[0.02] flex items-center justify-center min-h-[100px]">
              <p className="text-[12px] text-white/20">Track Record — nenhuma decisão registrada ainda</p>
            </div>
        }

        {/* IRE Histórico sparkline */}
        {ireData?.history && ireData.history.length > 1 && (
          <section className="mt-5">
            <div className="px-7 py-5 rounded-[24px] border border-white/[0.07] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={11} className="text-white/20" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/20">Histórico do I.R.E. — últimos 30 dias</span>
              </div>
              <div className="flex items-end gap-1.5 h-16">
                {ireData.history.map((row, i) => {
                  const pct = row.ireScore;
                  const color = pct >= 75 ? "bg-emerald-500" : pct >= 30 ? "bg-amber-500" : "bg-red-500";
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className={`w-full rounded-sm ${color} opacity-40 group-hover:opacity-70 transition-opacity`}
                        style={{ height: `${(pct / 100) * 56}px` }}
                      />
                      <p className="text-[8px] text-white/10 font-mono hidden group-hover:block absolute -bottom-4">{pct}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <p className="text-[9px] text-white/15 font-mono">{ireData.history[0]?.snapshotDate}</p>
                <p className="text-[9px] text-white/15 font-mono">{ireData.history[ireData.history.length - 1]?.snapshotDate}</p>
              </div>
            </div>
          </section>
        )}

      </main>
      </div>
    </PlanGate>
  );
}
