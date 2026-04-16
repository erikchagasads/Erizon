"use client";

/**
 * pulse/page.tsx — Cockpit v12 "Human-in-the-Loop"
 *
 * ZONAS:
 *   ZONA 1 — Status Bar: modo (ALERTA/DECISÃO/PAZ) + toggle de autopilot
 *   ZONA 2 — Command Center: fila de decisões (engine propõe, gestor aprova)
 *   ZONA 3 — Situacional: financeiros compactos + histórico de ações
 *
 * FILOSOFIA:
 *   - Nada é executado automaticamente sem aprovação do gestor
 *   - O gestor pode habilitar autopiloto por tipo de ação (ex: pausar, escalar)
 *   - Todas as decisões ficam registradas com auditoria
 */

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  Zap, AlertTriangle, CheckCircle2, XCircle, ChevronRight,
  TrendingUp, TrendingDown, Bot, ShieldCheck,
  Clock, BarChart2, RefreshCw, Settings,
  Activity, Sparkles, PieChart, Target,
  Star, Eye, TriangleAlert, Link2, Database, Bell, Smartphone,
} from "lucide-react";
import type { CampanhaProcessada } from "@/app/lib/engine/pulseEngine";
import Sidebar from "@/components/Sidebar";
import { SkeletonPage } from "@/components/ops/AppShell";
import { BudgetOptimizer } from "@/components/BudgetOptimizer";
import { DailyDigest } from "@/components/DailyDigest";
import {
  filtrarAtivas, processarCampanhas, resolverConfig,
  type CampanhaRaw, type EngineResult, type UserEngineConfig,
} from "@/app/lib/engine/pulseEngine";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";
import type { PendingDecision, AutopilotConfig, CockpitMode } from "@/types/erizon-cockpit";
import type { ActionType } from "@/types/erizon-cockpit";

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function getSaudacao() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

function getDataFormatada() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

// ─── Modos do Cockpit ─────────────────────────────────────────────────────────
const MODOS: Record<CockpitMode, {
  label: string; cor: string; bg: string; border: string; glow: string; icon: string;
}> = {
  ALERTA: {
    label: "ALERTA",
    cor:    "text-red-400",
    bg:     "bg-red-500/10",
    border: "border-red-500/30",
    glow:   "shadow-[0_0_40px_rgba(239,68,68,0.15)]",
    icon:   "🚨",
  },
  DECISÃO: {
    label: "DECISÃO",
    cor:    "text-amber-400",
    bg:     "bg-amber-500/10",
    border: "border-amber-500/30",
    glow:   "",
    icon:   "⚡",
  },
  PAZ: {
    label: "PAZ",
    cor:    "text-emerald-400",
    bg:     "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow:   "shadow-[0_0_40px_rgba(16,185,129,0.08)]",
    icon:   "✅",
  },
};

const ACTION_LABELS: Record<ActionType, { label: string; icon: string; color: string }> = {
  pause:         { label: "Pausar",         icon: "⏸",  color: "text-red-400"     },
  resume:        { label: "Reativar",       icon: "▶️",  color: "text-emerald-400" },
  scale_budget:  { label: "Escalar",        icon: "📈",  color: "text-emerald-400" },
  reduce_budget: { label: "Reduzir budget", icon: "📉",  color: "text-amber-400"   },
  alert:         { label: "Alerta",         icon: "⚠️",  color: "text-amber-400"   },
};

// ─── Toggle Autopilot ─────────────────────────────────────────────────────────
function AutopilotToggle({
  config,
  onToggle,
  onTypeToggle,
}: {
  config: AutopilotConfig | null;
  onToggle: (enabled: boolean) => void;
  onTypeToggle: (key: keyof AutopilotConfig, val: boolean) => void;
}) {
  const isOn = config?.autopilot_enabled ?? false;

  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5">
      {/* Global toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Bot size={16} className={isOn ? "text-fuchsia-400" : "text-white/30"} />
          <div>
            <p className="text-[13px] font-bold text-white">Autopiloto</p>
            <p className="text-[10px] text-white/30">
              {isOn ? "Ativo — executa ações autorizadas automaticamente" : "Desativado — todas as ações requerem sua aprovação"}
            </p>
          </div>
        </div>
        <button
          onClick={() => onToggle(!isOn)}
          className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
            isOn ? "bg-fuchsia-600 shadow-[0_0_12px_rgba(168,85,247,0.4)]" : "bg-white/10"
          }`}
        >
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
            isOn ? "translate-x-5" : ""
          }`} />
        </button>
      </div>

      {/* Per-type toggles — só mostra se autopiloto global está ON */}
      {isOn && (
        <div className="border-t border-white/[0.05] pt-4 grid grid-cols-2 gap-2">
          {([
            ["auto_pause",         "Pausar campanhas"],
            ["auto_scale_budget",  "Escalar budget"],
            ["auto_reduce_budget", "Reduzir budget"],
            ["auto_resume",        "Reativar campanhas"],
          ] as [keyof AutopilotConfig, string][]).map(([key, label]) => {
            const val = config?.[key] as boolean ?? false;
            return (
              <button
                key={key}
                onClick={() => onTypeToggle(key, !val)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-all ${
                  val
                    ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                    : "bg-white/[0.03] text-white/30 border border-white/[0.06] hover:border-white/10 hover:text-white/50"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${val ? "bg-fuchsia-400" : "bg-white/20"}`} />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {isOn && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/[0.05] border border-amber-500/10">
          <ShieldCheck size={11} className="text-amber-400/60 shrink-0" />
          <p className="text-[10px] text-amber-400/60">
            Proteção ativa: máx R$${fmtBRL(config?.shield_max_spend_brl ?? 500)} por execução automática
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Decision Card ────────────────────────────────────────────────────────────
function DecisionCard({
  decision,
  onApprove,
  onReject,
  loading,
}: {
  decision: PendingDecision;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) {
  const action = ACTION_LABELS[decision.action_type];
  const impact = decision.estimated_impact_brl ?? 0;
  const isAlert = decision.action_type === "alert";

  const borderColor = {
    pause:         "border-red-500/20",
    resume:        "border-emerald-500/20",
    scale_budget:  "border-emerald-500/20",
    reduce_budget: "border-amber-500/20",
    alert:         "border-amber-500/20",
  }[decision.action_type];

  const barColor = {
    pause:         "bg-red-500",
    resume:        "bg-emerald-500",
    scale_budget:  "bg-emerald-500",
    reduce_budget: "bg-amber-500",
    alert:         "bg-amber-400",
  }[decision.action_type];

  const confidence = {
    high:   { label: "Alta confiança",   color: "text-emerald-400/70" },
    medium: { label: "Média confiança",  color: "text-amber-400/70"   },
    low:    { label: "Baixa confiança",  color: "text-white/30"        },
  }[decision.confidence];

  return (
    <div className={`relative rounded-[20px] border ${borderColor} bg-white/[0.02] overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${barColor} opacity-50 rounded-l-full`} />

      <div className="pl-5 pr-5 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[15px]">{action.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${action.color}`}>
                  {action.label}
                </span>
                <span className={`text-[9px] ${confidence.color}`}>· {confidence.label}</span>
              </div>
              <p className="text-[13px] font-bold text-white/90 mt-0.5">{decision.title}</p>
            </div>
          </div>
          {impact > 0 && (
            <div className="text-right shrink-0">
              <p className="text-[10px] text-white/25">impacto est.</p>
              <p className={`text-[14px] font-black ${
                ["scale_budget", "resume"].includes(decision.action_type)
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}>
                {["scale_budget", "resume"].includes(decision.action_type) ? "+" : "-"}R${fmtBRL(impact)}
              </p>
            </div>
          )}
        </div>

        {/* Rationale */}
        <p className="text-[11px] text-white/40 leading-relaxed mb-4">{decision.rationale}</p>

        {/* Actions */}
        {isAlert ? (
          <button
            onClick={() => onReject(decision.id)}
            disabled={loading}
            className="w-full py-2 rounded-xl text-[12px] font-semibold text-white/40 hover:text-white/60 hover:bg-white/[0.04] border border-white/[0.06] transition-all"
          >
            Ciente — Ignorar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(decision.id)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold
                bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white
                shadow-[0_4px_16px_rgba(168,85,247,0.25)]
                hover:shadow-[0_4px_20px_rgba(168,85,247,0.4)]
                active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={13} />
              Aprovar &amp; Executar
            </button>
            <button
              onClick={() => onReject(decision.id)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold
                text-white/40 border border-white/[0.08] hover:border-white/20 hover:text-white/60
                active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <XCircle size={13} />
              Ignorar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────
function HistoryRow({ d }: { d: PendingDecision }) {
  const action = ACTION_LABELS[d.action_type];
  const statusIcons: Record<string, string> = {
    approved: "✓", rejected: "✗", executed: "⚡", expired: "○",
  };
  const statusColors: Record<string, string> = {
    approved: "text-emerald-400/70", rejected: "text-red-400/50",
    executed: "text-fuchsia-400/70", expired: "text-white/20",
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-[12px] shrink-0">{action.icon}</span>
      <p className="text-[11px] text-white/40 flex-1 truncate">{d.title}</p>
      <span className={`text-[11px] font-bold shrink-0 ${statusColors[d.status] ?? "text-white/30"}`}>
        {statusIcons[d.status] ?? "?"}
      </span>
    </div>
  );
}

// ─── Financeiro Chip ──────────────────────────────────────────────────────────
function FinCard({ label, value, sub, up }: { label: string; value: string; sub?: string; up?: boolean | null }) {
  return (
    <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] text-white/25 font-semibold uppercase tracking-[0.18em] mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-[18px] font-black text-white">{value}</p>
        {up !== undefined && up !== null && (
          up
            ? <TrendingUp size={12} className="text-emerald-400 mb-1" />
            : <TrendingDown size={12} className="text-red-400 mb-1" />
        )}
      </div>
      {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
    </div>
  );
}

function FirstWowTour({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  if (!visible) return null;

  return (
    <div className="rounded-[24px] border border-fuchsia-500/20 bg-[linear-gradient(135deg,rgba(168,85,247,0.14),rgba(59,130,246,0.08))] p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-[680px]">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-300">
              Primeiro Uau
            </span>
            <span className="text-[10px] text-white/30">Tour rapido do cockpit</span>
          </div>
          <h2 className="text-[18px] font-black text-white md:text-[20px]">
            Seu proximo passo e aprovar a primeira decisao real.
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-white/55 md:text-[13px]">
            O Daily Digest ja organiza o que importa. Agora feche o loop: sincronize as campanhas,
            ative um canal de aviso e valide a primeira acao sugerida pelo cockpit.
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="self-start rounded-xl border border-white/[0.08] px-3 py-2 text-[11px] font-semibold text-white/45 transition-all hover:border-white/15 hover:text-white/75"
        >
          Entendi
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          {
            title: "1. Ler o digest",
            text: "Comece por esta home. Ela te mostra risco, progresso e acoes pendentes em menos de 1 minuto.",
            icon: Sparkles,
            href: "#daily-digest",
            cta: "Ver resumo",
          },
          {
            title: "2. Ativar avisos",
            text: "Push do navegador e WhatsApp fazem o Erizon te chamar de volta sem depender do Telegram.",
            icon: Bell,
            href: "/settings/notificacoes",
            cta: "Configurar canais",
          },
          {
            title: "3. Tomar a primeira decisao",
            text: "Depois do sync, aprove ou ignore a primeira recomendacao e transforme onboarding em valor real.",
            icon: Smartphone,
            href: "/decision-feed",
            cta: "Abrir fila",
          },
        ].map(({ title, text, icon: Icon, href, cta }) => (
          <a
            key={title}
            href={href}
            className="rounded-[18px] border border-white/[0.08] bg-black/20 p-4 transition-all hover:border-white/15 hover:bg-white/[0.03]"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
              <Icon size={15} className="text-fuchsia-300" />
            </div>
            <p className="text-[13px] font-bold text-white">{title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/40">{text}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-fuchsia-300">
              {cta}
              <ChevronRight size={12} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Campaign Row ─────────────────────────────────────────────────────────────
function CampaignRow({ c }: { c: CampanhaProcessada }) {
  const isAtivo = ["ATIVO","ACTIVE","ATIVA"].includes((c.status ?? "").toUpperCase());
  const score = c.scoreCampanha ?? 0;
  const scoreColor = score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400";
  const scoreBg   = score >= 70 ? "bg-emerald-500/10 border-emerald-500/20" : score >= 40 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";
  const budgetPct = c.orcamentoBase > 0 ? Math.min(100, (c.gastoBase / (c.orcamentoBase * 30)) * 100) : 0;
  const cpl = c.leadsBase > 0 ? c.gastoBase / c.leadsBase : null;

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-[16px] border transition-all ${
      isAtivo ? "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]" : "border-white/[0.04] bg-white/[0.01] opacity-60"
    }`}>
      {/* Score */}
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${scoreBg}`}>
        <span className={`text-[11px] font-black ${scoreColor}`}>{score}</span>
      </div>

      {/* Nome + status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[12px] font-semibold text-white/80 truncate">{c.nome_campanha}</p>
          {!isAtivo && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/30 shrink-0">Pausada</span>
          )}
        </div>
        {/* Budget bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/[0.05] overflow-hidden max-w-[80px]">
            <div className={`h-full rounded-full transition-all ${budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${budgetPct}%` }} />
          </div>
          <span className="text-[9px] text-white/20">{budgetPct.toFixed(0)}% budget</span>
        </div>
      </div>

      {/* Métricas */}
      <div className="flex items-center gap-5 shrink-0">
        <div className="text-right">
          <p className="text-[10px] text-white/20">Gasto</p>
          <p className="text-[12px] font-bold text-white/60">R${fmtBRL(c.gastoBase)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/20">ROAS</p>
          <p className={`text-[12px] font-bold ${c.roas >= 2 ? "text-emerald-400" : c.roas >= 1 ? "text-amber-400" : "text-red-400"}`}>
            {c.roas.toFixed(2)}×
          </p>
        </div>
        {cpl !== null && (
          <div className="text-right">
            <p className="text-[10px] text-white/20">CPL</p>
            <p className="text-[12px] font-bold text-white/60">R${fmtBRL(cpl)}</p>
          </div>
        )}
        <div className="text-right hidden md:block">
          <p className="text-[10px] text-white/20">Leads</p>
          <p className="text-[12px] font-bold text-white/60">{c.leadsBase}</p>
        </div>
      </div>

      {/* Recomendação */}
      {c.recomendacao && (
        <div className={`text-[9px] px-2 py-1 rounded-lg border max-w-[90px] text-center hidden lg:block ${
          c.recomendacao.toLowerCase().includes("pausar") ? "bg-red-500/10 border-red-500/20 text-red-400" :
          c.recomendacao.toLowerCase().includes("escalar") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
          "bg-white/[0.04] border-white/[0.08] text-white/30"
        }`}>
          {c.recomendacao.slice(0, 30)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function PulseCockpit() {
  useSessionGuard();
  const searchParams = useSearchParams();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading,       setLoading]       = useState(true);
  const [syncing,       setSyncing]       = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [hasData,       setHasData]       = useState<boolean | null>(null);

  const [engine,      setEngine]      = useState<EngineResult | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [decisions,   setDecisions]   = useState<PendingDecision[]>([]);
  const [history,     setHistory]     = useState<PendingDecision[]>([]);
  const [config,      setConfig]      = useState<AutopilotConfig | null>(null);
  const [mode,        setMode]        = useState<CockpitMode>("PAZ");
  const [showBudget,  setShowBudget]  = useState(false);
  const [predAlerts,  setPredAlerts]  = useState<{alert_type:string;campaign_name:string;confidence:number;preventive_action:string}[]>([]);
  const [showAllCamp, setShowAllCamp] = useState(false);
  const [showTour,    setShowTour]    = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldOpenTour = searchParams.get("tour") === "1";
    const dismissed = window.localStorage.getItem("erizon_first_wow_tour") === "done";
    setShowTour(shouldOpenTour && !dismissed);
  }, [searchParams]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function dismissTour() {
    setShowTour(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("erizon_first_wow_tour", "done");
    }
  }

  // ── Load engine + decisions ────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Workspace — fallback para user.id se não tiver workspace_members
      const { data: wm } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const wsId = wm?.workspace_id ?? user.id;
      setWorkspaceId(wsId);

      // Engine data — sem filtro de data_inicio (inclui campanhas com null)
      const [metricasRes, settingsRaw] = await Promise.all([
        supabase.from("metricas_ads").select("*").eq("user_id", user.id).limit(200),
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (metricasRes.error) console.error("[pulse] metricas_ads error:", metricasRes.error);

      const rawCampanhas = metricasRes.data;
      const userSettings = settingsRaw.data;
      const campanhasAtivas = filtrarAtivas((rawCampanhas ?? []) as CampanhaRaw[]);

      if (campanhasAtivas.length) {
        const cfg = resolverConfig(userSettings as UserEngineConfig | null);
        const eng = processarCampanhas(campanhasAtivas, cfg);
        setEngine(eng);
      } else {
        setEngine(null);
      }
      setHasData(campanhasAtivas.length > 0);

      // Cockpit decisions + alertas preditivos
      const [cockpitRes, settingsRes, alertsRes] = await Promise.all([
        fetch(`/api/cockpit/decisions?workspaceId=${wsId}`),
        fetch(`/api/cockpit/settings?workspaceId=${wsId}`),
        fetch(`/api/intelligence/predict-anomalies`),
      ]);

      if (cockpitRes.ok) {
        const data = await cockpitRes.json();
        setDecisions(data.pending ?? []);
        setHistory(data.history ?? []);
        setMode(data.mode ?? "PAZ");
      }
      if (settingsRes.ok) {
        const cfg = await settingsRes.json();
        setConfig(cfg);
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setPredAlerts(data.alerts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Sync Meta Ads data ────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/ads-sync");
      if (!res.ok) throw new Error("Falha no sync");
      showToast("Campanhas sincronizadas com sucesso");
      await loadData();
    } catch {
      showToast("Erro ao sincronizar campanhas", false);
    } finally {
      setSyncing(false);
    }
  };

  // ── Refresh decisions ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (!workspaceId) return;
    setRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await fetch("/api/cockpit/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, userId: user?.id }),
      });
      await loadData();
      showToast("Fila atualizada com análise mais recente");
    } catch {
      showToast("Erro ao atualizar fila", false);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/cockpit/decisions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDecisions(prev => prev.filter(d => d.id !== id));
      setHistory(prev => [data.decision, ...prev].slice(0, 10));

      if (data.executed) {
        showToast("Ação executada no Meta Ads com sucesso ✓");
      } else if (data.error) {
        showToast(`Aprovada, mas falha na execução: ${data.error}`, false);
      } else {
        showToast("Decisão aprovada");
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao aprovar", false);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/cockpit/decisions/${id}/reject`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erro ao ignorar");
      setDecisions(prev => prev.filter(d => d.id !== id));
      showToast("Decisão ignorada");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro", false);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Config updates ─────────────────────────────────────────────────────────
  const handleToggleAutopilot = async (enabled: boolean) => {
    if (!workspaceId) return;
    const newConfig = { ...(config ?? {}), workspace_id: workspaceId, autopilot_enabled: enabled };
    setConfig(prev => ({ ...prev!, autopilot_enabled: enabled }));
    try {
      await fetch("/api/cockpit/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      showToast(enabled ? "Autopiloto ativado" : "Autopiloto desativado");
    } catch { showToast("Erro ao salvar configuração", false); }
  };

  const handleTypeToggle = async (key: keyof AutopilotConfig, val: boolean) => {
    if (!workspaceId || !config) return;
    const newConfig = { ...config, workspace_id: workspaceId, [key]: val };
    setConfig(newConfig);
    try {
      await fetch("/api/cockpit/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
    } catch { /* silently fail, UI already updated */ }
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex h-screen bg-[#040406]">
      <Sidebar />
      <main className="md:ml-[60px] pb-20 md:pb-0 flex-1 p-6">
        <SkeletonPage cols={3} />
      </main>
    </div>
  );

  // ── Empty state: sem dados de campanhas ──────────────────────────────────
  if (hasData === false) return (
    <div className="flex h-screen bg-[#040406]">
      <Sidebar />
      <main className="md:ml-[60px] pb-20 md:pb-0 flex-1 flex items-center justify-center p-6">
        <div className="max-w-[420px] w-full text-center space-y-6">
          {/* Ícone */}
          <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20
            flex items-center justify-center mx-auto">
            <Database size={28} className="text-fuchsia-400" />
          </div>

          <div>
            <h2 className="text-[20px] font-black text-white mb-2">
              Nenhuma campanha encontrada
            </h2>
            <p className="text-[13px] text-white/40 leading-relaxed">
              Para usar o Cockpit, conecte sua conta do Meta Ads e sincronize suas campanhas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a
              href="/settings/integracoes"
              className="flex flex-col items-center gap-2 p-4 rounded-[16px] border border-fuchsia-500/30
                bg-fuchsia-500/[0.06] hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10
                transition-all group"
            >
              <Link2 size={18} className="text-fuchsia-400" />
              <span className="text-[12px] font-semibold text-fuchsia-300">Conectar Meta Ads</span>
              <span className="text-[10px] text-white/30">Configurar integração</span>
            </a>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex flex-col items-center gap-2 p-4 rounded-[16px] border border-white/[0.08]
                bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]
                transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={`text-white/40 ${syncing ? "animate-spin" : ""}`} />
              <span className="text-[12px] font-semibold text-white/50">
                {syncing ? "Sincronizando..." : "Sincronizar Agora"}
              </span>
              <span className="text-[10px] text-white/25">Buscar campanhas do Meta</span>
            </button>
          </div>

          <p className="text-[11px] text-white/20">
            Depois de conectar, clique em <span className="text-white/40">Sincronizar Agora</span> para importar suas campanhas.
          </p>
        </div>
      </main>
    </div>
  );

  const m = MODOS[mode];
  const totalImpact = decisions.reduce((s, d) => s + (d.estimated_impact_brl ?? 0), 0);

  return (
    <div className="flex h-screen bg-[#040406] overflow-hidden">
      <Sidebar />

      <main className="md:ml-[60px] pb-20 md:pb-0 flex-1 overflow-y-auto">
        <div className="max-w-[960px] mx-auto px-4 py-6 md:px-6 space-y-5">

          {/* ─── ZONA 1: Status Bar ─────────────────────────────────────────── */}
          <div className={`rounded-[24px] border ${m.border} ${m.bg} ${m.glow} px-4 py-4 md:px-6`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {/* Saudação */}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[18px]">{m.icon}</span>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.25em] ${m.cor}`}>
                      Modo {m.label}
                    </p>
                    {decisions.length > 0 && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${m.bg} ${m.cor} border ${m.border}`}>
                        {decisions.length} pendente{decisions.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-[16px] font-black text-white">
                    {getSaudacao()}
                    {engine ? ` · ROAS derivado ${engine.roasGlobal.toFixed(2)}×` : ""}
                  </p>
                  <p className="text-[11px] text-white/30 capitalize">{getDataFormatada()}</p>
                  <p className="text-[10px] text-white/22">
                    Dados sincronizados abaixo combinam leitura real de campanha com projeções da engine.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowBudget(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-fuchsia-400/70
                    border border-fuchsia-500/20 bg-fuchsia-500/[0.05] hover:border-fuchsia-500/40 hover:text-fuchsia-300
                    transition-all"
                >
                  <PieChart size={11} />
                  Otimizar Budget
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  title="Sincronizar campanhas do Meta"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-white/40
                    border border-white/[0.06] hover:border-white/15 hover:text-white/70
                    transition-all disabled:opacity-50"
                >
                  <Database size={11} className={syncing ? "animate-pulse" : ""} />
                  <span className="hidden md:inline">{syncing ? "Sincronizando..." : "Sync"}</span>
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-white/40
                    border border-white/[0.06] hover:border-white/15 hover:text-white/70
                    transition-all disabled:opacity-50"
                >
                  <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
                  Analisar
                </button>
                <a
                  href="/settings"
                  className="p-2 rounded-xl text-white/25 hover:text-white/50 hover:bg-white/[0.04]
                    border border-white/[0.06] transition-all"
                >
                  <Settings size={14} />
                </a>
              </div>
            </div>

            {/* Impact banner */}
            {totalImpact > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-2">
                <Sparkles size={11} className="text-fuchsia-400/60" />
                <p className="text-[11px] text-white/40">
                  Impacto potencial estimado das decisões pendentes:
                  <span className="text-fuchsia-400 font-bold ml-1">R${fmtBRL(totalImpact)}</span>
                </p>
              </div>
            )}
          </div>

          <FirstWowTour visible={showTour} onDismiss={dismissTour} />

          <div id="daily-digest">
            <DailyDigest />
          </div>

          {/* ─── ZONA 2: Command Center ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Fila de decisões */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-white/30" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
                    Fila de Decisões
                  </p>
                </div>
                {decisions.length > 0 && (
                  <span className="text-[10px] text-white/25">{decisions.length} aguardando</span>
                )}
              </div>

              {decisions.length === 0 ? (
                <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20
                    flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  </div>
                  <p className="text-[14px] font-bold text-white/60 mb-1">Fila limpa</p>
                  <p className="text-[12px] text-white/25">
                    Nenhuma decisão pendente. O engine está monitorando sua janela sincronizada de campanhas.
                  </p>
                  {engine && engine.totalGasto > 0 && (
                    <p className="text-[11px] text-white/20 mt-2">
                      {engine.saudaveisCount} campanha{engine.saudaveisCount !== 1 ? "s" : ""} saudável{engine.saudaveisCount !== 1 ? "is" : ""} · ROAS derivado {engine.roasGlobal.toFixed(2)}×
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {decisions.map(d => (
                    <DecisionCard
                      key={d.id}
                      decision={d}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      loading={actionLoading === d.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Coluna direita: autopiloto + financeiros */}
            <div className="space-y-4">
              <AutopilotToggle
                config={config}
                onToggle={handleToggleAutopilot}
                onTypeToggle={handleTypeToggle}
              />

              {/* Financeiros compactos */}
              {engine && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25 px-1">
                    Situação Atual Derivada
                  </p>
                  <FinCard
                    label="Investido na janela"
                    value={`R$${fmtBRL(engine.totalGasto)}`}
                    sub="janela sincronizada atual"
                  />
                  <FinCard
                    label="ROAS Global derivado"
                    value={`${engine.roasGlobal.toFixed(2)}×`}
                    sub={`Margem derivada ${(engine.margemGlobal * 100).toFixed(0)}%`}
                    up={engine.roasGlobal >= 2.0 ? true : engine.roasGlobal < 1.0 ? false : null}
                  />
                  <FinCard
                    label="Resultados"
                    value={`${engine.totalLeads}`}
                    sub={engine.totalLeads > 0 ? `CPL derivado R$${fmtBRL(engine.totalGasto / engine.totalLeads)}` : "Nenhum resultado"}
                    up={engine.totalLeads > 0 ? true : false}
                  />
                  {engine.capitalEmRisco > 0 && (
                    <FinCard
                      label="Capital em risco derivado"
                      value={`R$${fmtBRL(engine.capitalEmRisco)}`}
                      sub={`${Math.round((engine.capitalEmRisco / engine.totalGasto) * 100)}% do budget da janela`}
                      up={false}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── ZONA 3: Portfolio de Campanhas ──────────────────────────────── */}
          {engine && engine.campanhas.length > 0 && (
            <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Target size={13} className="text-white/30" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
                    Portfolio de Campanhas
                  </p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/30">
                    {engine.campanhas.length} campanhas
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {engine.melhorAtivo && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70">
                      <Star size={10} className="text-amber-400" />
                      <span className="hidden md:inline">Melhor: </span>
                      <span className="font-semibold truncate max-w-[120px]">{engine.melhorAtivo.nome_campanha}</span>
                    </div>
                  )}
                  {engine.campanhas.length > 5 && (
                    <button onClick={() => setShowAllCamp(v => !v)}
                      className="text-[10px] text-white/30 hover:text-white/60 transition-colors">
                      {showAllCamp ? "Ver menos" : `+${engine.campanhas.length - 5} mais`}
                    </button>
                  )}
                </div>
              </div>

              {/* KPI bar */}
              <div className="grid grid-cols-4 gap-px bg-white/[0.04] border-b border-white/[0.05]">
                {[
                  { label: "Investido na janela", value: `R$${fmtBRL(engine.totalGasto)}`, color: "text-white/70" },
                  { label: "ROAS derivado", value: `${engine.roasGlobal.toFixed(2)}×`, color: engine.roasGlobal >= 2 ? "text-emerald-400" : engine.roasGlobal >= 1 ? "text-amber-400" : "text-red-400" },
                  { label: "Resultados", value: String(engine.totalLeads), color: "text-white/70" },
                  { label: "CPL derivado", value: engine.totalLeads > 0 ? `R$${fmtBRL(engine.totalGasto / engine.totalLeads)}` : "—", color: "text-white/70" },
                ].map(k => (
                  <div key={k.label} className="bg-white/[0.02] px-4 py-3 text-center">
                    <p className="text-[9px] text-white/20 uppercase tracking-wider mb-0.5">{k.label}</p>
                    <p className={`text-[15px] font-black ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Lista */}
              <div className="divide-y divide-white/[0.04]">
                {(showAllCamp ? engine.campanhas : engine.campanhas.slice(0, 5)).map(c => (
                  <div key={c.id} className="px-3 py-1">
                    <CampaignRow c={c} />
                  </div>
                ))}
              </div>

              {/* Capital em risco */}
              {engine.capitalEmRisco > 0 && (
                <div className="px-5 py-3 border-t border-white/[0.05] flex items-center gap-2 bg-red-500/[0.03]">
                  <TriangleAlert size={11} className="text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400/70">
                    <span className="font-bold">R${fmtBRL(engine.capitalEmRisco)}</span> em capital de risco derivado —
                    {engine.gastoCritico > 0 && ` R$${fmtBRL(engine.gastoCritico)} em campanhas críticas da janela`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── ZONA 3b: Alertas Preditivos ──────────────────────────────────── */}
          {predAlerts.length > 0 && (
            <div className="rounded-[20px] border border-amber-500/20 bg-amber-500/[0.03] overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-500/10">
                <Eye size={13} className="text-amber-400" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">
                  Alertas Preditivos da Engine
                </p>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-400 font-bold">
                  {predAlerts.length}
                </span>
              </div>
              <div className="divide-y divide-amber-500/[0.08]">
                {predAlerts.map((a, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[12px] font-semibold text-white/70 truncate">{a.campaign_name}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                          {a.alert_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[9px] text-white/25 shrink-0">
                          {Math.round(a.confidence * 100)}% conf.
                        </span>
                      </div>
                      {a.preventive_action && (
                        <p className="text-[11px] text-white/40 leading-relaxed">{a.preventive_action}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── ZONA 4: Histórico de ações ──────────────────────────────────── */}
          {history.length > 0 && (
            <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={11} className="text-white/25" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">
                  Últimas Decisões
                </p>
              </div>
              {history.slice(0, 8).map(d => (
                <HistoryRow key={d.id} d={d} />
              ))}
            </div>
          )}

          {/* ─── Links para outros módulos ───────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-3 pb-6 md:grid-cols-3">
            {[
              { href: "/analytics",      icon: BarChart2,   label: "Analytics",    sub: "Métricas detalhadas" },
              { href: "/decision-feed",  icon: Zap,         label: "Decision Feed", sub: "Feed de sinais"      },
              { href: "/inteligencia/ena", icon: Activity,  label: "ENA",           sub: "Atribuição"          },
            ].map(({ href, icon: Icon, label, sub }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-[16px] border border-white/[0.06]
                  bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03] transition-all group"
              >
                <Icon size={14} className="text-white/25 group-hover:text-white/50 transition-colors shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-white/50 group-hover:text-white/80">{label}</p>
                  <p className="text-[10px] text-white/20">{sub}</p>
                </div>
                <ChevronRight size={11} className="text-white/15 group-hover:text-white/30 ml-auto" />
              </a>
            ))}
          </div>
        </div>
      </main>

      {/* Budget Optimizer Modal */}
      {showBudget && (
        <BudgetOptimizer onClose={() => setShowBudget(false)} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3 rounded-[16px]
          border shadow-2xl transition-all duration-300
          ${toast.ok
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}>
          {toast.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          <p className="text-[12px] font-semibold">{toast.msg}</p>
        </div>
      )}
    </div>
  );
}
